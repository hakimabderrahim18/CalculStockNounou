const ExcelJS = require('exceljs');
const XLSX = require('xlsx');
const Product = require('../models/Product');
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const HistoryLog = require('../models/HistoryLog');
const StockAudit = require('../models/StockAudit');

// Configuration du style des en-têtes ExcelJS
const applyHeaderStyle = (worksheet, headers, bgColor = 'FF1E3A8A') => {
  const headerRow = worksheet.addRow(headers);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: bgColor }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 28;

  worksheet.columns.forEach((col) => {
    let maxLen = 12;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const len = cell.value ? cell.value.toString().length : 0;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen + 4, 35);
  });
};

/**
 * Normalise une chaîne d'en-tête (minuscules, sans accents, sans espaces superflus)
 */
const normalizeHeader = (val) => {
  if (!val) return '';
  return val
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

/**
 * Lit n'importe quel fichier de tableur (xlsx, xls binaire, csv, html-table exportée)
 * en utilisant SheetJS, évitant ainsi l'erreur "Can't find end of central directory".
 * Renvoie un tableau de lignes [ [cell0, cell1, ...], ... ]
 */
const readAnySpreadsheetRows = (fileBuffer) => {
  const workbook = XLSX.read(fileBuffer, {
    type: 'buffer',
    cellDates: true,
    raw: false
  });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Le fichier ne contient aucune feuille de calcul.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
};

/**
 * Détecte dynamiquement l'index de chaque colonne à partir de la première ligne
 */
const detectColumnsFromHeaders = (headerRow) => {
  const colMap = {
    name: -1,
    sku: -1,
    category: -1,
    subCategory: -1,
    stockQuantity: -1,
    storeQuantity: -1,
    price: -1,
    brand: -1,
    image: -1
  };

  headerRow.forEach((cellVal, colIdx) => {
    const h = normalizeHeader(cellVal);
    if (!h) return;

    // 1. Désignation / Nom du produit
    if (/designation|nom|libelle|produit|article/.test(h) && colMap.name === -1) {
      colMap.name = colIdx;
    }
    // 2. Sous-catégorie / Sous-famille
    else if (/sous\s*famille|sous\s*cat/.test(h) && colMap.subCategory === -1) {
      colMap.subCategory = colIdx;
    }
    // 3. Catégorie / Famille / Rayon (en évitant sous-famille)
    else if (/(famille|cat|rayon)/.test(h) && !/sous/.test(h) && colMap.category === -1) {
      colMap.category = colIdx;
    }
    // 4. Réf / SKU produit explicite
    // ATTENTION : On exclut formellement TVA, taxe, taux, famille, rayon, depot, client, fourn pour ne pas capturer les codes TVA (1, 2, 3, 4)
    else if (
      /(ref.*produit|reference\s*produit|ref\b|reference|sku|code.*barre|code.*art|code.*produit|ean|cb|gencod)/.test(h) &&
      !/(tva|taxe|taux|famille|rayon|depot|dépôt|client|fourn|postal)/.test(h) &&
      colMap.sku === -1
    ) {
      colMap.sku = colIdx;
    }
    // 5. Stock Magasin
    else if (/stock.*magasin|magasin|qte.*magasin/.test(h) && colMap.storeQuantity === -1) {
      colMap.storeQuantity = colIdx;
    }
    // 6. Stock Entrepôt / Unité
    else if (/stock.*unite|stock.*entrepot|stock|qte|quantite/.test(h) && colMap.stockQuantity === -1) {
      colMap.stockQuantity = colIdx;
    }
    // 7. Prix
    else if (/prix.*1.*ttc|prix.*ttc|prix|tarif/.test(h) && colMap.price === -1) {
      colMap.price = colIdx;
    }
    // 8. Marque
    else if (/marque|brand/.test(h) && colMap.brand === -1) {
      colMap.brand = colIdx;
    }
    // 9. Image
    else if (/image|photo|visuel/.test(h) && colMap.image === -1) {
      colMap.image = colIdx;
    }
  });

  // Fallbacks de position si en-têtes non standards
  const totalCols = headerRow.length;
  if (colMap.name === -1) colMap.name = 0;
  if (colMap.category === -1) colMap.category = totalCols >= 9 ? 8 : (totalCols >= 3 ? 2 : -1);
  if (colMap.subCategory === -1) colMap.subCategory = totalCols >= 10 ? 9 : (totalCols >= 4 ? 3 : -1);
  if (colMap.stockQuantity === -1) colMap.stockQuantity = 1;

  return colMap;
};

const parseCleanNumber = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const cleanStr = val.toString().replace(/\s/g, '').replace(',', '.');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
};

/**
 * Traite et valide le fichier Excel d'import des produits avec compatibilité universelle
 */
const importProductsFromExcel = async (
  fileBuffer,
  { autoCreateCategories = true, setStockToZero = false } = {}
) => {
  const rows = readAnySpreadsheetRows(fileBuffer);
  if (!rows || rows.length < 2) {
    throw new Error('Le fichier est vide ou ne contient aucune ligne de données.');
  }

  const headerRow = rows[0];
  const colMap = detectColumnsFromHeaders(headerRow);

  const errors = [];
  const validProducts = [];
  const seenSKUsInFile = new Set();

  const existingCategories = await Category.find({});
  const categoryMap = new Map();
  existingCategories.forEach((c) => categoryMap.set(c.name.trim().toLowerCase(), c));

  const existingSubCategories = await SubCategory.find({});
  const subCategoryMap = new Map();
  existingSubCategories.forEach((s) => {
    subCategoryMap.set(`${s.categoryId.toString()}_${s.name.trim().toLowerCase()}`, s);
  });

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;

    const nameRaw = colMap.name !== -1 ? row[colMap.name] : '';
    const skuRaw = colMap.sku !== -1 ? row[colMap.sku] : '';
    const catRaw = colMap.category !== -1 ? row[colMap.category] : '';
    const subCatRaw = colMap.subCategory !== -1 ? row[colMap.subCategory] : '';
    const stockVal = colMap.stockQuantity !== -1 ? row[colMap.stockQuantity] : 0;
    const storeVal = colMap.storeQuantity !== -1 ? row[colMap.storeQuantity] : 0;
    const priceVal = colMap.price !== -1 ? row[colMap.price] : 0;
    const brandRaw = colMap.brand !== -1 ? row[colMap.brand] : '';
    const imageRaw = colMap.image !== -1 ? row[colMap.image] : '';

    const name = nameRaw ? nameRaw.toString().trim() : '';
    let sku = skuRaw ? skuRaw.toString().trim().toUpperCase() : '';
    const categoryName = catRaw ? catRaw.toString().trim() : 'Général';
    const subCategoryName = subCatRaw ? subCatRaw.toString().trim() : 'Général';
    const brand = brandRaw ? brandRaw.toString().trim() : '';
    const image = imageRaw ? imageRaw.toString().trim() : '';

    if (!name && !sku && !catRaw && stockVal === '') {
      continue;
    }

    const rowErrors = [];
    if (!name) {
      rowErrors.push('La désignation / nom du produit est obligatoire');
    }

    // Si la référence / SKU est vide ou absente, génération automatique d'une référence propre
    if (!sku && name) {
      sku = `REF-${rowNumber}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    }

    // Si le SKU apparaît plusieurs fois dans le fichier ou est un simple chiffre (ex: code taxe),
    // on ne bloque PAS la ligne : on rend la référence unique automatiquement avec le numéro de ligne !
    if (sku) {
      if (seenSKUsInFile.has(sku)) {
        sku = `${sku}-${rowNumber}`;
      }
      seenSKUsInFile.add(sku);
    }

    const stockQuantity = setStockToZero ? 0 : Math.max(0, Math.floor(parseCleanNumber(stockVal)));
    const storeQuantity = setStockToZero ? 0 : Math.max(0, Math.floor(parseCleanNumber(storeVal)));
    const price = Math.max(0, parseCleanNumber(priceVal));

    if (rowErrors.length > 0) {
      errors.push({
        row: rowNumber,
        sku: sku || 'INCONNU',
        name: name || 'INCONNU',
        messages: rowErrors
      });
    } else {
      validProducts.push({
        rowNumber,
        name,
        sku,
        categoryName,
        subCategoryName,
        stockQuantity,
        storeQuantity,
        price,
        brand,
        image
      });
    }
  }

  let successCount = 0;

  for (const item of validProducts) {
    try {
      const catKey = item.categoryName.toLowerCase();
      let category = categoryMap.get(catKey);

      if (!category) {
        if (autoCreateCategories) {
          category = await Category.create({ name: item.categoryName });
          categoryMap.set(catKey, category);
        } else {
          errors.push({
            row: item.rowNumber,
            sku: item.sku,
            name: item.name,
            messages: [`La catégorie '${item.categoryName}' n'existe pas`]
          });
          continue;
        }
      }

      const subKey = `${category._id.toString()}_${item.subCategoryName.toLowerCase()}`;
      let subCategory = subCategoryMap.get(subKey);

      if (!subCategory) {
        if (autoCreateCategories) {
          subCategory = await SubCategory.create({
            name: item.subCategoryName,
            categoryId: category._id
          });
          subCategoryMap.set(subKey, subCategory);
        } else {
          errors.push({
            row: item.rowNumber,
            sku: item.sku,
            name: item.name,
            messages: [`La sous-catégorie '${item.subCategoryName}' n'existe pas pour '${category.name}'`]
          });
          continue;
        }
      }

      let product = await Product.findOne({ sku: item.sku });

      if (product) {
        const oldStock = product.stockQuantity;
        product.name = item.name;
        product.categoryId = category._id;
        product.subCategoryId = subCategory._id;
        product.stockQuantity = item.stockQuantity;
        if (item.storeQuantity > 0) product.storeQuantity = item.storeQuantity;
        if (item.brand) product.brand = item.brand;
        if (item.price > 0) product.price = item.price;
        if (item.image) product.image = item.image;
        product.totalQuantity = product.stockQuantity + product.storeQuantity;

        await product.save();

        if (item.stockQuantity !== oldStock) {
          await HistoryLog.create({
            productId: product._id,
            productName: product.name,
            productSku: product.sku,
            quantityType: 'STOCK',
            oldValue: oldStock,
            newValue: item.stockQuantity,
            difference: item.stockQuantity - oldStock,
            reason: 'Mise à jour via Import Excel',
            changedBy: 'Import Excel'
          });
        }
      } else {
        let createdProduct;
        try {
          const total = item.stockQuantity + item.storeQuantity;
          createdProduct = await Product.create({
            name: item.name,
            sku: item.sku,
            categoryId: category._id,
            subCategoryId: subCategory._id,
            stockQuantity: item.stockQuantity,
            storeQuantity: item.storeQuantity,
            totalQuantity: total,
            brand: item.brand || '',
            price: item.price || 0,
            image: item.image || ''
          });
        } catch (createErr) {
          if (createErr.code === 11000) {
            item.sku = `${item.sku}-${item.rowNumber}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
            const total = item.stockQuantity + item.storeQuantity;
            createdProduct = await Product.create({
              name: item.name,
              sku: item.sku,
              categoryId: category._id,
              subCategoryId: subCategory._id,
              stockQuantity: item.stockQuantity,
              storeQuantity: item.storeQuantity,
              totalQuantity: total,
              brand: item.brand || '',
              price: item.price || 0,
              image: item.image || ''
            });
          } else {
            throw createErr;
          }
        }

        if (item.stockQuantity > 0) {
          await HistoryLog.create({
            productId: createdProduct._id,
            productName: createdProduct.name,
            productSku: createdProduct.sku,
            quantityType: 'STOCK',
            oldValue: 0,
            newValue: item.stockQuantity,
            difference: item.stockQuantity,
            reason: 'Import Excel',
            changedBy: 'Import Excel'
          });
        }
        if (item.storeQuantity > 0) {
          await HistoryLog.create({
            productId: createdProduct._id,
            productName: createdProduct.name,
            productSku: createdProduct.sku,
            quantityType: 'STORE',
            oldValue: 0,
            newValue: item.storeQuantity,
            difference: item.storeQuantity,
            reason: 'Import Excel',
            changedBy: 'Import Excel'
          });
        }
      }

      successCount++;
    } catch (err) {
      errors.push({
        row: item.rowNumber,
        sku: item.sku,
        name: item.name,
        messages: [err.message]
      });
    }
  }

  return {
    totalRows: rows.length - 1,
    successCount,
    errorCount: errors.length,
    errors
  };
};

/**
 * Analyse des pertes et écarts : compare le fichier Excel avec le stock total (Entrepôt + Magasin)
 */
const compareStockWithSpreadsheet = async (fileBuffer, { performedBy = 'Admin', title = '', fileName = '' } = {}) => {
  const rows = readAnySpreadsheetRows(fileBuffer);
  if (!rows || rows.length < 2) {
    throw new Error('Le fichier est vide ou ne contient aucune ligne de données.');
  }

  const headerRow = rows[0];
  const colMap = detectColumnsFromHeaders(headerRow);

  // Charger tous les produits actuellement en base avec catégories
  const dbProducts = await Product.find({})
    .populate('categoryId', 'name')
    .populate('subCategoryId', 'name');

  const productBySku = new Map();
  const productByName = new Map();

  dbProducts.forEach((p) => {
    productBySku.set(p.sku.toUpperCase(), p);
    productByName.set(normalizeHeader(p.name), p);
  });

  const matchedProductIds = new Set();
  const items = [];

  let lossCount = 0;
  let surplusCount = 0;
  let exactCount = 0;
  let notFoundInAppCount = 0;
  let totalLossUnits = 0;
  let totalSurplusUnits = 0;
  let totalLossValue = 0;
  let totalSurplusValue = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const nameRaw = colMap.name !== -1 ? row[colMap.name] : '';
    const skuRaw = colMap.sku !== -1 ? row[colMap.sku] : '';
    const stockVal = colMap.stockQuantity !== -1 ? row[colMap.stockQuantity] : 0;
    const priceVal = colMap.price !== -1 ? row[colMap.price] : 0;
    const brandRaw = colMap.brand !== -1 ? row[colMap.brand] : '';
    const catRaw = colMap.category !== -1 ? row[colMap.category] : '';
    const subCatRaw = colMap.subCategory !== -1 ? row[colMap.subCategory] : '';

    const name = nameRaw ? nameRaw.toString().trim() : '';
    const sku = skuRaw ? skuRaw.toString().trim().toUpperCase() : '';
    const physicalStock = Math.max(0, Math.floor(parseCleanNumber(stockVal)));
    const filePrice = Math.max(0, parseCleanNumber(priceVal));
    const brand = brandRaw ? brandRaw.toString().trim() : '';
    const categoryName = catRaw ? catRaw.toString().trim() : '';
    const subCategoryName = subCatRaw ? subCatRaw.toString().trim() : '';

    if (!name && !sku && stockVal === '') continue;

    // Rechercher la correspondance dans la base
    let product = null;
    if (sku && productBySku.has(sku)) {
      product = productBySku.get(sku);
    } else if (name && productByName.has(normalizeHeader(name))) {
      product = productByName.get(normalizeHeader(name));
    }

    if (product) {
      matchedProductIds.add(product._id.toString());
      const appWarehouse = product.stockQuantity || 0;
      const appStore = product.storeQuantity || 0;
      const appTotal = (product.totalQuantity !== undefined) ? product.totalQuantity : (appWarehouse + appStore);
      const diff = physicalStock - appTotal;
      const unitPrice = product.price || filePrice || 0;
      const diffVal = diff * unitPrice;

      let status = 'EXACT';
      if (diff < 0) {
        status = 'LOSS';
        lossCount++;
        totalLossUnits += diff; // négatif
        totalLossValue += diffVal; // négatif
      } else if (diff > 0) {
        status = 'SURPLUS';
        surplusCount++;
        totalSurplusUnits += diff; // positif
        totalSurplusValue += diffVal; // positif
      } else {
        exactCount++;
      }

      items.push({
        productId: product._id,
        name: product.name,
        sku: product.sku,
        brand: product.brand || brand,
        categoryName: product.categoryId?.name || categoryName || 'Général',
        subCategoryName: product.subCategoryId?.name || subCategoryName || '',
        price: unitPrice,
        appWarehouseStock: appWarehouse,
        appStoreStock: appStore,
        appTotalStock: appTotal,
        physicalStock,
        difference: diff,
        differenceValue: diffVal,
        status
      });
    } else {
      // Produit dans le fichier mais absent du logiciel
      notFoundInAppCount++;
      const unitPrice = filePrice || 0;
      const diffVal = physicalStock * unitPrice;
      totalSurplusUnits += physicalStock;
      totalSurplusValue += diffVal;

      items.push({
        productId: null,
        name: name || 'Produit Inconnu',
        sku: sku || 'SANS-SKU',
        brand,
        categoryName: categoryName || 'Non référencé',
        subCategoryName: subCategoryName || '',
        price: unitPrice,
        appWarehouseStock: 0,
        appStoreStock: 0,
        appTotalStock: 0,
        physicalStock,
        difference: physicalStock,
        differenceValue: diffVal,
        status: 'NOT_FOUND_IN_APP'
      });
    }
  }

  // Vérifier les produits du logiciel absents du fichier Excel
  dbProducts.forEach((p) => {
    if (!matchedProductIds.has(p._id.toString())) {
      const appWarehouse = p.stockQuantity || 0;
      const appStore = p.storeQuantity || 0;
      const appTotal = p.totalQuantity || (appWarehouse + appStore);

      if (appTotal > 0) {
        const diff = -appTotal;
        const diffVal = diff * (p.price || 0);
        lossCount++;
        totalLossUnits += diff;
        totalLossValue += diffVal;

        items.push({
          productId: p._id,
          name: p.name,
          sku: p.sku,
          brand: p.brand || '',
          categoryName: p.categoryId?.name || 'Général',
          subCategoryName: p.subCategoryId?.name || '',
          price: p.price || 0,
          appWarehouseStock: appWarehouse,
          appStoreStock: appStore,
          appTotalStock: appTotal,
          physicalStock: 0,
          difference: diff,
          differenceValue: diffVal,
          status: 'LOSS'
        });
      }
    }
  });

  // Trier les articles : Pertes les plus sévères en premier, puis surplus, puis conformes
  items.sort((a, b) => a.difference - b.difference);

  const netDifferenceUnits = totalSurplusUnits + totalLossUnits;
  const netDifferenceValue = totalSurplusValue + totalLossValue;

  const auditDoc = await StockAudit.create({
    title: title || `Inventaire & Pertes du ${new Date().toLocaleDateString('fr-FR')}`,
    fileName: fileName || 'fichier_stock.xlsx',
    performedBy: performedBy || 'Admin',
    summary: {
      totalCompared: items.length,
      lossCount,
      surplusCount,
      exactCount,
      notFoundInAppCount,
      totalLossUnits,
      totalSurplusUnits,
      netDifferenceUnits,
      totalLossValue,
      totalSurplusValue,
      netDifferenceValue
    },
    items,
    status: 'ANALYZED'
  });

  return auditDoc;
};

/**
 * Exporte l'analyse d'écart / pertes au format Excel avec mise en forme conditionnelle
 */
const exportAuditToExcel = async (audit) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Rapprochement & Pertes', {
    views: [{ showGridLines: true }]
  });

  const headers = [
    'Réf / SKU',
    'Désignation',
    'Marque',
    'Famille (Catégorie)',
    'Sous-Famille',
    'Stock Entrepôt',
    'Stock Magasin',
    'Stock Total Logiciel',
    'Stock Fichier (Compté)',
    'Écart (Décalage)',
    'Statut'
  ];

  worksheet.columns = [
    { key: 'sku', width: 18 },
    { key: 'name', width: 28 },
    { key: 'brand', width: 16 },
    { key: 'category', width: 20 },
    { key: 'subCategory', width: 20 },
    { key: 'appWarehouse', width: 16 },
    { key: 'appStore', width: 16 },
    { key: 'appTotal', width: 18 },
    { key: 'physicalStock', width: 20 },
    { key: 'difference', width: 16 },
    { key: 'status', width: 18 }
  ];

  applyHeaderStyle(worksheet, headers, 'FF1E293B');

  audit.items.forEach((item) => {
    let statusLabel = 'Conforme';
    if (item.status === 'LOSS') statusLabel = 'Perte (Manquant)';
    if (item.status === 'SURPLUS') statusLabel = 'Surplus (Excédent)';
    if (item.status === 'NOT_FOUND_IN_APP') statusLabel = 'Non référencé';

    const row = worksheet.addRow({
      sku: item.sku,
      name: item.name,
      brand: item.brand || '-',
      category: item.categoryName || '-',
      subCategory: item.subCategoryName || '-',
      appWarehouse: item.appWarehouseStock,
      appStore: item.appStoreStock,
      appTotal: item.appTotalStock,
      physicalStock: item.physicalStock,
      difference: (item.difference > 0 ? '+' : '') + item.difference,
      status: statusLabel
    });

    row.alignment = { vertical: 'middle' };
    row.getCell('difference').alignment = { horizontal: 'right' };

    // Coloration conditionnelle des écarts
    const diffCell = row.getCell('difference');
    if (item.status === 'LOSS') {
      diffCell.font = { color: { argb: 'FFDC2626' }, bold: true }; // Rouge
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
    } else if (item.status === 'SURPLUS') {
      diffCell.font = { color: { argb: 'FF15803D' }, bold: true }; // Vert
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
    }
  });

  return await workbook.xlsx.writeBuffer();
};

/**
 * Exports standards
 */
const exportProductsToExcel = async (products) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Produits', { views: [{ showGridLines: true }] });

  const headers = [
    'Nom',
    'Référence/SKU',
    'Marque',
    'Catégorie',
    'Sous-catégorie',
    'Prix',
    'Stock (Entrepôt)',
    'Stock (Magasin)',
    'Quantité Totale',
    'Date de création'
  ];

  worksheet.columns = [
    { key: 'name', width: 25 },
    { key: 'sku', width: 18 },
    { key: 'brand', width: 16 },
    { key: 'category', width: 20 },
    { key: 'subCategory', width: 20 },
    { key: 'price', width: 14 },
    { key: 'stockQuantity', width: 18 },
    { key: 'storeQuantity', width: 18 },
    { key: 'totalQuantity', width: 18 },
    { key: 'createdAt', width: 20 }
  ];

  applyHeaderStyle(worksheet, headers);

  products.forEach((p) => {
    const row = worksheet.addRow({
      name: p.name,
      sku: p.sku,
      brand: p.brand || '-',
      category: p.categoryId?.name || 'N/A',
      subCategory: p.subCategoryId?.name || 'N/A',
      price: p.price ? `${p.price} €` : '-',
      stockQuantity: p.stockQuantity,
      storeQuantity: p.storeQuantity,
      totalQuantity: p.totalQuantity,
      createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : ''
    });

    row.alignment = { vertical: 'middle' };
    row.getCell('stockQuantity').alignment = { horizontal: 'right' };
    row.getCell('storeQuantity').alignment = { horizontal: 'right' };
    row.getCell('totalQuantity').alignment = { horizontal: 'right' };
  });

  return await workbook.xlsx.writeBuffer();
};

const exportHistoryToExcel = async (historyLogs) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Historique des Mouvements', { views: [{ showGridLines: true }] });

  const headers = [
    'Date & Heure',
    'Produit',
    'SKU',
    'Emplacement',
    'Ancienne Valeur',
    'Nouvelle Valeur',
    'Différence (+/-)',
    'Motif',
    'Modifié par'
  ];

  worksheet.columns = [
    { key: 'date', width: 20 },
    { key: 'productName', width: 25 },
    { key: 'productSku', width: 18 },
    { key: 'quantityType', width: 18 },
    { key: 'oldValue', width: 16 },
    { key: 'newValue', width: 16 },
    { key: 'difference', width: 16 },
    { key: 'reason', width: 25 },
    { key: 'changedBy', width: 16 }
  ];

  applyHeaderStyle(worksheet, headers);

  historyLogs.forEach((log) => {
    const dateFormatted = log.date ? new Date(log.date).toLocaleString('fr-FR') : '';
    const typeLabel = log.quantityType === 'STOCK' ? 'Stock Entrepôt' : 'Stock Magasin';

    const row = worksheet.addRow({
      date: dateFormatted,
      productName: log.productName || log.productId?.name || 'Produit archivé',
      productSku: log.productSku || log.productId?.sku || '',
      quantityType: typeLabel,
      oldValue: log.oldValue,
      newValue: log.newValue,
      difference: (log.difference > 0 ? '+' : '') + log.difference,
      reason: log.reason,
      changedBy: log.changedBy || 'Admin'
    });

    row.alignment = { vertical: 'middle' };
    const diffCell = row.getCell('difference');
    if (log.difference > 0) {
      diffCell.font = { color: { argb: 'FF15803D' }, bold: true };
    } else if (log.difference < 0) {
      diffCell.font = { color: { argb: 'FFB91C1C' }, bold: true };
    }
  });

  return await workbook.xlsx.writeBuffer();
};

const exportCategoriesToExcel = async (categories) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Catégories', { views: [{ showGridLines: true }] });

  const headers = ['Catégorie', 'Sous-catégorie', 'Description'];
  worksheet.columns = [
    { key: 'category', width: 25 },
    { key: 'subCategory', width: 25 },
    { key: 'description', width: 35 }
  ];

  applyHeaderStyle(worksheet, headers);

  for (const cat of categories) {
    const subCategories = await SubCategory.find({ categoryId: cat._id });
    if (subCategories.length === 0) {
      worksheet.addRow({
        category: cat.name,
        subCategory: '-',
        description: cat.description || ''
      });
    } else {
      subCategories.forEach((sub) => {
        worksheet.addRow({
          category: cat.name,
          subCategory: sub.name,
          description: sub.description || cat.description || ''
        });
      });
    }
  }

  return await workbook.xlsx.writeBuffer();
};

const generateProductTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Modèle Import Produits', { views: [{ showGridLines: true }] });

  const headers = [
    'Nom*',
    'SKU*',
    'Marque',
    'Prix',
    'Catégorie*',
    'Sous-catégorie*',
    'Quantité Stock',
    'Quantité Magasin',
    'Image (URL)'
  ];

  worksheet.columns = [
    { key: 'name', width: 25 },
    { key: 'sku', width: 18 },
    { key: 'brand', width: 16 },
    { key: 'price', width: 14 },
    { key: 'category', width: 20 },
    { key: 'subCategory', width: 20 },
    { key: 'stockQuantity', width: 18 },
    { key: 'storeQuantity', width: 18 },
    { key: 'image', width: 30 }
  ];

  applyHeaderStyle(worksheet, headers);

  const sample1 = worksheet.addRow({
    name: 'Baskets Runner X',
    sku: 'BSK-RUN-001',
    brand: 'Nike',
    price: 89.99,
    category: 'Chaussures',
    subCategory: 'Sport',
    stockQuantity: 40,
    storeQuantity: 15,
    image: ''
  });
  sample1.font = { italic: true, color: { argb: 'FF6B7280' } };

  return await workbook.xlsx.writeBuffer();
};

module.exports = {
  exportProductsToExcel,
  exportHistoryToExcel,
  exportCategoriesToExcel,
  generateProductTemplate,
  importProductsFromExcel,
  compareStockWithSpreadsheet,
  exportAuditToExcel
};

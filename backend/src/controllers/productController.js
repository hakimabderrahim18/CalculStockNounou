const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const HistoryLog = require('../models/HistoryLog');
const excelService = require('../services/excelService');

/**
 * Construit l'objet de filtre MongoDB à partir des query parameters
 */
const buildProductFilter = (query) => {
  const filter = {};

  // Recherche textuelle insensible à la casse sur nom ou SKU
  if (query.search && query.search.trim()) {
    const searchRegex = new RegExp(query.search.trim(), 'i');
    filter.$or = [{ name: searchRegex }, { sku: searchRegex }];
  }

  // Filtre par catégorie
  if (query.category) {
    filter.categoryId = query.category;
  }

  // Filtre par sous-catégorie
  if (query.subCategory) {
    filter.subCategoryId = query.subCategory;
  }

  // Filtre par date de création ou de modification
  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) {
      const start = new Date(query.startDate);
      start.setHours(0, 0, 0, 0);
      filter.createdAt.$gte = start;
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  return filter;
};

/**
 * Récupère la liste des produits avec filtres, recherche et pagination
 */
const getProducts = async (req, res, next) => {
  try {
    const filter = buildProductFilter(req.query);

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const total = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .populate('categoryId', 'name')
      .populate('subCategoryId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      data: products,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère un produit spécifique avec son historique récent
 */
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('categoryId', 'name')
      .populate('subCategoryId', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    const history = await HistoryLog.find({ productId: product._id })
      .sort({ date: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      data: {
        product,
        history
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Création d'un nouveau produit
 */
const createProduct = async (req, res, next) => {
  try {
    const { name, sku, image, brand = '', price = 0, categoryId, subCategoryId, stockQuantity = 0, storeQuantity = 0 } = req.body;

    // Vérifier l'existence et la cohérence de la catégorie et sous-catégorie
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(400).json({ success: false, message: 'Catégorie introuvable' });
    }

    const subCategory = await SubCategory.findOne({ _id: subCategoryId, categoryId });
    if (!subCategory) {
      return res.status(400).json({
        success: false,
        message: 'La sous-catégorie sélectionnée ne correspond pas à la catégorie'
      });
    }

    // Vérifier unicité du SKU
    const existingSku = await Product.findOne({ sku: sku.trim().toUpperCase() });
    if (existingSku) {
      return res.status(409).json({
        success: false,
        message: `La référence/SKU '${sku.trim().toUpperCase()}' est déjà utilisée.`
      });
    }

    const stock = Number(stockQuantity) || 0;
    const store = Number(storeQuantity) || 0;

    const product = new Product({
      name,
      sku: sku.trim().toUpperCase(),
      image: image || '',
      brand: brand ? brand.trim() : '',
      price: Number(price) || 0,
      categoryId,
      subCategoryId,
      stockQuantity: stock,
      storeQuantity: store,
      totalQuantity: stock + store
    });

    await product.save();

    // Enregistrement de l'historique initial si stock initial > 0
    if (stock > 0) {
      await HistoryLog.create({
        productId: product._id,
        productName: product.name,
        productSku: product.sku,
        quantityType: 'STOCK',
        oldValue: 0,
        newValue: stock,
        difference: stock,
        reason: 'Stock initial à la création',
        changedBy: req.body.changedBy || 'Admin'
      });
    }

    if (store > 0) {
      await HistoryLog.create({
        productId: product._id,
        productName: product.name,
        productSku: product.sku,
        quantityType: 'STORE',
        oldValue: 0,
        newValue: store,
        difference: store,
        reason: 'Stock initial à la création',
        changedBy: req.body.changedBy || 'Admin'
      });
    }

    const populatedProduct = await Product.findById(product._id)
      .populate('categoryId', 'name')
      .populate('subCategoryId', 'name');

    return res.status(201).json({
      success: true,
      message: 'Produit créé avec succès',
      data: populatedProduct
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mise à jour des informations générales du produit (nom, sku, image, catégories)
 */
const updateProduct = async (req, res, next) => {
  try {
    const { name, sku, image, brand, price, categoryId, subCategoryId } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Produit introuvable' });
    }

    if (sku && sku.trim().toUpperCase() !== product.sku) {
      const duplicate = await Product.findOne({ sku: sku.trim().toUpperCase() });
      if (duplicate) {
        return res.status(409).json({ success: false, message: `Le SKU '${sku}' est déjà utilisé` });
      }
      product.sku = sku.trim().toUpperCase();
    }

    if (categoryId && subCategoryId) {
      const validSub = await SubCategory.findOne({ _id: subCategoryId, categoryId });
      if (!validSub) {
        return res.status(400).json({
          success: false,
          message: 'La sous-catégorie sélectionnée ne correspond pas à la catégorie'
        });
      }
      product.categoryId = categoryId;
      product.subCategoryId = subCategoryId;
    }

    if (name) product.name = name.trim();
    if (image !== undefined) product.image = image;
    if (brand !== undefined) product.brand = brand.trim();
    if (price !== undefined) product.price = Number(price) || 0;

    await product.save();

    const populatedProduct = await Product.findById(product._id)
      .populate('categoryId', 'name')
      .populate('subCategoryId', 'name');

    return res.status(200).json({
      success: true,
      message: 'Produit mis à jour avec succès',
      data: populatedProduct
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mise à jour de quantité (Stock ou Magasin) avec enregistrement d'historique
 */
const updateQuantity = async (req, res, next) => {
  try {
    const {
      quantityType,
      newQuantity,
      reason,
      changedBy = 'Admin',
      role = 'admin',
      deductFromWarehouse = true
    } = req.body;
    const productId = req.params.id;

    // Règle de sécurité : les magasiniers et réparateurs ne peuvent PAS manipuler le stock entrepôt directement
    const normalizedRole = (role || '').toLowerCase();
    if ((normalizedRole === 'magasinier' || normalizedRole === 'reparateur') && quantityType === 'STOCK') {
      return res.status(403).json({
        success: false,
        message: 'Action interdite : les magasiniers et réparateurs ne peuvent pas modifier le stock entrepôt.'
      });
    }

    const targetQuantity = Number(newQuantity);
    if (isNaN(targetQuantity) || targetQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'La quantité ne peut pas être négative.'
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    const oldValue = quantityType === 'STOCK' ? product.stockQuantity : product.storeQuantity;
    const difference = targetQuantity - oldValue;

    let historyEntry;
    let successMessage = 'Quantité mise à jour et historique enregistré avec succès';

    // Mise à jour de la quantité ciblée
    if (quantityType === 'STOCK') {
      product.stockQuantity = targetQuantity;
      product.totalQuantity = product.stockQuantity + product.storeQuantity;
      await product.save();

      historyEntry = await HistoryLog.create({
        productId: product._id,
        productName: product.name,
        productSku: product.sku,
        quantityType: 'STOCK',
        oldValue,
        newValue: targetQuantity,
        difference,
        reason: reason && reason.trim() ? reason.trim() : 'Ajustement direct entrepôt',
        changedBy: changedBy && changedBy.trim() ? changedBy.trim() : 'Admin',
        date: new Date()
      });
    } else {
      // quantityType === 'STORE'
      const shouldDeduct = deductFromWarehouse !== false && difference > 0;

      if (shouldDeduct) {
        if (product.stockQuantity < difference) {
          return res.status(400).json({
            success: false,
            message: `Stock entrepôt insuffisant : impossible d'ajouter ${difference} pièce(s) au magasin car l'entrepôt ne dispose que de ${product.stockQuantity} pièce(s).`
          });
        }

        const oldWarehouseStock = product.stockQuantity;
        product.stockQuantity -= difference;
        product.storeQuantity = targetQuantity;
        product.totalQuantity = product.stockQuantity + product.storeQuantity;
        await product.save();

        // Enregistrement de l'historique Magasin (+difference)
        historyEntry = await HistoryLog.create({
          productId: product._id,
          productName: product.name,
          productSku: product.sku,
          quantityType: 'STORE',
          oldValue,
          newValue: targetQuantity,
          difference,
          reason: reason && reason.trim() ? reason.trim() : `Transfert depuis l'entrepôt (+${difference})`,
          changedBy: changedBy && changedBy.trim() ? changedBy.trim() : 'Magasinier',
          date: new Date()
        });

        // Enregistrement de l'historique Entrepôt (-difference pour traçabilité complète)
        await HistoryLog.create({
          productId: product._id,
          productName: product.name,
          productSku: product.sku,
          quantityType: 'STOCK',
          oldValue: oldWarehouseStock,
          newValue: product.stockQuantity,
          difference: -difference,
          reason: `Transfert vers Magasin (-${difference})`,
          changedBy: changedBy && changedBy.trim() ? changedBy.trim() : 'Magasinier',
          date: new Date()
        });

        successMessage = `${difference} pièce(s) ajoutée(s) au magasin et déduite(s) de l'entrepôt avec succès`;
      } else {
        product.storeQuantity = targetQuantity;
        product.totalQuantity = product.stockQuantity + product.storeQuantity;
        await product.save();

        historyEntry = await HistoryLog.create({
          productId: product._id,
          productName: product.name,
          productSku: product.sku,
          quantityType: 'STORE',
          oldValue,
          newValue: targetQuantity,
          difference,
          reason: reason && reason.trim() ? reason.trim() : 'Ajustement magasin',
          changedBy: changedBy && changedBy.trim() ? changedBy.trim() : 'Magasinier',
          date: new Date()
        });
      }
    }

    const populatedProduct = await Product.findById(product._id)
      .populate('categoryId', 'name')
      .populate('subCategoryId', 'name');

    return res.status(200).json({
      success: true,
      message: successMessage,
      data: {
        product: populatedProduct,
        historyLog: historyEntry
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Suppression d'un produit
 */
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    await Product.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Produit supprimé avec succès'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Exportation des produits au format Excel (.xlsx) avec filtres appliqués
 */
const exportProducts = async (req, res, next) => {
  try {
    const filter = buildProductFilter(req.query);

    const products = await Product.find(filter)
      .populate('categoryId', 'name')
      .populate('subCategoryId', 'name')
      .sort({ createdAt: -1 });

    const buffer = await excelService.exportProductsToExcel(products);

    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=produits_${dateStr}.xlsx`
    );

    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Téléchargement du modèle Excel d'import
 */
const getProductTemplate = async (req, res, next) => {
  try {
    const buffer = await excelService.generateProductTemplate();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=modele_import_produits.xlsx'
    );

    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Importation de produits depuis un fichier Excel avec rapport d'erreurs
 */
const importProducts = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir un fichier Excel (.xlsx, .xls)'
      });
    }

    const autoCreate = req.query.autoCreateCategories !== 'false';
    const setStockToZero = req.query.setStockToZero === 'true';
    const result = await excelService.importProductsFromExcel(req.file.buffer, {
      autoCreateCategories: autoCreate,
      setStockToZero
    });

    return res.status(200).json({
      success: true,
      message: `Import terminé: ${result.successCount} produit(s) importé(s), ${result.errorCount} erreur(s).`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Réinitialise le stock de tous les produits à 0 pièces
 */
const resetAllStocks = async (req, res, next) => {
  try {
    const result = await Product.updateMany(
      {},
      {
        $set: {
          stockQuantity: 0,
          storeQuantity: 0,
          totalQuantity: 0
        }
      }
    );

    return res.status(200).json({
      success: true,
      message: `Tous les stocks (${result.modifiedCount} produit(s)) ont été remis à 0 pièces avec succès.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Réinitialise le stock entrepôt de tous les produits à 0 pièces (en conservant le stock magasin)
 */
const resetWarehouseStocks = async (req, res, next) => {
  try {
    const products = await Product.find({});
    let count = 0;
    for (const p of products) {
      if (p.stockQuantity !== 0) {
        p.stockQuantity = 0;
        p.totalQuantity = p.storeQuantity || 0;
        await p.save();
        count++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Stock entrepôt vidé pour ${count} produit(s). Le stock magasin a été conservé.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Action spécifique pour l'espace Réparateurs : Sortie (-N) ou Restitution (+N) de pièces depuis le stock magasin
 */
const repairMovement = async (req, res, next) => {
  try {
    const {
      actionType, // 'CONSUME' (sortie pièce) ou 'RETURN' (restitution pièce)
      quantity = 1,
      repairRef = '',
      clientOrDevice = '',
      repairerName = 'Réparateur',
      reason = ''
    } = req.body;
    const productId = req.params.id;

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: 'La quantité doit être un nombre entier supérieur à 0' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Produit / Pièce introuvable' });
    }

    const oldValue = product.storeQuantity;
    let newValue = oldValue;
    let difference = 0;
    let movementReason = '';

    if (actionType === 'CONSUME') {
      if (oldValue < qty) {
        return res.status(400).json({
          success: false,
          message: `Stock magasin insuffisant pour cette réparation. Disponible en magasin : ${oldValue} pièce(s), demandé : ${qty}`
        });
      }
      newValue = oldValue - qty;
      difference = -qty;
      movementReason = `[RÉPARATION] Sortie pièce - ${repairRef ? `Ticket/Réf: ${repairRef} ` : ''}${clientOrDevice ? `(${clientOrDevice}) ` : ''}- ${reason || 'Utilisé pour réparation'}`;
    } else if (actionType === 'RETURN') {
      newValue = oldValue + qty;
      difference = qty;
      movementReason = `[RÉPARATION] Retour pièce non utilisée - ${repairRef ? `Ticket/Réf: ${repairRef} ` : ''}${clientOrDevice ? `(${clientOrDevice}) ` : ''}- ${reason || 'Réintégration stock magasin'}`;
    } else {
      return res.status(400).json({ success: false, message: "Type d'action invalide. Utiliser CONSUME ou RETURN." });
    }

    // Mise à jour stricte du stock magasin (le stock entrepôt n'est jamais touché)
    product.storeQuantity = newValue;
    product.totalQuantity = product.stockQuantity + product.storeQuantity;
    await product.save();

    const historyEntry = await HistoryLog.create({
      productId: product._id,
      productName: product.name,
      productSku: product.sku,
      quantityType: 'STORE',
      oldValue,
      newValue,
      difference,
      reason: movementReason,
      changedBy: repairerName || 'Réparateur',
      date: new Date()
    });

    const populatedProduct = await Product.findById(product._id)
      .populate('categoryId', 'name')
      .populate('subCategoryId', 'name');

    return res.status(200).json({
      success: true,
      message:
        actionType === 'CONSUME'
          ? `${qty} pièce(s) déduite(s) du stock magasin pour la réparation.`
          : `${qty} pièce(s) restituée(s) au stock magasin.`,
      data: {
        product: populatedProduct,
        historyLog: historyEntry
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateQuantity,
  deleteProduct,
  exportProducts,
  getProductTemplate,
  importProducts,
  resetAllStocks,
  resetWarehouseStocks,
  repairMovement
};

require('dotenv').config();
const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const excelService = require('./src/services/excelService');
const Product = require('./src/models/Product');
const Category = require('./src/models/Category');
const SubCategory = require('./src/models/SubCategory');

async function testUserImport() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/calcul_stock_nounou');
  console.log('[Test] Connecté à MongoDB');

  // Créer un fichier Excel simulant exactement la capture d'écran de l'utilisateur
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Stock');

  // Colonnes de l'image :
  // Désignation | Stock ( Unité | Prix 1 TTC | REPARATION | SUPER GROS | DEMI GROS T | Prix 5 TTC | Prix Promo T | Famille | Sous famille | Marque | Réf produit
  sheet.addRow([
    'Désignation',
    'Stock ( Unité',
    'Prix 1 TTC',
    'REPARATION',
    'SUPER GROS',
    'DEMI GROS T',
    'Prix 5 TTC',
    'Prix Promo T',
    'Famille',
    'Sous famille',
    'Marque',
    'Réf produit'
  ]);

  sheet.addRow([
    'Écran LCD iPhone 13 Original',
    25,
    79.90,
    '',
    '',
    '',
    '',
    '',
    'Pièces Détachées',
    'Écrans Smartphones',
    'Apple',
    'ECR-IP13-ORIG'
  ]);

  sheet.addRow([
    'Batterie Samsung Galaxy S21',
    40,
    29.50,
    '',
    '',
    '',
    '',
    '',
    'Pièces Détachées',
    'Batteries',
    'Samsung',
    'BAT-SAM-S21'
  ]);

  const buffer = await workbook.xlsx.writeBuffer();
  console.log('[Test] Buffer Excel de test créé avec les colonnes exactes de l\'utilisateur');

  // Tester l'import
  const result = await excelService.importProductsFromExcel(buffer, { autoCreateCategories: true });
  console.log('[Test] Résultat de l\'importation:', result);

  if (result.errorCount > 0) {
    console.error('[Erreur d\'importation]:', result.errors);
    throw new Error('L\'import a échoué');
  }

  // Vérifier en base
  const prod1 = await Product.findOne({ sku: 'ECR-IP13-ORIG' }).populate('categoryId').populate('subCategoryId');
  console.log('[Test] Produit vérifié en base:');
  console.log(`- Nom: ${prod1.name}`);
  console.log(`- SKU: ${prod1.sku}`);
  console.log(`- Famille / Catégorie: ${prod1.categoryId?.name}`);
  console.log(`- Sous-famille: ${prod1.subCategoryId?.name}`);
  console.log(`- Stock (Entrepôt): ${prod1.stockQuantity}`);
  console.log(`- Prix: ${prod1.price} €`);
  console.log(`- Marque: ${prod1.brand}`);
  console.log(`- Total calculé: ${prod1.totalQuantity}`);

  await mongoose.disconnect();
  console.log('--- Test d\'import du format utilisateur 100% réussi ! ---');
}

testUserImport().catch((err) => {
  console.error(err);
  process.exit(1);
});

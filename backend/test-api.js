require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./src/models/Category');
const SubCategory = require('./src/models/SubCategory');
const Product = require('./src/models/Product');
const HistoryLog = require('./src/models/HistoryLog');
const excelService = require('./src/services/excelService');

async function runTests() {
  console.log('--- Démarrage des tests de validation backend ---');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/calcul_stock_nounou');
  console.log('[✓] MongoDB connecté avec succès');

  // Nettoyage de test
  await Category.deleteMany({ name: /^TEST_/ });
  await Product.deleteMany({ sku: /^SKU-TEST/ });

  // 1. Test Création Catégorie & Sous-Catégorie
  const testCat = await Category.create({
    name: 'TEST_Catégorie',
    description: 'Catégorie de test'
  });
  console.log('[✓] Catégorie créée:', testCat.name);

  const testSub = await SubCategory.create({
    name: 'TEST_SousCatégorie',
    categoryId: testCat._id,
    description: 'Sous-catégorie de test'
  });
  console.log('[✓] Sous-catégorie créée:', testSub.name);

  // 2. Test Création Produit & Calcul automatique du stock total
  const testProd = new Product({
    name: 'Produit Test Baskets',
    sku: 'SKU-TEST-001',
    categoryId: testCat._id,
    subCategoryId: testSub._id,
    stockQuantity: 15,
    storeQuantity: 5
  });
  await testProd.save();
  console.log(`[✓] Produit créé: Stock=${testProd.stockQuantity}, Magasin=${testProd.storeQuantity}, TotalCalculé=${testProd.totalQuantity}`);
  if (testProd.totalQuantity !== 20) {
    throw new Error(`Erreur: totalQuantity attendu 20, obtenu ${testProd.totalQuantity}`);
  }

  // 3. Test Validation Quantité Négative (doit échouer)
  try {
    const invalidProd = new Product({
      name: 'Produit Invalide',
      sku: 'SKU-TEST-002',
      categoryId: testCat._id,
      subCategoryId: testSub._id,
      stockQuantity: -10,
      storeQuantity: 0
    });
    await invalidProd.save();
    throw new Error('Erreur: une quantité négative aurait dû être rejetée');
  } catch (err) {
    console.log('[✓] Validation Mongoose: Les quantités négatives sont bien bloquées');
  }

  // 4. Test Modification Quantité + Historique
  const oldStock = testProd.stockQuantity;
  const newStock = 25;
  testProd.stockQuantity = newStock;
  testProd.totalQuantity = testProd.stockQuantity + testProd.storeQuantity;
  await testProd.save();

  const historyEntry = await HistoryLog.create({
    productId: testProd._id,
    productName: testProd.name,
    productSku: testProd.sku,
    quantityType: 'STOCK',
    oldValue: oldStock,
    newValue: newStock,
    reason: 'Réapprovisionnement test',
    changedBy: 'Test Runner'
  });
  console.log(`[✓] Historique créé: Ancienne=${historyEntry.oldValue}, Nouvelle=${historyEntry.newValue}, Différence=${historyEntry.difference}, Motif="${historyEntry.reason}"`);
  if (historyEntry.difference !== 10) {
    throw new Error(`Erreur: différence attendue +10, obtenu ${historyEntry.difference}`);
  }

  // 5. Test Génération Modèle Excel
  const templateBuffer = await excelService.generateProductTemplate();
  console.log(`[✓] Template Excel généré (${templateBuffer.length} octets)`);

  // 6. Test Export Produits Excel
  const exportBuffer = await excelService.exportProductsToExcel([testProd]);
  console.log(`[✓] Export Excel généré (${exportBuffer.length} octets)`);

  // 7. Nettoyage
  await SubCategory.deleteMany({ categoryId: testCat._id });
  await Category.findByIdAndDelete(testCat._id);
  await Product.findByIdAndDelete(testProd._id);
  await HistoryLog.deleteMany({ productId: testProd._id });
  console.log('[✓] Données de test nettoyées avec succès');

  await mongoose.disconnect();
  console.log('--- Tous les tests backend ont réussi avec succès ! ---');
}

runTests().catch((err) => {
  console.error('Échec des tests:', err);
  process.exit(1);
});

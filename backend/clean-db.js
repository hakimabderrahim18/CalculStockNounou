require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./src/models/Product');
const Category = require('./src/models/Category');
const SubCategory = require('./src/models/SubCategory');
const HistoryLog = require('./src/models/HistoryLog');

async function cleanDatabase() {
  console.log('[Clean] Connexion à MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/calcul_stock_nounou');

  const deletedProducts = await Product.deleteMany({});
  const deletedSubCategories = await SubCategory.deleteMany({});
  const deletedCategories = await Category.deleteMany({});
  const deletedHistory = await HistoryLog.deleteMany({});

  console.log('--- Nettoyage de la base de données terminé ---');
  console.log(`- Produits supprimés : ${deletedProducts.deletedCount}`);
  console.log(`- Sous-catégories supprimées : ${deletedSubCategories.deletedCount}`);
  console.log(`- Catégories supprimées : ${deletedCategories.deletedCount}`);
  console.log(`- Entrées d'historique supprimées : ${deletedHistory.deletedCount}`);

  await mongoose.disconnect();
  console.log('[Clean] Base de données 100% propre et prête pour vos données.');
}

cleanDatabase().catch((err) => {
  console.error('[Clean Erreur]:', err);
  process.exit(1);
});

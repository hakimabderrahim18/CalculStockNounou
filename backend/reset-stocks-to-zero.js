require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./src/models/Product');
const HistoryLog = require('./src/models/HistoryLog');

async function resetAllStocksToZero() {
  console.log('[Reset] Connexion à MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/calcul_stock_nounou');

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

  console.log(`[✓] Succès : Stock mis à 0 sur ${result.modifiedCount} produit(s) au total.`);

  // Nettoyer l'historique d'import précédent pour repartir sur un historique vierge
  await HistoryLog.deleteMany({});
  console.log('[✓] Historique des stocks réinitialisé.');

  await mongoose.disconnect();
}

resetAllStocksToZero().catch((err) => {
  console.error('[Erreur]:', err);
  process.exit(1);
});

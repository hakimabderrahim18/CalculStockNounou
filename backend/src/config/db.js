const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/calcul_stock_nounou';
    const conn = await mongoose.connect(mongoUri);
    console.log(`[MongoDB] Connecté avec succès: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB Erreur]: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

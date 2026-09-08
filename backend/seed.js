require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./src/models/Category');
const SubCategory = require('./src/models/SubCategory');
const Product = require('./src/models/Product');
const HistoryLog = require('./src/models/HistoryLog');

async function seedData() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/calcul_stock_nounou');
  console.log('[Seed] Connecté à MongoDB');

  // Vider les collections
  await Product.deleteMany({});
  await SubCategory.deleteMany({});
  await Category.deleteMany({});
  await HistoryLog.deleteMany({});
  console.log('[Seed] Base de données réinitialisée');

  // 1. Création des Catégories
  const catChaussures = await Category.create({
    name: 'Chaussures',
    description: 'Chaussures hommes, femmes et enfants'
  });
  const catVetements = await Category.create({
    name: 'Vêtements',
    description: 'Vêtements de prêt-à-porter'
  });
  const catAccessoires = await Category.create({
    name: 'Accessoires',
    description: 'Accessoires de mode et bagagerie'
  });

  // 2. Création des Sous-catégories
  const subSport = await SubCategory.create({
    name: 'Sport & Running',
    categoryId: catChaussures._id,
    description: 'Baskets et chaussures de running'
  });
  const subVille = await SubCategory.create({
    name: 'Ville & Cuir',
    categoryId: catChaussures._id,
    description: 'Chaussures de ville et mocassins'
  });

  const subHauts = await SubCategory.create({
    name: 'T-shirts & Polos',
    categoryId: catVetements._id,
    description: 'Hauts manches courtes et polos'
  });
  const subPantalons = await SubCategory.create({
    name: 'Pantalons & Jeans',
    categoryId: catVetements._id,
    description: 'Jeans et chinos'
  });

  const subSacs = await SubCategory.create({
    name: 'Sacs & Sacoches',
    categoryId: catAccessoires._id,
    description: 'Sacs à dos et bandoulières'
  });

  // 3. Création des Produits d'exemple
  const sampleProducts = [
    {
      name: 'Baskets Runner Nitro Pro',
      sku: 'BSK-NITRO-01',
      categoryId: catChaussures._id,
      subCategoryId: subSport._id,
      stockQuantity: 45,
      storeQuantity: 12,
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&auto=format&fit=crop'
    },
    {
      name: 'Mocassins Cuir Suédé Marron',
      sku: 'MOC-SUEDE-02',
      categoryId: catChaussures._id,
      subCategoryId: subVille._id,
      stockQuantity: 20,
      storeQuantity: 5,
      image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=200&auto=format&fit=crop'
    },
    {
      name: 'T-shirt Coton Bio Col Rond',
      sku: 'TSH-BIO-003',
      categoryId: catVetements._id,
      subCategoryId: subHauts._id,
      stockQuantity: 120,
      storeQuantity: 35,
      image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200&auto=format&fit=crop'
    },
    {
      name: 'Jean Slim Denim Brut',
      sku: 'JEA-SLIM-004',
      categoryId: catVetements._id,
      subCategoryId: subPantalons._id,
      stockQuantity: 60,
      storeQuantity: 18,
      image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=200&auto=format&fit=crop'
    },
    {
      name: 'Sac à Dos Urbain Étanche 20L',
      sku: 'SAC-URBAN-005',
      categoryId: catAccessoires._id,
      subCategoryId: subSacs._id,
      stockQuantity: 30,
      storeQuantity: 8,
      image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&auto=format&fit=crop'
    }
  ];

  for (const prodData of sampleProducts) {
    const total = prodData.stockQuantity + prodData.storeQuantity;
    const prod = await Product.create({
      ...prodData,
      totalQuantity: total
    });

    // Enregistrement initial dans l'historique
    await HistoryLog.create({
      productId: prod._id,
      productName: prod.name,
      productSku: prod.sku,
      quantityType: 'STOCK',
      oldValue: 0,
      newValue: prod.stockQuantity,
      difference: prod.stockQuantity,
      reason: 'Stock initial de départ',
      changedBy: 'Initialisation Système'
    });

    await HistoryLog.create({
      productId: prod._id,
      productName: prod.name,
      productSku: prod.sku,
      quantityType: 'STORE',
      oldValue: 0,
      newValue: prod.storeQuantity,
      difference: prod.storeQuantity,
      reason: 'Stock initial de départ',
      changedBy: 'Initialisation Système'
    });
  }

  console.log('[Seed] 3 Catégories, 5 Sous-catégories et 5 Produits avec historique créés avec succès !');
  await mongoose.disconnect();
}

seedData().catch((err) => {
  console.error('[Seed Erreur]:', err);
  process.exit(1);
});

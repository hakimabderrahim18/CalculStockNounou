const mongoose = require('mongoose');

const observationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Le titre de l'observation est obligatoire"],
      trim: true
    },
    content: {
      type: String,
      required: [true, 'Le contenu de l\'observation est obligatoire'],
      trim: true
    },
    category: {
      type: String,
      enum: ['STOCK', 'CASSE', 'LIVRAISON', 'ANOMALIE', 'PRIX', 'GENERAL'],
      default: 'GENERAL'
    },
    priority: {
      type: String,
      enum: ['BASSE', 'MOYENNE', 'HAUTE', 'URGENTE'],
      default: 'MOYENNE'
    },
    status: {
      type: String,
      enum: ['NOUVEAU', 'EN_COURS', 'RESOLU'],
      default: 'NOUVEAU'
    },
    author: {
      type: String,
      default: 'Magasinier',
      trim: true
    },
    authorRole: {
      type: String,
      default: 'magasinier'
    },
    // Liaison optionnelle avec un produit
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null
    },
    productName: {
      type: String,
      default: ''
    },
    productSku: {
      type: String,
      default: ''
    },
    resolutionNote: {
      type: String,
      default: ''
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    resolvedBy: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

observationSchema.index({ createdAt: -1 });
observationSchema.index({ status: 1, priority: 1 });
observationSchema.index({ title: 'text', content: 'text', productName: 'text', productSku: 'text' });

module.exports = mongoose.model('Observation', observationSchema);

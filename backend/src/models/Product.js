const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Le nom du produit est obligatoire'],
      trim: true
    },
    sku: {
      type: String,
      required: [true, 'La référence/SKU est obligatoire'],
      trim: true,
      uppercase: true,
      unique: true
    },
    image: {
      type: String,
      default: ''
    },
    brand: {
      type: String,
      trim: true,
      default: ''
    },
    price: {
      type: Number,
      min: [0, 'Le prix ne peut pas être négatif'],
      default: 0
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'La catégorie est obligatoire']
    },
    subCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubCategory',
      required: [true, 'La sous-catégorie est obligatoire']
    },
    stockQuantity: {
      type: Number,
      required: true,
      min: [0, 'La quantité stock (entrepôt) ne peut pas être négative'],
      default: 0
    },
    storeQuantity: {
      type: Number,
      required: true,
      min: [0, 'La quantité magasin ne peut pas être négative'],
      default: 0
    },
    totalQuantity: {
      type: Number,
      required: true,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Recalcul automatique de totalQuantity avant sauvegarde
productSchema.pre('save', function (next) {
  this.totalQuantity = (Number(this.stockQuantity) || 0) + (Number(this.storeQuantity) || 0);
  next();
});

productSchema.index({ categoryId: 1, subCategoryId: 1 });
productSchema.index({ name: 'text', sku: 'text' });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);

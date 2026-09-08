const mongoose = require('mongoose');

const historyLogSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, "L'identifiant du produit est obligatoire"]
    },
    productName: {
      type: String,
      trim: true
    },
    productSku: {
      type: String,
      trim: true
    },
    quantityType: {
      type: String,
      enum: {
        values: ['STOCK', 'STORE'],
        message: 'Le type de quantité doit être STOCK (entrepôt) ou STORE (magasin)'
      },
      required: true
    },
    oldValue: {
      type: Number,
      required: true,
      min: [0, "L'ancienne valeur ne peut pas être négative"]
    },
    newValue: {
      type: Number,
      required: true,
      min: [0, 'La nouvelle valeur ne peut pas être négative']
    },
    difference: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      trim: true,
      default: 'Ajustement manuel'
    },
    changedBy: {
      type: String,
      default: 'Admin'
    },
    date: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false
  }
);

historyLogSchema.pre('validate', function (next) {
  if (this.oldValue !== undefined && this.newValue !== undefined) {
    this.difference = this.newValue - this.oldValue;
  }
  next();
});

historyLogSchema.index({ productId: 1, date: -1 });
historyLogSchema.index({ date: -1 });
historyLogSchema.index({ quantityType: 1 });

module.exports = mongoose.model('HistoryLog', historyLogSchema);

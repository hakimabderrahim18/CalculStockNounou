const mongoose = require('mongoose');

const stockAuditSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    fileName: {
      type: String,
      default: ''
    },
    performedBy: {
      type: String,
      default: 'Admin'
    },
    summary: {
      totalCompared: { type: Number, default: 0 },
      lossCount: { type: Number, default: 0 },
      surplusCount: { type: Number, default: 0 },
      exactCount: { type: Number, default: 0 },
      notFoundInAppCount: { type: Number, default: 0 },
      totalLossUnits: { type: Number, default: 0 },
      totalSurplusUnits: { type: Number, default: 0 },
      netDifferenceUnits: { type: Number, default: 0 },
      totalLossValue: { type: Number, default: 0 },
      totalSurplusValue: { type: Number, default: 0 },
      netDifferenceValue: { type: Number, default: 0 }
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product'
        },
        name: { type: String, required: true },
        sku: { type: String, required: true },
        brand: { type: String, default: '' },
        categoryName: { type: String, default: '' },
        subCategoryName: { type: String, default: '' },
        price: { type: Number, default: 0 },
        appWarehouseStock: { type: Number, default: 0 },
        appStoreStock: { type: Number, default: 0 },
        appTotalStock: { type: Number, default: 0 },
        physicalStock: { type: Number, required: true },
        difference: { type: Number, required: true }, // physicalStock - appTotalStock
        differenceValue: { type: Number, default: 0 }, // difference * price
        status: {
          type: String,
          enum: ['LOSS', 'SURPLUS', 'EXACT', 'NOT_FOUND_IN_APP'],
          required: true
        }
      }
    ],
    status: {
      type: String,
      enum: ['ANALYZED', 'APPLIED'],
      default: 'ANALYZED'
    }
  },
  {
    timestamps: true
  }
);

stockAuditSchema.index({ createdAt: -1 });

module.exports = mongoose.model('StockAudit', stockAuditSchema);

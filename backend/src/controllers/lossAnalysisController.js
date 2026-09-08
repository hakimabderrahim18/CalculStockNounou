const StockAudit = require('../models/StockAudit');
const Product = require('../models/Product');
const HistoryLog = require('../models/HistoryLog');
const excelService = require('../services/excelService');

/**
 * Compare un fichier Excel de stock avec le stock total du logiciel (entrepôt + magasin)
 */
const compareStock = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez sélectionner un fichier Excel (.xlsx, .xls, .csv)'
      });
    }

    const { title, performedBy } = req.body;

    const audit = await excelService.compareStockWithSpreadsheet(req.file.buffer, {
      fileName: req.file.originalname,
      title,
      performedBy: performedBy || 'Admin'
    });

    return res.status(201).json({
      success: true,
      message: 'Analyse d\'inventaire et calcul des écarts terminés avec succès',
      data: audit
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère l'historique des analyses d'écarts / inventaires
 */
const getAudits = async (req, res, next) => {
  try {
    const audits = await StockAudit.find({})
      .select('-items')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: audits.length,
      data: audits
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère le détail complet d'une analyse (avec tous les articles comparés)
 */
const getAuditById = async (req, res, next) => {
  try {
    const audit = await StockAudit.findById(req.params.id);

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'Rapport d\'analyse introuvable'
      });
    }

    return res.status(200).json({
      success: true,
      data: audit
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Exporte l'analyse en fichier Excel mis en page
 */
const exportAuditExcel = async (req, res, next) => {
  try {
    const audit = await StockAudit.findById(req.params.id);

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'Rapport d\'analyse introuvable'
      });
    }

    const buffer = await excelService.exportAuditToExcel(audit);

    const safeTitle = (audit.title || 'Inventaire_Pertes')
      .replace(/[^a-zA-Z0-9_\-]/g, '_');

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Analyse_Pertes_${safeTitle}.xlsx"`
    );

    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Applique la régularisation de stock basée sur l'inventaire physique
 */
const applyAudit = async (req, res, next) => {
  try {
    const audit = await StockAudit.findById(req.params.id);

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'Rapport d\'analyse introuvable'
      });
    }

    if (audit.status === 'APPLIED') {
      return res.status(400).json({
        success: false,
        message: 'Cet inventaire a déjà été régularisé et appliqué aux stocks'
      });
    }

    const { targetLocation = 'STOCK', performedBy = 'Admin' } = req.body;
    let appliedCount = 0;

    for (const item of audit.items) {
      if (!item.productId) continue;

      const product = await Product.findById(item.productId);
      if (!product) continue;

      const currentTotal = (product.stockQuantity || 0) + (product.storeQuantity || 0);
      const targetTotal = item.physicalStock;
      const diff = targetTotal - currentTotal;

      if (diff === 0) continue;

      if (targetLocation === 'STOCK') {
        const oldStock = product.stockQuantity || 0;
        const newStock = Math.max(0, oldStock + diff);
        const actualDiff = newStock - oldStock;

        product.stockQuantity = newStock;
        await product.save();

        await HistoryLog.create({
          productId: product._id,
          productName: product.name,
          productSku: product.sku,
          quantityType: 'STOCK',
          oldValue: oldStock,
          newValue: newStock,
          difference: actualDiff,
          reason: `Régularisation inventaire: ${audit.title} (Écart: ${diff > 0 ? '+' : ''}${diff})`,
          changedBy: performedBy
        });
      } else {
        const oldStore = product.storeQuantity || 0;
        const newStore = Math.max(0, oldStore + diff);
        const actualDiff = newStore - oldStore;

        product.storeQuantity = newStore;
        await product.save();

        await HistoryLog.create({
          productId: product._id,
          productName: product.name,
          productSku: product.sku,
          quantityType: 'STORE',
          oldValue: oldStore,
          newValue: newStore,
          difference: actualDiff,
          reason: `Régularisation inventaire: ${audit.title} (Écart: ${diff > 0 ? '+' : ''}${diff})`,
          changedBy: performedBy
        });
      }

      appliedCount++;
    }

    audit.status = 'APPLIED';
    await audit.save();

    return res.status(200).json({
      success: true,
      message: `Régularisation appliquée avec succès à ${appliedCount} produit(s)`,
      data: audit
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Supprime une analyse d'inventaire
 */
const deleteAudit = async (req, res, next) => {
  try {
    const audit = await StockAudit.findByIdAndDelete(req.params.id);

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'Rapport d\'analyse introuvable'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Rapport d\'analyse supprimé avec succès'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  compareStock,
  getAudits,
  getAuditById,
  exportAuditExcel,
  applyAudit,
  deleteAudit
};

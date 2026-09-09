const HistoryLog = require('../models/HistoryLog');
const excelService = require('../services/excelService');

const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const makeAccentInsensitiveRegex = (term) => {
  const accentMap = {
    a: '[aàáâãäåā]',
    e: '[eèéêëē]',
    i: '[iìíîïī]',
    o: '[oòóôõöō]',
    u: '[uùúûüū]',
    c: '[cç]',
    n: '[nñ]'
  };
  const escaped = escapeRegex(term);
  const pattern = escaped
    .split('')
    .map((char) => accentMap[char.toLowerCase()] || char)
    .join('');
  return new RegExp(pattern, 'i');
};

/**
 * Construit l'objet de filtre MongoDB pour l'historique
 */
const buildHistoryFilter = (query) => {
  const filter = {};

  if (query.productId) {
    filter.productId = query.productId;
  }

  if (query.quantityType && ['STOCK', 'STORE'].includes(query.quantityType.toUpperCase())) {
    filter.quantityType = query.quantityType.toUpperCase();
  }

  // Recherche textuelle multi-mots non ordonnée
  if (query.search && query.search.trim()) {
    const words = query.search.trim().split(/\s+/).filter(Boolean);
    if (words.length > 0) {
      filter.$and = words.map((word) => {
        const regex = makeAccentInsensitiveRegex(word);
        return {
          $or: [
            { productName: regex },
            { productSku: regex },
            { reason: regex },
            { changedBy: regex }
          ]
        };
      });
    }
  }

  if (query.startDate || query.endDate) {
    filter.date = {};
    if (query.startDate) {
      const start = new Date(query.startDate);
      start.setHours(0, 0, 0, 0);
      filter.date.$gte = start;
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }

  return filter;
};

/**
 * Récupère les logs d'historique avec filtres et pagination
 */
const getHistory = async (req, res, next) => {
  try {
    const filter = buildHistoryFilter(req.query);

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const skip = (page - 1) * limit;

    const total = await HistoryLog.countDocuments(filter);

    const logs = await HistoryLog.find(filter)
      .populate('productId', 'name sku')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export Excel de l'historique des modifications
 */
const exportHistory = async (req, res, next) => {
  try {
    const filter = buildHistoryFilter(req.query);

    const logs = await HistoryLog.find(filter)
      .populate('productId', 'name sku')
      .sort({ date: -1 });

    const buffer = await excelService.exportHistoryToExcel(logs);

    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=historique_stock_${dateStr}.xlsx`
    );

    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHistory,
  exportHistory
};

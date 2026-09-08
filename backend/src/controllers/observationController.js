const Observation = require('../models/Observation');
const Product = require('../models/Product');

/**
 * Récupère toutes les observations avec filtres et recherche
 */
const getObservations = async (req, res, next) => {
  try {
    const { status, priority, category, search, limit = 100, page = 1 } = req.query;

    const query = {};

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (priority && priority !== 'ALL') {
      query.priority = priority;
    }

    if (category && category !== 'ALL') {
      query.category = category;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: regex },
        { content: regex },
        { productName: regex },
        { productSku: regex },
        { author: regex }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [observations, total] = await Promise.all([
      Observation.find(query)
        .populate('productId', 'name sku price stockQuantity storeQuantity')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Observation.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      count: observations.length,
      total,
      data: observations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère les statistiques globales des observations pour le tableau de bord
 */
const getObservationStats = async (req, res, next) => {
  try {
    const [total, urgent, high, open, inProgress, resolved] = await Promise.all([
      Observation.countDocuments({}),
      Observation.countDocuments({ priority: 'URGENTE', status: { $ne: 'RESOLU' } }),
      Observation.countDocuments({ priority: 'HAUTE', status: { $ne: 'RESOLU' } }),
      Observation.countDocuments({ status: 'NOUVEAU' }),
      Observation.countDocuments({ status: 'EN_COURS' }),
      Observation.countDocuments({ status: 'RESOLU' })
    ]);

    return res.status(200).json({
      success: true,
      data: {
        total,
        urgent,
        high,
        open,
        inProgress,
        resolved
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère une observation par son ID
 */
const getObservationById = async (req, res, next) => {
  try {
    const observation = await Observation.findById(req.params.id).populate(
      'productId',
      'name sku price stockQuantity storeQuantity'
    );

    if (!observation) {
      return res.status(404).json({
        success: false,
        message: 'Observation introuvable'
      });
    }

    return res.status(200).json({
      success: true,
      data: observation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Création d'une nouvelle observation
 */
const createObservation = async (req, res, next) => {
  try {
    const {
      title,
      content,
      category = 'GENERAL',
      priority = 'MOYENNE',
      author = 'Magasinier',
      authorRole = 'magasinier',
      productId = null,
      productName = '',
      productSku = ''
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Le titre de l'observation est obligatoire"
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Le contenu de l'observation est obligatoire"
      });
    }

    let pName = productName;
    let pSku = productSku;

    if (productId && (!pName || !pSku)) {
      const prod = await Product.findById(productId);
      if (prod) {
        pName = prod.name;
        pSku = prod.sku;
      }
    }

    const observation = await Observation.create({
      title: title.trim(),
      content: content.trim(),
      category,
      priority,
      status: 'NOUVEAU',
      author: author.trim() || 'Magasinier',
      authorRole: authorRole || 'magasinier',
      productId: productId || null,
      productName: pName,
      productSku: pSku
    });

    const populated = await Observation.findById(observation._id).populate(
      'productId',
      'name sku price stockQuantity storeQuantity'
    );

    return res.status(201).json({
      success: true,
      message: 'Observation enregistrée avec succès dans le journal',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Modification d'une observation existante
 */
const updateObservation = async (req, res, next) => {
  try {
    const observation = await Observation.findById(req.params.id);

    if (!observation) {
      return res.status(404).json({
        success: false,
        message: 'Observation introuvable'
      });
    }

    const {
      title,
      content,
      category,
      priority,
      status,
      resolutionNote,
      resolvedBy,
      productId,
      productName,
      productSku
    } = req.body;

    if (title !== undefined) observation.title = title.trim();
    if (content !== undefined) observation.content = content.trim();
    if (category !== undefined) observation.category = category;
    if (priority !== undefined) observation.priority = priority;

    if (productId !== undefined) observation.productId = productId || null;
    if (productName !== undefined) observation.productName = productName;
    if (productSku !== undefined) observation.productSku = productSku;

    if (status !== undefined) {
      observation.status = status;
      if (status === 'RESOLU') {
        observation.resolvedAt = new Date();
        observation.resolvedBy = resolvedBy || observation.author || 'Magasinier';
      } else {
        observation.resolvedAt = null;
        observation.resolvedBy = '';
      }
    }

    if (resolutionNote !== undefined) {
      observation.resolutionNote = resolutionNote.trim();
    }

    await observation.save();

    const populated = await Observation.findById(observation._id).populate(
      'productId',
      'name sku price stockQuantity storeQuantity'
    );

    return res.status(200).json({
      success: true,
      message: 'Observation mise à jour avec succès',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Suppression d'une observation
 */
const deleteObservation = async (req, res, next) => {
  try {
    const observation = await Observation.findByIdAndDelete(req.params.id);

    if (!observation) {
      return res.status(404).json({
        success: false,
        message: 'Observation introuvable'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Observation supprimée du journal avec succès'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getObservations,
  getObservationStats,
  getObservationById,
  createObservation,
  updateObservation,
  deleteObservation
};

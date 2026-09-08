const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const Product = require('../models/Product');
const excelService = require('../services/excelService');

/**
 * Récupère toutes les catégories avec leurs sous-catégories
 */
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().populate('subCategories').sort({ name: 1 });
    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère une catégorie par son ID
 */
const getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id).populate('subCategories');
    if (!category) {
      return res.status(404).json({ success: false, message: 'Catégorie introuvable' });
    }
    return res.status(200).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

/**
 * Création d'une catégorie
 */
const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    if (existing) {
      return res.status(409).json({ success: false, message: `La catégorie '${name}' existe déjà` });
    }

    const category = await Category.create({ name: name.trim(), description });
    return res.status(201).json({ success: true, message: 'Catégorie créée avec succès', data: category });
  } catch (error) {
    next(error);
  }
};

/**
 * Modification d'une catégorie
 */
const updateCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Catégorie introuvable' });
    }

    if (name && name.trim().toLowerCase() !== category.name.toLowerCase()) {
      const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
      if (existing) {
        return res.status(409).json({ success: false, message: `La catégorie '${name}' existe déjà` });
      }
      category.name = name.trim();
    }

    if (description !== undefined) category.description = description;

    await category.save();
    return res.status(200).json({ success: true, message: 'Catégorie mise à jour', data: category });
  } catch (error) {
    next(error);
  }
};

/**
 * Suppression d'une catégorie (avec vérification de dépendances)
 */
const deleteCategory = async (req, res, next) => {
  try {
    const categoryId = req.params.id;

    // Vérifier si des produits sont rattachés
    const productsCount = await Product.countDocuments({ categoryId });
    if (productsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Impossible de supprimer cette catégorie car ${productsCount} produit(s) y sont rattaché(s).`
      });
    }

    // Supprimer les sous-catégories associées
    await SubCategory.deleteMany({ categoryId });
    await Category.findByIdAndDelete(categoryId);

    return res.status(200).json({ success: true, message: 'Catégorie et sous-catégories supprimées' });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère les sous-catégories (optionnellement filtrées par categoryId)
 */
const getSubCategories = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.categoryId) {
      filter.categoryId = req.query.categoryId;
    }
    const subCategories = await SubCategory.find(filter).populate('categoryId', 'name').sort({ name: 1 });
    return res.status(200).json({ success: true, data: subCategories });
  } catch (error) {
    next(error);
  }
};

/**
 * Création d'une sous-catégorie
 */
const createSubCategory = async (req, res, next) => {
  try {
    const { name, categoryId, description } = req.body;

    const parentCat = await Category.findById(categoryId);
    if (!parentCat) {
      return res.status(404).json({ success: false, message: 'Catégorie parente introuvable' });
    }

    const existing = await SubCategory.findOne({
      categoryId,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `La sous-catégorie '${name}' existe déjà sous la catégorie '${parentCat.name}'`
      });
    }

    const subCategory = await SubCategory.create({
      name: name.trim(),
      categoryId,
      description
    });

    return res.status(201).json({ success: true, message: 'Sous-catégorie créée avec succès', data: subCategory });
  } catch (error) {
    next(error);
  }
};

/**
 * Modification d'une sous-catégorie
 */
const updateSubCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const subCategory = await SubCategory.findById(req.params.id);

    if (!subCategory) {
      return res.status(404).json({ success: false, message: 'Sous-catégorie introuvable' });
    }

    if (name && name.trim().toLowerCase() !== subCategory.name.toLowerCase()) {
      const existing = await SubCategory.findOne({
        categoryId: subCategory.categoryId,
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
      });
      if (existing) {
        return res.status(409).json({ success: false, message: `Cette sous-catégorie existe déjà pour cette catégorie` });
      }
      subCategory.name = name.trim();
    }

    if (description !== undefined) subCategory.description = description;

    await subCategory.save();
    return res.status(200).json({ success: true, message: 'Sous-catégorie mise à jour', data: subCategory });
  } catch (error) {
    next(error);
  }
};

/**
 * Suppression d'une sous-catégorie
 */
const deleteSubCategory = async (req, res, next) => {
  try {
    const subCategoryId = req.params.id;

    const productsCount = await Product.countDocuments({ subCategoryId });
    if (productsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Impossible de supprimer cette sous-catégorie car ${productsCount} produit(s) y sont rattaché(s).`
      });
    }

    await SubCategory.findByIdAndDelete(subCategoryId);
    return res.status(200).json({ success: true, message: 'Sous-catégorie supprimée' });
  } catch (error) {
    next(error);
  }
};

/**
 * Exportation Excel des catégories et sous-catégories
 */
const exportCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    const buffer = await excelService.exportCategoriesToExcel(categories);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=categories_souscategories.xlsx');

    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getSubCategories,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
  exportCategories
};

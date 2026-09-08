const { body, query, param, validationResult } = require('express-validator');

const validate = (validations) => {
  return async (req, res, next) => {
    for (const validation of validations) {
      const result = await validation.run(req);
      if (result.errors.length) break;
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    return res.status(400).json({
      success: false,
      message: 'Données de requête invalides',
      errors: errors.array().map((err) => ({ field: err.path, message: err.msg }))
    });
  };
};

const validateProduct = validate([
  body('name').trim().notEmpty().withMessage('Le nom du produit est obligatoire'),
  body('sku').trim().notEmpty().withMessage('La référence/SKU est obligatoire'),
  body('categoryId').isMongoId().withMessage('Identifiant de catégorie invalide'),
  body('subCategoryId').isMongoId().withMessage('Identifiant de sous-catégorie invalide'),
  body('stockQuantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('La quantité stock (entrepôt) doit être un nombre entier positif ou nul'),
  body('storeQuantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('La quantité magasin doit être un nombre entier positif ou nul')
]);

const validateQuantityUpdate = validate([
  param('id').isMongoId().withMessage('Identifiant de produit invalide'),
  body('quantityType')
    .isIn(['STOCK', 'STORE'])
    .withMessage('Le type de quantité doit être STOCK ou STORE'),
  body('newQuantity')
    .notEmpty()
    .withMessage('La nouvelle quantité est requise')
    .isInt({ min: 0 })
    .withMessage('La quantité ne peut pas être négative'),
  body('reason').optional().trim(),
  body('changedBy').optional().trim()
]);

const validateCategory = validate([
  body('name').trim().notEmpty().withMessage('Le nom de la catégorie est obligatoire')
]);

const validateSubCategory = validate([
  body('name').trim().notEmpty().withMessage('Le nom de la sous-catégorie est obligatoire'),
  body('categoryId').isMongoId().withMessage('Identifiant de catégorie parente invalide')
]);

module.exports = {
  validateProduct,
  validateQuantityUpdate,
  validateCategory,
  validateSubCategory
};

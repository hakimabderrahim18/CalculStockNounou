const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { validateProduct, validateQuantityUpdate } = require('../middlewares/validators');
const upload = require('../middlewares/upload');

// Routes spécifiques Excel (doivent précéder /:id)
router.get('/export', productController.exportProducts);
router.get('/import/template', productController.getProductTemplate);
router.post('/import', upload.single('file'), productController.importProducts);

// Route de réinitialisation globale de stock
router.post('/reset-all-stocks', productController.resetAllStocks);
router.post('/reset-warehouse-stocks', productController.resetWarehouseStocks);

// Route de suppression groupée
router.post('/bulk-delete', productController.bulkDeleteProducts);

// Routes CRUD principales
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);
router.post('/', validateProduct, productController.createProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

// Route spécifique de mise à jour de quantité avec validation & historique
router.patch('/:id/quantity', validateQuantityUpdate, productController.updateQuantity);

// Route spécifique pour les réparateurs (sortie ou retour depuis stock magasin uniquement)
router.post('/:id/repair', productController.repairMovement);

module.exports = router;

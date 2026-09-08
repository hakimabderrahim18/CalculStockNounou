const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { validateSubCategory } = require('../middlewares/validators');

router.get('/', categoryController.getSubCategories);
router.post('/', validateSubCategory, categoryController.createSubCategory);
router.put('/:id', categoryController.updateSubCategory);
router.delete('/:id', categoryController.deleteSubCategory);

module.exports = router;

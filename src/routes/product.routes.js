import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  createProduct,
  deleteProduct,
  getProduct,
  listMyProducts,
  listProducts,
  updateProduct,
} from '../controllers/product.controller.js';
import { protect } from '../middleware/auth.js';
import { uploadImage } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { CATEGORIES } from '../models/Product.js';

const router = Router();

const idRule = param('id').isMongoId().withMessage('Invalid product ID.');

// NOTE: multer (uploadImage) must run BEFORE the validators so that req.body is filled.
const productRules = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters.'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }).withMessage('Description is too long (max 2000).'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be 0 or more.').toFloat(),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a whole number, 0 or more.').toInt(),
  body('category').isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(', ')}.`),
];

router.get('/', listProducts);
router.get('/mine', protect, listMyProducts); // must be before '/:id'
router.get('/:id', [idRule], validate, getProduct);
router.post('/', protect, uploadImage, productRules, validate, createProduct);
router.put('/:id', protect, uploadImage, [idRule, ...productRules], validate, updateProduct);
router.delete('/:id', protect, [idRule], validate, deleteProduct);

export default router;

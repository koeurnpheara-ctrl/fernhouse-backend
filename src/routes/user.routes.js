import { Router } from 'express';
import { body, param } from 'express-validator';
import { deleteUser, listUsers, updateUser } from '../controllers/user.controller.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(protect, restrictTo('admin'));

router.get('/', listUsers);
router.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid user ID.'),
    body('name').optional().trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters.'),
    body('role').optional().isIn(['user', 'admin']).withMessage('Role must be user or admin.'),
  ],
  validate,
  updateUser
);
router.delete('/:id', [param('id').isMongoId().withMessage('Invalid user ID.')], validate, deleteUser);

export default router;

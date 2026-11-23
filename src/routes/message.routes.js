import { Router } from 'express';
import { body, param } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { createMessage, deleteMessage, listMessages } from '../controllers/message.controller.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many messages. Please try again later.' },
});

router.post(
  '/',
  contactLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters.'),
    body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
    body('subject').optional({ values: 'falsy' }).trim().isLength({ max: 120 }).withMessage('Subject is too long (max 120).'),
    body('message').trim().isLength({ min: 10, max: 3000 }).withMessage('Message must be 10-3000 characters.'),
  ],
  validate,
  createMessage
);
router.get('/', protect, restrictTo('admin'), listMessages);
router.delete(
  '/:id',
  protect,
  restrictTo('admin'),
  [param('id').isMongoId().withMessage('Invalid message ID.')],
  validate,
  deleteMessage
);

export default router;

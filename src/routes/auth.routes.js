import { Router } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { login, register, me, updateMe, changePassword } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in a few minutes.' },
});

const email = body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail();
const name = body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters.');
const password = body('password')
  .isLength({ min: 8, max: 72 })
  .withMessage('Password must be 8-72 characters.');

router.post('/register', authLimiter, [name, email, password], validate, register);
router.post(
  '/login',
  authLimiter,
  [email, body('password').notEmpty().withMessage('Password is required.')],
  validate,
  login
);
router.get('/me', protect, me);
router.put('/me', protect, [name], validate, updateMe);
router.put(
  '/password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required.'),
    body('newPassword').isLength({ min: 8, max: 72 }).withMessage('New password must be 8-72 characters.'),
  ],
  validate,
  changePassword
);

export default router;

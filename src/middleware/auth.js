import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new AppError('You are not logged in.', 401);

  const payload = jwt.verify(token, env.jwtSecret); // JWT errors are handled in error middleware
  const user = await User.findById(payload.id);
  if (!user) throw new AppError('This account no longer exists.', 401);

  req.user = user;
  next();
});

export const restrictTo =
  (...roles) =>
  (req, _res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to do this.', 403));
    }
    next();
  };

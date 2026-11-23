import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { removeUploadedFile } from '../utils/files.js';

export const listUsers = asyncHandler(async (req, res) => {
  const { search = '', role } = req.query;
  const filter = {};
  if (role === 'user' || role === 'admin') filter.role = role;
  if (search) {
    const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const users = await User.find(filter).sort({ createdAt: -1 });
  res.json({ data: users });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404);
  if (user._id.equals(req.user._id) && req.body.role && req.body.role !== user.role) {
    throw new AppError('You cannot change your own role.', 400);
  }
  if (req.body.name !== undefined) user.name = req.body.name;
  if (req.body.role !== undefined) user.role = req.body.role;
  await user.save();
  res.json({ user });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404);
  if (user._id.equals(req.user._id)) throw new AppError('You cannot delete your own account.', 400);

  const products = await Product.find({ owner: user._id });
  await Promise.all(products.map((p) => removeUploadedFile(p.image)));
  await Product.deleteMany({ owner: user._id });
  await user.deleteOne();
  res.status(204).end();
});

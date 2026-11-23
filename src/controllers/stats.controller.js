import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { Message } from '../models/Message.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getStats = asyncHandler(async (_req, res) => {
  const [users, products, messages, byCategory] = await Promise.all([
    User.countDocuments(),
    Product.countDocuments(),
    Message.countDocuments(),
    Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);
  res.json({
    users,
    products,
    messages,
    byCategory: byCategory.map((c) => ({ category: c._id, count: c.count })),
  });
});

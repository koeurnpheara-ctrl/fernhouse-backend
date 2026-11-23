import { Product } from '../models/Product.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { removeUploadedFile } from '../utils/files.js';

const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  'price-asc': { price: 1 },
  'price-desc': { price: -1 },
  name: { name: 1 },
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function findPage(req, res, baseFilter = {}) {
  const { search, category, minPrice, maxPrice, inStock, sort = 'newest' } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);

  const filter = { ...baseFilter };
  if (search) {
    const rx = new RegExp(escapeRegex(String(search)), 'i');
    filter.$or = [{ name: rx }, { description: rx }];
  }
  if (category) filter.category = String(category);
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice !== undefined && minPrice !== '') filter.price.$gte = Number(minPrice);
    if (maxPrice !== undefined && maxPrice !== '') filter.price.$lte = Number(maxPrice);
  }
  if (inStock === 'true') filter.stock = { $gt: 0 };

  const [total, data] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter)
      .sort(SORTS[sort] || SORTS.newest)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('owner', 'name'),
  ]);

  res.json({ data, page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) });
}

export const listProducts = asyncHandler((req, res) => findPage(req, res));

// Products created by the logged-in user
export const listMyProducts = asyncHandler((req, res) => findPage(req, res, { owner: req.user._id }));

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('owner', 'name');
  if (!product) throw new AppError('Product not found.', 404);
  res.json({ product });
});

export const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, stock, category } = req.body;
  const product = await Product.create({
    name,
    description,
    price,
    stock,
    category,
    owner: req.user._id,
    image: req.file ? `/uploads/${req.file.filename}` : '',
  });
  res.status(201).json({ product });
});

function assertCanEdit(product, user) {
  if (user.role !== 'admin' && !product.owner.equals(user._id)) {
    throw new AppError('You can only change your own products.', 403);
  }
}

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    if (req.file) await removeUploadedFile(`/uploads/${req.file.filename}`);
    throw new AppError('Product not found.', 404);
  }
  try {
    assertCanEdit(product, req.user);
  } catch (err) {
    if (req.file) await removeUploadedFile(`/uploads/${req.file.filename}`);
    throw err;
  }

  const { name, description, price, stock, category, removeImage } = req.body;
  product.set({ name, description, price, stock, category });

  if (req.file) {
    await removeUploadedFile(product.image);
    product.image = `/uploads/${req.file.filename}`;
  } else if (removeImage === 'true') {
    await removeUploadedFile(product.image);
    product.image = '';
  }

  await product.save();
  res.json({ product });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found.', 404);
  assertCanEdit(product, req.user);
  await removeUploadedFile(product.image);
  await product.deleteOne();
  res.status(204).end();
});

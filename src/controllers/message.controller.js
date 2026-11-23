import { Message } from '../models/Message.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createMessage = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;
  await Message.create({ name, email, subject, message });
  res.status(201).json({ message: 'Thanks! Your message has been sent.' });
});

export const listMessages = asyncHandler(async (_req, res) => {
  const data = await Message.find().sort({ createdAt: -1 });
  res.json({ data });
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const found = await Message.findByIdAndDelete(req.params.id);
  if (!found) throw new AppError('Message not found.', 404);
  res.status(204).end();
});

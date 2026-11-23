import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true },
    subject: { type: String, trim: true, maxlength: 120, default: '' },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
  },
  { timestamps: true }
);

export const Message = mongoose.model('Message', messageSchema);

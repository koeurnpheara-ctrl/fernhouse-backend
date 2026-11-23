import mongoose from 'mongoose';
import { env } from './env.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function connectDB(retries = 10) {
  mongoose.set('strictQuery', true);
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
      console.log('MongoDB connected');
      return;
    } catch (err) {
      console.error(`MongoDB connection failed (attempt ${attempt}/${retries}): ${err.message}`);
      if (attempt === retries) throw err;
      await sleep(3000);
    }
  }
}

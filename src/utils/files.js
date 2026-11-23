import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

// imagePath looks like "/uploads/abc.jpg". Deletes the file, ignoring errors.
export async function removeUploadedFile(imagePath) {
  if (!imagePath || !imagePath.startsWith('/uploads/')) return;
  const filename = path.basename(imagePath);
  try {
    await fs.unlink(path.join(env.uploadDir, filename));
  } catch {
    /* file already gone */
  }
}

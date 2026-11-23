import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';

export async function ensureAdmin() {
  if (!env.adminEmail || !env.adminPassword) {
    console.log('ADMIN_EMAIL / ADMIN_PASSWORD not set - skipping admin creation.');
    return null;
  }
  let admin = await User.findOne({ email: env.adminEmail.toLowerCase() });
  if (!admin) {
    admin = await User.create({
      name: env.adminName,
      email: env.adminEmail,
      password: env.adminPassword,
      role: 'admin',
    });
    console.log(`Admin account created: ${admin.email}`);
  }
  return admin;
}

const SAMPLE = [
  ['Monstera Deliciosa', 'indoor', 34.5, 12, 'Glossy split leaves and an easygoing temperament. Bright, indirect light and water every 1-2 weeks.'],
  ['Snake Plant', 'indoor', 22, 25, 'Nearly unkillable. Tolerates low light and forgetful watering.'],
  ['Pothos Golden', 'indoor', 14.9, 30, 'A trailing vine that looks good on any shelf and roots easily in water.'],
  ['Lavender Pot', 'outdoor', 11, 18, 'Fragrant purple spikes that pollinators love. Needs full sun and well-drained soil.'],
  ['Echeveria Rosette', 'succulents', 8.5, 40, 'Tight blue-green rosettes. Water only when the soil is completely dry.'],
  ['Basil Starter', 'herbs', 4.75, 50, 'Sweet basil, ready to repot. Pinch the tops often for bushier growth.'],
  ['Glazed Ceramic Pot (20 cm)', 'pots', 19, 15, 'Drainage hole and saucer included. Fits most 17 cm nursery pots.'],
  ['Organic Houseplant Food', 'care', 9.25, 60, 'Liquid feed for all indoor plants. Use once a month in the growing season.'],
];

export async function seedSampleProducts(admin) {
  if (!env.seedSampleData || !admin) return;
  if ((await Product.countDocuments()) > 0) return;
  await Product.insertMany(
    SAMPLE.map(([name, category, price, stock, description]) => ({
      name, category, price, stock, description, owner: admin._id,
    }))
  );
  console.log(`Inserted ${SAMPLE.length} sample products.`);
}

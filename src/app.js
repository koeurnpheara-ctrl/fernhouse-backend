import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set('trust proxy', 1); // we run behind Nginx

// Images are loaded by the website on a different origin, so allow cross-origin reads.
// (upgrade-insecure-requests is turned off so the admin panel also works on http://localhost)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: { useDefaults: true, directives: { 'upgrade-insecure-requests': null } },
  })
);

app.use(
  cors({
    origin(origin, cb) {
      // Allow tools without an Origin header (curl, health checks) and the configured websites.
      if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
      cb(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

if (env.nodeEnv !== 'test') app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));

app.use('/uploads', express.static(env.uploadDir, { maxAge: '7d', fallthrough: true }));

// Admin panel (plain HTML/JS) served by the backend itself, e.g. https://backend.myproject.site/admin/
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));
app.get('/', (_req, res) => res.redirect('/admin/'));
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;

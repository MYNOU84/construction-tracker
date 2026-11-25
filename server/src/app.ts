import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { router } from './routes';
import { authenticate } from './middleware/auth';
import { serveUpload } from './controllers/documentController';
import prisma from './lib/prisma';

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// Behind Vercel / a reverse proxy: trust the first hop so rate limits see the client IP.
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-origin' } }));

// Production: same-origin only, unless CORS_ORIGIN lists extra origins (comma-separated).
// Development: the Vite dev server.
const allowedOrigins = isProd
  ? (process.env.CORS_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)),
  credentials: true,
}));
app.use(morgan(isProd ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Uploaded files: authenticated and limited to members of the owning project.
app.get('/uploads/:kind(documents|photos)/:file', authenticate, serveUpload);

// API routes
app.use('/api', router);

// Health check with DB ping
app.get('/api/health', async (_: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', version: '1.0.0', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', version: '1.0.0', db: 'disconnected' });
  }
});

// Serve React app in production (client/dist relative to project root).
// On Vercel the build output is served by the CDN (vercel.json), so the function only handles the API.
if (isProd && !process.env.VERCEL) {
  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

// Global error handler — 4 params required for Express to recognise it
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error & { status?: number; code?: string; type?: string }, _req: Request, res: Response, _next: NextFunction) => {
  // Client errors: upload rejections (multer), malformed / oversized JSON.
  if (err.name === 'MulterError' || err.status === 400 || err.type === 'entity.parse.failed') {
    const tooLarge = err.code === 'LIMIT_FILE_SIZE';
    res.status(tooLarge ? 413 : 400).json({ message: tooLarge ? 'File is too large' : err.message || 'Bad request' });
    return;
  }
  if (err.type === 'entity.too.large') { res.status(413).json({ message: 'Request body too large' }); return; }
  console.error('[ERROR]', err.message);
  res.status(500).json({ message: isProd ? 'Internal server error' : err.message });
});

export default app;

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { router } from './routes';
import prisma from './lib/prisma';

const app = express();
const isProd = process.env.NODE_ENV === 'production';

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: isProd ? (process.env.CORS_ORIGIN || true) : 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan(isProd ? 'combined' : 'dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files — __dirname is server/dist in compiled output
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

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

// Serve React app in production (client/dist relative to project root)
if (isProd) {
  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

// Global error handler — 4 params required for Express to recognise it
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ message: isProd ? 'Internal server error' : err.message });
});

export default app;

// Vercel serverless entry: the whole Express API runs as one function.
// vercel.json rewrites /api/* and /uploads/* here; the React build is served as static files.
import app from '../server/src/app';

export default app;

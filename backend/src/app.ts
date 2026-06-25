import cors from 'cors';
import express from 'express';
import { contentTypesRouter } from './routes/contentTypes';

export function createApp() {
  const app = express();
  app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/content-types', contentTypesRouter);

  return app;
}

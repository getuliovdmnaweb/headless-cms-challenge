import cors from 'cors';
import express from 'express';
import { contentRouter } from './routes/content';
import { contentTypesRouter } from './routes/contentTypes';
import { entriesRouter } from './routes/entries';

export function createApp() {
  const app = express();
  app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/content-types/:contentTypeId/entries', entriesRouter);
  app.use('/api/content-types', contentTypesRouter);
  app.use('/api/content', contentRouter);

  return app;
}

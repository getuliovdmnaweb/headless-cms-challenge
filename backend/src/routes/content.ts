import { Router } from 'express';
import { getContentTypeBySlug } from '../repositories/contentTypes';
import { getEntry, listEntries } from '../repositories/entries';

export const contentRouter = Router();

function toPublicEntry(entry: { id: string; data: Record<string, unknown>; createdAt: string; updatedAt: string }) {
  return { id: entry.id, data: entry.data, createdAt: entry.createdAt, updatedAt: entry.updatedAt };
}

contentRouter.get('/:type', async (req, res) => {
  const contentType = await getContentTypeBySlug(req.params.type);
  if (!contentType) return res.status(404).json({ error: { message: 'Content type not found' } });

  const entries = await listEntries(contentType.id, contentType.fields);
  res.json(entries.map(toPublicEntry));
});

contentRouter.get('/:type/:id', async (req, res) => {
  const contentType = await getContentTypeBySlug(req.params.type);
  if (!contentType) return res.status(404).json({ error: { message: 'Content type not found' } });

  const entry = await getEntry(contentType.id, req.params.id, contentType.fields);
  if (!entry) return res.status(404).json({ error: { message: 'Entry not found' } });
  res.json(toPublicEntry(entry));
});

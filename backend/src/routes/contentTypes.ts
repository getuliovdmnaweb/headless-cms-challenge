import { Router } from 'express';
import {
  ContentTypeError,
  createContentType,
  deleteContentType,
  getContentType,
  listContentTypes,
  updateContentTypeFields,
} from '../repositories/contentTypes';

export const contentTypesRouter = Router();

contentTypesRouter.get('/', async (_req, res) => {
  res.json(await listContentTypes());
});

contentTypesRouter.post('/', async (req, res) => {
  try {
    const created = await createContentType({
      name: req.body.name,
      slug: req.body.slug,
      fields: req.body.fields ?? [],
    });
    res.status(201).json(created);
  } catch (err) {
    if (err instanceof ContentTypeError) {
      const field = err.code === 'DUPLICATE_SLUG' ? 'slug' : 'name';
      return res.status(400).json({ error: { field, message: err.message } });
    }
    throw err;
  }
});

contentTypesRouter.get('/:id', async (req, res) => {
  const contentType = await getContentType(req.params.id);
  if (!contentType) return res.status(404).json({ error: { message: 'Content type not found' } });
  res.json(contentType);
});

contentTypesRouter.patch('/:id', async (req, res) => {
  const updated = await updateContentTypeFields(req.params.id, req.body.fields ?? []);
  if (!updated) return res.status(404).json({ error: { message: 'Content type not found' } });
  res.json(updated);
});

contentTypesRouter.delete('/:id', async (req, res) => {
  const deleted = await deleteContentType(req.params.id);
  if (!deleted) return res.status(404).json({ error: { message: 'Content type not found' } });
  res.status(204).send();
});

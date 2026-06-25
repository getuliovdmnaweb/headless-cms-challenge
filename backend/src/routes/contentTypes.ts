import { Router } from 'express';
import {
  ContentTypeError,
  createContentType,
  deleteContentType,
  getContentType,
  listContentTypes,
  updateContentTypeFields,
} from '../repositories/contentTypes';
import { commitContentTypeChange } from '../repositories/contentTypeEvolution';
import { listEntries } from '../repositories/entries';
import { emit } from '../realtime/bus';
import { classifyImpact } from '../validator/classifyImpact';
import { diffFields, isRiskyChange } from '../validator/diffFields';

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
    emit('contentType:updated', { contentTypeId: created.id });
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
  const current = await getContentType(req.params.id);
  if (!current) return res.status(404).json({ error: { message: 'Content type not found' } });

  const newFields = req.body.fields ?? [];
  const diffs = diffFields(current.fields, newFields);
  if (isRiskyChange(diffs)) {
    return res.status(409).json({
      error: { message: 'This change affects existing entries — use preview-change and commit-change instead.' },
    });
  }

  const updated = await updateContentTypeFields(req.params.id, newFields);
  if (!updated) return res.status(404).json({ error: { message: 'Content type not found' } });
  res.json(updated);
  emit('contentType:updated', { contentTypeId: updated.id });
});

contentTypesRouter.delete('/:id', async (req, res) => {
  const deleted = await deleteContentType(req.params.id);
  if (!deleted) return res.status(404).json({ error: { message: 'Content type not found' } });
  res.status(204).send();
  emit('contentType:deleted', { contentTypeId: req.params.id });
});

contentTypesRouter.post('/:id/preview-change', async (req, res) => {
  const contentType = await getContentType(req.params.id);
  if (!contentType) return res.status(404).json({ error: { message: 'Content type not found' } });

  const newFields = req.body.fields ?? [];
  const diffs = diffFields(contentType.fields, newFields);
  const entries = await listEntries(contentType.id, contentType.fields);
  const impacts = classifyImpact(diffs, entries);

  res.json({ risky: isRiskyChange(diffs), impacts });
});

contentTypesRouter.post('/:id/commit-change', async (req, res) => {
  const newFields = req.body.fields ?? [];
  const backfills = req.body.backfills ?? {};

  const result = await commitContentTypeChange(req.params.id, newFields, backfills);
  if (!result) return res.status(404).json({ error: { message: 'Content type not found' } });

  res.json(result.contentType);
  emit('contentType:updated', { contentTypeId: result.contentType.id });
  for (const entryId of result.migratedEntryIds) {
    emit('entry:updated', { contentTypeId: result.contentType.id, entryId });
  }
});

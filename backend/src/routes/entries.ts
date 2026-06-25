import { Router, type Request } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import { getContentType } from '../repositories/contentTypes';
import { createEntry, deleteEntry, entryExists, getEntry, listEntries, updateEntry } from '../repositories/entries';
import { emit } from '../realtime/bus';
import { validateEntry, type ValidationError } from '../validator/validateEntry';
import type { FieldDefinition } from '../repositories/contentTypes';

interface EntryParams extends ParamsDictionary {
  contentTypeId: string;
  id: string;
}

type EntryRequest = Request<EntryParams>;

export const entriesRouter = Router({ mergeParams: true });

async function validateEntryData(
  fields: FieldDefinition[],
  data: Record<string, unknown>
): Promise<ValidationError[]> {
  const errors = validateEntry(fields, data);

  for (const field of fields) {
    if (field.type !== 'reference' || !field.referenceContentTypeId) continue;
    const value = data[field.name];
    if (value === undefined || value === null || value === '') continue;
    if (!(await entryExists(field.referenceContentTypeId, String(value)))) {
      errors.push({ field: field.name, reason: 'reference' });
    }
  }

  return errors;
}

entriesRouter.get('/', async (req: EntryRequest, res) => {
  const contentType = await getContentType(req.params.contentTypeId);
  if (!contentType) return res.status(404).json({ error: { message: 'Content type not found' } });
  res.json(await listEntries(contentType.id, contentType.fields));
});

entriesRouter.post('/', async (req: EntryRequest, res) => {
  const contentType = await getContentType(req.params.contentTypeId);
  if (!contentType) return res.status(404).json({ error: { message: 'Content type not found' } });

  const errors = await validateEntryData(contentType.fields, req.body.data ?? {});
  if (errors.length > 0) return res.status(400).json({ errors });

  const entry = await createEntry(contentType.id, contentType.version, req.body.data ?? {});
  res.status(201).json(entry);
  emit('entry:created', { contentTypeId: contentType.id, entryId: entry.id });
});

entriesRouter.get('/:id', async (req: EntryRequest, res) => {
  const contentType = await getContentType(req.params.contentTypeId);
  if (!contentType) return res.status(404).json({ error: { message: 'Content type not found' } });

  const entry = await getEntry(contentType.id, req.params.id, contentType.fields);
  if (!entry) return res.status(404).json({ error: { message: 'Entry not found' } });
  res.json(entry);
});

entriesRouter.patch('/:id', async (req: EntryRequest, res) => {
  const contentType = await getContentType(req.params.contentTypeId);
  if (!contentType) return res.status(404).json({ error: { message: 'Content type not found' } });

  const errors = await validateEntryData(contentType.fields, req.body.data ?? {});
  if (errors.length > 0) return res.status(400).json({ errors });

  const entry = await updateEntry(contentType.id, req.params.id, req.body.data ?? {});
  if (!entry) return res.status(404).json({ error: { message: 'Entry not found' } });
  res.json(entry);
  emit('entry:updated', { contentTypeId: contentType.id, entryId: entry.id });
});

entriesRouter.delete('/:id', async (req: EntryRequest, res) => {
  const contentType = await getContentType(req.params.contentTypeId);
  if (!contentType) return res.status(404).json({ error: { message: 'Content type not found' } });

  const deleted = await deleteEntry(contentType.id, req.params.id);
  if (!deleted) return res.status(404).json({ error: { message: 'Entry not found' } });
  res.status(204).send();
  emit('entry:deleted', { contentTypeId: contentType.id, entryId: req.params.id });
});

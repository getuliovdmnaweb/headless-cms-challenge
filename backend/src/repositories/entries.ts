import { pool } from '../db';
import type { FieldDefinition } from './contentTypes';
import { validateEntry, type ValidationError } from '../validator/validateEntry';

export interface Entry {
  id: string;
  contentTypeId: string;
  contentTypeVersion: number;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface EntryWithValidity extends Entry {
  isValid: boolean;
  errors: ValidationError[];
}

function toEntry(row: any): Entry {
  return {
    id: row.id,
    contentTypeId: row.content_type_id,
    contentTypeVersion: row.content_type_version,
    data: row.data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function annotate(entry: Entry, fields: FieldDefinition[]): EntryWithValidity {
  const errors = validateEntry(fields, entry.data);
  return { ...entry, isValid: errors.length === 0, errors };
}

export async function createEntry(
  contentTypeId: string,
  contentTypeVersion: number,
  data: Record<string, unknown>
): Promise<Entry> {
  const result = await pool.query(
    `INSERT INTO entries (content_type_id, content_type_version, data) VALUES ($1, $2, $3)
     RETURNING id, content_type_id, content_type_version, data, created_at, updated_at`,
    [contentTypeId, contentTypeVersion, JSON.stringify(data)]
  );
  return toEntry(result.rows[0]);
}

export async function listEntries(contentTypeId: string, fields: FieldDefinition[]): Promise<EntryWithValidity[]> {
  const result = await pool.query(
    `SELECT id, content_type_id, content_type_version, data, created_at, updated_at
     FROM entries WHERE content_type_id = $1 ORDER BY created_at DESC`,
    [contentTypeId]
  );
  return result.rows.map((row) => annotate(toEntry(row), fields));
}

export async function getEntry(
  contentTypeId: string,
  id: string,
  fields: FieldDefinition[]
): Promise<EntryWithValidity | null> {
  const result = await pool.query(
    `SELECT id, content_type_id, content_type_version, data, created_at, updated_at
     FROM entries WHERE content_type_id = $1 AND id = $2`,
    [contentTypeId, id]
  );
  return result.rows[0] ? annotate(toEntry(result.rows[0]), fields) : null;
}

export async function updateEntry(
  contentTypeId: string,
  id: string,
  data: Record<string, unknown>
): Promise<Entry | null> {
  const result = await pool.query(
    `UPDATE entries SET data = $3, updated_at = now()
     WHERE content_type_id = $1 AND id = $2
     RETURNING id, content_type_id, content_type_version, data, created_at, updated_at`,
    [contentTypeId, id, JSON.stringify(data)]
  );
  return result.rows[0] ? toEntry(result.rows[0]) : null;
}

export async function deleteEntry(contentTypeId: string, id: string): Promise<boolean> {
  const result = await pool.query(`DELETE FROM entries WHERE content_type_id = $1 AND id = $2`, [contentTypeId, id]);
  return (result.rowCount ?? 0) > 0;
}

export async function entryExists(contentTypeId: string, id: string): Promise<boolean> {
  const result = await pool.query(`SELECT 1 FROM entries WHERE content_type_id = $1 AND id = $2`, [contentTypeId, id]);
  return (result.rowCount ?? 0) > 0;
}

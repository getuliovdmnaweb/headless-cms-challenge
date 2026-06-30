import type { PoolClient } from 'pg';
import { pool } from '../db';
import { diffFields } from '../validator/diffFields';
import { migrateEntryData } from '../validator/migrateEntryData';
import type { ContentType, FieldDefinition } from './contentTypes';

export interface CommitResult {
  contentType: ContentType;
  migratedEntryIds: string[];
}

function toContentType(row: any): ContentType {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    version: row.version,
    fields: row.fields,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function commitContentTypeChange(
  contentTypeId: string,
  newFields: FieldDefinition[],
  backfillByFieldId: Record<string, unknown>
): Promise<CommitResult | null> {
  const client: PoolClient = await pool.connect();
  try {
    await client.query('BEGIN');

    const currentResult = await client.query(
      `SELECT id, name, slug, version, fields, created_at, updated_at FROM content_types WHERE id = $1 FOR UPDATE`,
      [contentTypeId]
    );
    if (!currentResult.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }
    const current = toContentType(currentResult.rows[0]);
    const diffs = diffFields(current.fields, newFields);

    const checkEntryExists = async (targetContentTypeId: string, entryId: string): Promise<boolean> => {
      const result = await client.query('SELECT 1 FROM entries WHERE content_type_id = $1 AND id = $2', [
        targetContentTypeId,
        entryId,
      ]);
      return (result.rowCount ?? 0) > 0;
    };

    const updatedResult = await client.query(
      `UPDATE content_types SET fields = $2, version = version + 1, updated_at = now() WHERE id = $1
       RETURNING id, name, slug, version, fields, created_at, updated_at`,
      [contentTypeId, JSON.stringify(newFields)]
    );
    const updated = toContentType(updatedResult.rows[0]);

    const entriesResult = await client.query(`SELECT id, data FROM entries WHERE content_type_id = $1`, [contentTypeId]);

    const migratedEntryIds: string[] = [];
    for (const row of entriesResult.rows) {
      const migratedData = await migrateEntryData(diffs, row.data, backfillByFieldId, checkEntryExists);
      await client.query(`UPDATE entries SET data = $2, content_type_version = $3, updated_at = now() WHERE id = $1`, [
        row.id,
        JSON.stringify(migratedData),
        updated.version,
      ]);
      migratedEntryIds.push(row.id);
    }

    await client.query('COMMIT');
    return { contentType: updated, migratedEntryIds };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

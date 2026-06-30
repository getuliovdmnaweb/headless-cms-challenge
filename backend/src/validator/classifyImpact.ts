import { validateFieldAsync, type EntryExistsChecker } from './validateEntry';
import type { FieldDiff } from './diffFields';

export interface ImpactEntry {
  id: string;
  data: Record<string, unknown>;
}

export interface NeedsAttentionEntry {
  entryId: string;
  currentValue: unknown;
}

export interface FieldImpact {
  fieldId: string;
  fieldName: string;
  changes: FieldDiff['changes'];
  affectedCount: number;
  autoMigratedCount: number;
  needsAttention: NeedsAttentionEntry[];
}

function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === '');
}

export async function classifyImpact(
  diffs: FieldDiff[],
  entries: ImpactEntry[],
  entryExists: EntryExistsChecker
): Promise<FieldImpact[]> {
  const impacts: FieldImpact[] = [];

  for (const diff of diffs) {
    if (diff.changes.length === 0 || diff.changes.includes('added')) continue;

    const readKey = diff.oldField!.name;
    const fieldName = diff.newField?.name ?? diff.oldField!.name;

    if (diff.changes.includes('deleted')) {
      const affectedCount = entries.filter((entry) => isPresent(entry.data[readKey])).length;
      impacts.push({ fieldId: diff.fieldId, fieldName, changes: diff.changes, affectedCount, autoMigratedCount: 0, needsAttention: [] });
      continue;
    }

    const checksValueValidity =
      diff.changes.includes('type-changed') ||
      diff.changes.includes('required-changed') ||
      diff.changes.includes('reference-target-changed');

    if (!checksValueValidity) {
      const affectedCount = entries.filter((entry) => isPresent(entry.data[readKey])).length;
      impacts.push({ fieldId: diff.fieldId, fieldName, changes: diff.changes, affectedCount, autoMigratedCount: affectedCount, needsAttention: [] });
      continue;
    }

    let autoMigratedCount = 0;
    const needsAttention: NeedsAttentionEntry[] = [];
    for (const entry of entries) {
      const value = entry.data[readKey];
      const error = await validateFieldAsync(diff.newField!, value, entryExists);
      if (error) {
        needsAttention.push({ entryId: entry.id, currentValue: value });
      } else {
        autoMigratedCount++;
      }
    }

    impacts.push({
      fieldId: diff.fieldId,
      fieldName,
      changes: diff.changes,
      affectedCount: autoMigratedCount + needsAttention.length,
      autoMigratedCount,
      needsAttention,
    });
  }

  return impacts;
}

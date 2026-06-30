import type { FieldDefinition } from '../repositories/contentTypes';

export type FieldChangeType =
  | 'added'
  | 'deleted'
  | 'renamed'
  | 'type-changed'
  | 'required-changed'
  | 'reference-target-changed';

export interface FieldDiff {
  fieldId: string;
  oldField?: FieldDefinition;
  newField?: FieldDefinition;
  changes: FieldChangeType[];
}

function diffOne(oldField?: FieldDefinition, newField?: FieldDefinition): FieldChangeType[] {
  if (!oldField) return ['added'];
  if (!newField) return ['deleted'];

  const changes: FieldChangeType[] = [];
  if (oldField.name !== newField.name) changes.push('renamed');
  if (oldField.type !== newField.type) changes.push('type-changed');
  if (!oldField.required && newField.required) changes.push('required-changed');
  if (
    oldField.type === 'reference' &&
    newField.type === 'reference' &&
    oldField.referenceContentTypeId !== newField.referenceContentTypeId
  ) {
    changes.push('reference-target-changed');
  }
  return changes;
}

export function diffFields(oldFields: FieldDefinition[], newFields: FieldDefinition[]): FieldDiff[] {
  const newById = new Map(newFields.map((field) => [field.id, field]));
  const oldIds = new Set(oldFields.map((field) => field.id));

  const diffs: FieldDiff[] = oldFields.map((oldField) => {
    const newField = newById.get(oldField.id);
    return { fieldId: oldField.id, oldField, newField, changes: diffOne(oldField, newField) };
  });

  for (const newField of newFields) {
    if (!oldIds.has(newField.id)) {
      diffs.push({ fieldId: newField.id, oldField: undefined, newField, changes: diffOne(undefined, newField) });
    }
  }

  return diffs;
}

export function isRiskyChange(diffs: FieldDiff[]): boolean {
  const riskyChanges: FieldChangeType[] = ['deleted', 'renamed', 'type-changed', 'required-changed', 'reference-target-changed'];
  return diffs.some((diff) => diff.changes.some((change) => riskyChanges.includes(change)));
}

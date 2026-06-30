export type FieldChangeType =
  | 'added'
  | 'deleted'
  | 'renamed'
  | 'type-changed'
  | 'required-changed'
  | 'reference-target-changed'

export interface NeedsAttentionEntry {
  entryId: string
  currentValue: unknown
}

export interface FieldImpact {
  fieldId: string
  fieldName: string
  changes: FieldChangeType[]
  affectedCount: number
  autoMigratedCount: number
  needsAttention: NeedsAttentionEntry[]
}

export interface ChangePreview {
  risky: boolean
  impacts: FieldImpact[]
  baseVersion: number
}

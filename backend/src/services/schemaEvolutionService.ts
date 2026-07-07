import type { FieldInput } from '../types/contentTypes'

export type ChangeKind = 'type_change' | 'field_deleted' | 'required_tightened' | 'required_field_added'

export interface FieldChange {
  kind: ChangeKind
  fieldName: string
  from?: string
  to?: string
}

export interface ImpactPreview {
  changes: FieldChange[]
  totalAffected: number
  unconvertible: number
}

type FieldSpec = { name: string; type: string; required: boolean }

export function diffFields(_current: FieldSpec[], _next: FieldSpec[]): FieldChange[] {
  throw new Error('not implemented')
}

export async function analyzeImpact(_slug: string, _newFields: FieldInput[]): Promise<ImpactPreview> {
  throw new Error('not implemented')
}

export async function commitSchemaChange(
  _slug: string,
  _newFields: FieldInput[],
  _version: number,
  _fallback: Record<string, unknown>
): Promise<unknown> {
  throw new Error('not implemented')
}

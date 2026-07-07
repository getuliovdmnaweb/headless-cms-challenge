import * as ctRepo from '../repositories/contentTypesRepository'
import * as entriesRepo from '../repositories/entriesRepository'
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

export function diffFields(current: FieldSpec[], next: FieldSpec[]): FieldChange[] {
  const currentMap = new Map(current.map(f => [f.name, f]))
  const nextNames = new Set(next.map(f => f.name))
  const changes: FieldChange[] = []

  for (const nextField of next) {
    const existing = currentMap.get(nextField.name)
    if (existing) {
      if (existing.type !== nextField.type) {
        changes.push({ kind: 'type_change', fieldName: nextField.name, from: existing.type, to: nextField.type })
      } else if (!existing.required && nextField.required) {
        changes.push({ kind: 'required_tightened', fieldName: nextField.name })
      }
    } else if (nextField.required) {
      changes.push({ kind: 'required_field_added', fieldName: nextField.name })
    }
  }

  for (const cur of current) {
    if (!nextNames.has(cur.name)) {
      changes.push({ kind: 'field_deleted', fieldName: cur.name })
    }
  }

  return changes
}

function convertValue(
  value: unknown,
  fromType: string,
  toType: string
): { success: boolean; value?: unknown } {
  if (value === null || value === undefined) return { success: true, value }

  if (fromType === 'text' && toType === 'number') {
    const n = Number(value)
    return isNaN(n) ? { success: false } : { success: true, value: n }
  }
  if (fromType === 'number' && toType === 'text') {
    return { success: true, value: String(value) }
  }
  if (fromType === 'boolean' && toType === 'text') {
    return { success: true, value: String(value) }
  }
  if (fromType === 'text' && toType === 'boolean') {
    if (value === 'true') return { success: true, value: true }
    if (value === 'false') return { success: true, value: false }
    return { success: false }
  }
  if (fromType === 'number' && toType === 'boolean') {
    return { success: true, value: Boolean(value) }
  }
  if (fromType === 'boolean' && toType === 'number') {
    return { success: true, value: value ? 1 : 0 }
  }

  return { success: true, value }
}

export async function analyzeImpact(slug: string, newFields: FieldInput[]): Promise<ImpactPreview> {
  const ct = await ctRepo.findBySlugWithFields(slug)
  if (!ct) throw new Error(`Content type not found: ${slug}`)

  const currentFields = ct.fields.map(f => ({ name: f.name, type: f.type, required: f.required }))
  const changes = diffFields(currentFields, newFields)

  const entries = await entriesRepo.listByContentTypeId(ct.id)

  let totalAffected = 0
  let unconvertible = 0

  const currentFieldMap = new Map(ct.fields.map(f => [f.name, f]))

  for (const change of changes) {
    if (change.kind === 'type_change') {
      const fromType = currentFieldMap.get(change.fieldName)?.type ?? ''
      for (const entry of entries) {
        const data = entry.data as Record<string, unknown>
        const val = data[change.fieldName]
        if (val !== undefined && val !== null) {
          totalAffected++
          const result = convertValue(val, fromType, change.to!)
          if (!result.success) unconvertible++
        }
      }
    }

    if (change.kind === 'field_deleted') {
      for (const entry of entries) {
        const data = entry.data as Record<string, unknown>
        if (data[change.fieldName] !== undefined && data[change.fieldName] !== null) {
          totalAffected++
        }
      }
    }

    if (change.kind === 'required_tightened') {
      for (const entry of entries) {
        const data = entry.data as Record<string, unknown>
        const val = data[change.fieldName]
        if (val === undefined || val === null) {
          totalAffected++
        }
      }
    }
  }

  return { changes, totalAffected, unconvertible }
}

export async function commitSchemaChange(
  slug: string,
  newFields: FieldInput[],
  version: number,
  fallback: Record<string, unknown>
): Promise<unknown> {
  const ct = await ctRepo.findBySlugWithFields(slug)
  if (!ct) throw new Error(`Content type not found: ${slug}`)

  const currentFieldMap = new Map(ct.fields.map(f => [f.name, f]))
  const newFieldNames = new Set(newFields.map(f => f.name))
  const changes = diffFields(
    ct.fields.map(f => ({ name: f.name, type: f.type, required: f.required })),
    newFields
  )

  const entries = await entriesRepo.listByContentTypeId(ct.id)

  const entryUpdates: Array<{ id: number; data: Record<string, unknown> }> = []

  for (const entry of entries) {
    const original = entry.data as Record<string, unknown>
    const migrated: Record<string, unknown> = {}
    let changed = false

    for (const fieldName of Object.keys(original)) {
      if (!newFieldNames.has(fieldName)) {
        changed = true
        continue
      }
      migrated[fieldName] = original[fieldName]
    }

    for (const change of changes) {
      if (change.kind === 'type_change') {
        const curField = currentFieldMap.get(change.fieldName)
        if (!curField) continue
        const raw = original[change.fieldName]
        if (raw === undefined || raw === null) {
          migrated[change.fieldName] = raw
          continue
        }
        const result = convertValue(raw, curField.type, change.to!)
        if (result.success) {
          migrated[change.fieldName] = result.value
        } else if (Object.prototype.hasOwnProperty.call(fallback, change.fieldName)) {
          migrated[change.fieldName] = fallback[change.fieldName]
        } else {
          migrated[change.fieldName] = null
        }
        changed = true
      }
    }

    if (changed) {
      entryUpdates.push({ id: entry.id, data: migrated })
    }
  }

  return ctRepo.commitSchemaEvolution(slug, { name: ct.name, fields: newFields }, version, entryUpdates)
}

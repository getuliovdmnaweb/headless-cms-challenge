export type FieldType = 'text' | 'number' | 'boolean' | 'date' | 'reference'

export interface FieldDefinition {
  id: string
  name: string
  type: FieldType
  required: boolean
  referenceContentTypeId?: string
}

export interface ContentType {
  id: string
  name: string
  slug: string
  version: number
  fields: FieldDefinition[]
  createdAt: string
  updatedAt: string
}

export interface ContentTypeSummary extends ContentType {
  fieldCount: number
  entryCount: number
}

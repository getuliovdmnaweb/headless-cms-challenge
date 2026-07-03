export type FieldType = 'text' | 'number' | 'boolean' | 'date' | 'reference'

export interface FieldInput {
  name: string
  type: FieldType
  required: boolean
  position: number
}

export interface Field extends FieldInput {
  id: number
  content_type_id: number
}

export interface ContentType {
  id: number
  name: string
  slug: string
  version: number
  fields: Field[]
}

export interface ContentTypeSummary {
  id: number
  name: string
  slug: string
  version: number
  fieldCount: number
}

export interface ValidationError {
  field: string
  reason: 'required' | 'type' | 'reference'
}

export interface Entry {
  id: string
  contentTypeId: string
  contentTypeVersion: number
  data: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface EntryWithValidity extends Entry {
  isValid: boolean
  errors: ValidationError[]
}

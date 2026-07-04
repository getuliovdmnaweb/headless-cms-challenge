export type EntryDataValue = string | number | boolean | null
export interface EntryData { [fieldName: string]: EntryDataValue }

export interface EntrySummary {
  id: number
  data: EntryData
  isValid: boolean
}

export interface EntryListResponse {
  contentType: {
    id: number
    name: string
    slug: string
    version: number
    fields: Array<{ id: number; name: string; type: string; required: boolean; position: number }>
  }
  entries: EntrySummary[]
}

import * as ctRepo from '../repositories/contentTypesRepository'
import * as entriesRepo from '../repositories/entriesRepository'
import { diffFields, analyzeImpact, commitSchemaChange } from './schemaEvolutionService'

jest.mock('../repositories/contentTypesRepository')
jest.mock('../repositories/entriesRepository')

const mockFindBySlugWithFields = jest.mocked(ctRepo.findBySlugWithFields)
const mockCommitSchemaEvolution = jest.mocked(ctRepo.commitSchemaEvolution)
const mockListByContentTypeId = jest.mocked(entriesRepo.listByContentTypeId)

const makeField = (id: number, name: string, type: string, required: boolean, position = 0) => ({
  id, contentTypeId: 1, name, type, required, position,
  options: {}, createdAt: new Date(), updatedAt: new Date(),
})

const fakeCt = (version = 1, fields: ReturnType<typeof makeField>[] = []) => ({
  id: 1, name: 'Car', slug: 'car', version, createdAt: new Date(), updatedAt: new Date(), fields,
})

const makeEntry = (id: number, data: Record<string, unknown>) => ({
  id, contentTypeId: 1, data: data as any, createdAt: new Date(), updatedAt: new Date(),
})

beforeEach(() => jest.clearAllMocks())

// ─── diffFields ───────────────────────────────────────────────────────────────

describe('diffFields', () => {
  it('returns empty array when nothing changes', () => {
    const f = [{ name: 'Brand', type: 'text', required: true }]
    expect(diffFields(f, f)).toEqual([])
  })

  it('detects a type change', () => {
    const current = [{ name: 'Year', type: 'text', required: false }]
    const next    = [{ name: 'Year', type: 'number', required: false }]
    expect(diffFields(current, next)).toEqual([
      { kind: 'type_change', fieldName: 'Year', from: 'text', to: 'number' },
    ])
  })

  it('detects a field deletion', () => {
    const current = [{ name: 'Brand', type: 'text', required: true }]
    expect(diffFields(current, [])).toEqual([
      { kind: 'field_deleted', fieldName: 'Brand' },
    ])
  })

  it('detects optional → required tightening on an existing field', () => {
    const current = [{ name: 'Year', type: 'number', required: false }]
    const next    = [{ name: 'Year', type: 'number', required: true }]
    expect(diffFields(current, next)).toEqual([
      { kind: 'required_tightened', fieldName: 'Year' },
    ])
  })

  it('detects a new required field as risky', () => {
    const current = [{ name: 'Brand', type: 'text', required: true }]
    const next    = [
      { name: 'Brand', type: 'text', required: true },
      { name: 'Model', type: 'text', required: true },
    ]
    expect(diffFields(current, next)).toEqual([
      { kind: 'required_field_added', fieldName: 'Model' },
    ])
  })

  it('does not flag required → optional as risky', () => {
    const current = [{ name: 'Year', type: 'number', required: true }]
    const next    = [{ name: 'Year', type: 'number', required: false }]
    expect(diffFields(current, next)).toEqual([])
  })

  it('does not flag a new optional field as risky', () => {
    const current = [{ name: 'Brand', type: 'text', required: true }]
    const next    = [
      { name: 'Brand', type: 'text', required: true },
      { name: 'Color', type: 'text', required: false },
    ]
    expect(diffFields(current, next)).toEqual([])
  })

  it('does not flag a rename (disappear + appear) as a type change', () => {
    const current = [{ name: 'Brand', type: 'text', required: true }]
    const next    = [{ name: 'Make', type: 'text', required: true }]
    const changes = diffFields(current, next)
    expect(changes.find(c => c.kind === 'type_change')).toBeUndefined()
    expect(changes.find(c => c.kind === 'field_deleted')).toEqual(
      expect.objectContaining({ fieldName: 'Brand' })
    )
  })
})

// ─── analyzeImpact ────────────────────────────────────────────────────────────

describe('analyzeImpact', () => {
  it('returns zero counts when there are no risky changes', async () => {
    mockFindBySlugWithFields.mockResolvedValue(
      fakeCt(1, [makeField(1, 'Brand', 'text', true)])
    )
    mockListByContentTypeId.mockResolvedValue([makeEntry(1, { Brand: 'Toyota' })])

    const result = await analyzeImpact('car', [
      { name: 'Brand', type: 'text', required: true, position: 0 },
    ])

    expect(result.changes).toEqual([])
    expect(result.totalAffected).toBe(0)
    expect(result.unconvertible).toBe(0)
  })

  it('counts affected and unconvertible entries for a type change', async () => {
    mockFindBySlugWithFields.mockResolvedValue(
      fakeCt(1, [makeField(1, 'Year', 'text', false)])
    )
    mockListByContentTypeId.mockResolvedValue([
      makeEntry(1, { Year: '2020' }),   // convertible
      makeEntry(2, { Year: 'abc' }),    // unconvertible
      makeEntry(3, {}),                 // no value — not affected
    ])

    const result = await analyzeImpact('car', [
      { name: 'Year', type: 'number', required: false, position: 0 },
    ])

    expect(result.changes).toEqual([
      { kind: 'type_change', fieldName: 'Year', from: 'text', to: 'number' },
    ])
    expect(result.totalAffected).toBe(2)
    expect(result.unconvertible).toBe(1)
  })

  it('counts entries that have the deleted field as affected', async () => {
    mockFindBySlugWithFields.mockResolvedValue(
      fakeCt(1, [makeField(1, 'Brand', 'text', true)])
    )
    mockListByContentTypeId.mockResolvedValue([
      makeEntry(1, { Brand: 'Toyota' }),
      makeEntry(2, {}),
    ])

    const result = await analyzeImpact('car', [])

    expect(result.changes).toEqual([{ kind: 'field_deleted', fieldName: 'Brand' }])
    expect(result.totalAffected).toBe(1)
    expect(result.unconvertible).toBe(0)
  })

  it('counts entries missing the required-tightened field as affected', async () => {
    mockFindBySlugWithFields.mockResolvedValue(
      fakeCt(1, [makeField(1, 'Year', 'number', false)])
    )
    mockListByContentTypeId.mockResolvedValue([
      makeEntry(1, { Year: 2020 }),
      makeEntry(2, {}),
    ])

    const result = await analyzeImpact('car', [
      { name: 'Year', type: 'number', required: true, position: 0 },
    ])

    expect(result.changes).toEqual([{ kind: 'required_tightened', fieldName: 'Year' }])
    expect(result.totalAffected).toBe(1)
    expect(result.unconvertible).toBe(0)
  })
})

// ─── commitSchemaChange ───────────────────────────────────────────────────────

describe('commitSchemaChange', () => {
  it('propagates Conflict error from repo when version is stale', async () => {
    mockFindBySlugWithFields.mockResolvedValue(fakeCt(3, []))
    mockListByContentTypeId.mockResolvedValue([])
    mockCommitSchemaEvolution.mockRejectedValue(new Error('Conflict'))

    await expect(
      commitSchemaChange('car', [], 1, {})
    ).rejects.toThrow('Conflict')
  })

  it('converts text → number for convertible entries', async () => {
    mockFindBySlugWithFields.mockResolvedValue(
      fakeCt(1, [makeField(1, 'Year', 'text', false)])
    )
    mockListByContentTypeId.mockResolvedValue([makeEntry(1, { Year: '2020' })])
    mockCommitSchemaEvolution.mockResolvedValue(fakeCt(2, [makeField(1, 'Year', 'number', false)]))

    await commitSchemaChange(
      'car', [{ name: 'Year', type: 'number', required: false, position: 0 }], 1, {}
    )

    expect(mockCommitSchemaEvolution).toHaveBeenCalledWith(
      'car',
      expect.anything(),
      1,
      [{ id: 1, data: { Year: 2020 } }]
    )
  })

  it('uses fallback value when conversion fails', async () => {
    mockFindBySlugWithFields.mockResolvedValue(
      fakeCt(1, [makeField(1, 'Year', 'text', false)])
    )
    mockListByContentTypeId.mockResolvedValue([makeEntry(1, { Year: 'not-a-number' })])
    mockCommitSchemaEvolution.mockResolvedValue(fakeCt(2, [makeField(1, 'Year', 'number', false)]))

    await commitSchemaChange(
      'car', [{ name: 'Year', type: 'number', required: false, position: 0 }], 1, { Year: 0 }
    )

    expect(mockCommitSchemaEvolution).toHaveBeenCalledWith(
      'car',
      expect.anything(),
      1,
      [{ id: 1, data: { Year: 0 } }]
    )
  })

  it('nulls out field when conversion fails and no fallback provided', async () => {
    mockFindBySlugWithFields.mockResolvedValue(
      fakeCt(1, [makeField(1, 'Year', 'text', false)])
    )
    mockListByContentTypeId.mockResolvedValue([makeEntry(1, { Year: 'not-a-number' })])
    mockCommitSchemaEvolution.mockResolvedValue(fakeCt(2, [makeField(1, 'Year', 'number', false)]))

    await commitSchemaChange(
      'car', [{ name: 'Year', type: 'number', required: false, position: 0 }], 1, {}
    )

    expect(mockCommitSchemaEvolution).toHaveBeenCalledWith(
      'car',
      expect.anything(),
      1,
      [{ id: 1, data: { Year: null } }]
    )
  })

  it('removes deleted field from entry data', async () => {
    mockFindBySlugWithFields.mockResolvedValue(
      fakeCt(1, [makeField(1, 'Brand', 'text', true, 0), makeField(2, 'Year', 'number', false, 1)])
    )
    mockListByContentTypeId.mockResolvedValue([
      makeEntry(1, { Brand: 'Toyota', Year: 2020 }),
    ])
    mockCommitSchemaEvolution.mockResolvedValue(fakeCt(2, [makeField(1, 'Brand', 'text', true)]))

    await commitSchemaChange(
      'car', [{ name: 'Brand', type: 'text', required: true, position: 0 }], 1, {}
    )

    expect(mockCommitSchemaEvolution).toHaveBeenCalledWith(
      'car',
      expect.anything(),
      1,
      [{ id: 1, data: { Brand: 'Toyota' } }]
    )
  })

  it('does not include entries with no data changes in the update list', async () => {
    mockFindBySlugWithFields.mockResolvedValue(
      fakeCt(1, [makeField(1, 'Brand', 'text', true)])
    )
    mockListByContentTypeId.mockResolvedValue([makeEntry(1, { Brand: 'Toyota' })])
    mockCommitSchemaEvolution.mockResolvedValue(fakeCt(2, [makeField(1, 'Brand', 'text', true)]))

    await commitSchemaChange(
      'car', [{ name: 'Brand', type: 'text', required: true, position: 0 }], 1, {}
    )

    expect(mockCommitSchemaEvolution).toHaveBeenCalledWith('car', expect.anything(), 1, [])
  })

  it('converts number → text (always succeeds)', async () => {
    mockFindBySlugWithFields.mockResolvedValue(
      fakeCt(1, [makeField(1, 'Year', 'number', false)])
    )
    mockListByContentTypeId.mockResolvedValue([makeEntry(1, { Year: 2020 })])
    mockCommitSchemaEvolution.mockResolvedValue(fakeCt(2, [makeField(1, 'Year', 'text', false)]))

    await commitSchemaChange(
      'car', [{ name: 'Year', type: 'text', required: false, position: 0 }], 1, {}
    )

    expect(mockCommitSchemaEvolution).toHaveBeenCalledWith(
      'car', expect.anything(), 1, [{ id: 1, data: { Year: '2020' } }]
    )
  })
})

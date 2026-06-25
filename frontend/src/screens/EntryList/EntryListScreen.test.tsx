import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import * as contentTypesService from '../../services/contentTypes'
import * as entriesService from '../../services/entries'
import EntryListScreen from './EntryListScreen'

vi.mock('../../services/contentTypes')
vi.mock('../../services/entries')

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/content-types/ct1/entries']}>
        <Routes>
          <Route path="/content-types/:contentTypeId/entries" element={<EntryListScreen />} />
          <Route path="/content-types/:contentTypeId/entries/new" element={<div>New entry screen</div>} />
          <Route path="/content-types/:contentTypeId/entries/:entryId" element={<div>Edit entry screen</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.mocked(contentTypesService.getContentType).mockResolvedValue({
    id: 'ct1',
    name: 'Car',
    slug: 'car',
    version: 1,
    fields: [
      { id: 'f1', name: 'brand', type: 'text', required: true },
      { id: 'f2', name: 'year', type: 'number', required: false },
    ],
    createdAt: '',
    updatedAt: '',
  })
})

afterEach(() => vi.clearAllMocks())

describe('EntryListScreen', () => {
  it('renders columns derived from the content type fields with a validity badge', async () => {
    vi.mocked(entriesService.getEntries).mockResolvedValue([
      {
        id: 'e1', contentTypeId: 'ct1', contentTypeVersion: 1,
        data: { brand: 'Toyota', year: 2022 }, isValid: true, errors: [], createdAt: '', updatedAt: '',
      },
      {
        id: 'e2', contentTypeId: 'ct1', contentTypeVersion: 1,
        data: { year: 2019 }, isValid: false, errors: [{ field: 'brand', reason: 'required' }], createdAt: '', updatedAt: '',
      },
    ])

    renderScreen()

    expect(await screen.findByText('Toyota')).toBeInTheDocument()
    expect(screen.getByText('2022')).toBeInTheDocument()
    expect(screen.getByText('Valid')).toBeInTheDocument()
    expect(screen.getByText('Needs attention')).toBeInTheDocument()
  })

  it('navigates to the new entry screen', async () => {
    vi.mocked(entriesService.getEntries).mockResolvedValue([])
    renderScreen()

    fireEvent.click(await screen.findByRole('button', { name: 'New entry' }))

    await waitFor(() => expect(screen.getByText('New entry screen')).toBeInTheDocument())
  })

  it('navigates to the edit screen for an entry', async () => {
    vi.mocked(entriesService.getEntries).mockResolvedValue([
      { id: 'e1', contentTypeId: 'ct1', contentTypeVersion: 1, data: { brand: 'Toyota' }, isValid: true, errors: [], createdAt: '', updatedAt: '' },
    ])
    renderScreen()

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))

    await waitFor(() => expect(screen.getByText('Edit entry screen')).toBeInTheDocument())
  })

  it('renders a reference field as the label of the referenced entry, not its raw id', async () => {
    vi.mocked(contentTypesService.getContentType).mockResolvedValue({
      id: 'ct1',
      name: 'Car',
      slug: 'car',
      version: 1,
      fields: [{ id: 'f1', name: 'owner', type: 'reference', required: false, referenceContentTypeId: 'person' }],
      createdAt: '',
      updatedAt: '',
    })
    vi.mocked(entriesService.getEntries).mockImplementation((contentTypeId: string) =>
      Promise.resolve(
        contentTypeId === 'ct1'
          ? [{ id: 'e1', contentTypeId: 'ct1', contentTypeVersion: 1, data: { owner: 'p1' }, isValid: true, errors: [], createdAt: '', updatedAt: '' }]
          : [{ id: 'p1', contentTypeId: 'person', contentTypeVersion: 1, data: { name: 'Jane Doe' }, isValid: true, errors: [], createdAt: '', updatedAt: '' }]
      )
    )

    renderScreen()

    expect(await screen.findByText('Jane Doe')).toBeInTheDocument()
    expect(screen.queryByText('p1')).not.toBeInTheDocument()
  })

  it('deletes an entry', async () => {
    vi.mocked(entriesService.getEntries).mockResolvedValue([
      { id: 'e1', contentTypeId: 'ct1', contentTypeVersion: 1, data: { brand: 'Toyota' }, isValid: true, errors: [], createdAt: '', updatedAt: '' },
    ])
    vi.mocked(entriesService.deleteEntry).mockResolvedValue(undefined)
    renderScreen()

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(entriesService.deleteEntry).toHaveBeenCalledWith('ct1', 'e1'))
  })
})

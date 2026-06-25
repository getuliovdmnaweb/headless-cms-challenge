import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ApiError } from '../../services/apiClient'
import * as contentTypesService from '../../services/contentTypes'
import * as entriesService from '../../services/entries'
import EntryEditorScreen from './EntryEditorScreen'

vi.mock('../../services/contentTypes')
vi.mock('../../services/entries')

function renderScreen(initialPath: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/content-types/:contentTypeId/entries/new" element={<EntryEditorScreen />} />
          <Route path="/content-types/:contentTypeId/entries/:entryId" element={<EntryEditorScreen />} />
          <Route path="/content-types/:contentTypeId/entries" element={<div>Entry list screen</div>} />
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
      { id: 'f2', name: 'available', type: 'boolean', required: false },
    ],
    createdAt: '',
    updatedAt: '',
  })
  vi.mocked(entriesService.getEntries).mockResolvedValue([])
})

afterEach(() => vi.clearAllMocks())

describe('EntryEditorScreen — create mode', () => {
  it('creates an entry from the generated form and navigates to the list', async () => {
    vi.mocked(entriesService.createEntry).mockResolvedValue({
      id: 'e1', contentTypeId: 'ct1', contentTypeVersion: 1, data: {}, createdAt: '', updatedAt: '',
    })
    renderScreen('/content-types/ct1/entries/new')

    fireEvent.change(await screen.findByPlaceholderText('brand'), { target: { value: 'Toyota' } })
    fireEvent.click(screen.getByLabelText('available'))
    fireEvent.click(screen.getByRole('button', { name: 'Create entry' }))

    await waitFor(() =>
      expect(entriesService.createEntry).toHaveBeenCalledWith('ct1', { brand: 'Toyota', available: true })
    )
    await waitFor(() => expect(screen.getByText('Entry list screen')).toBeInTheDocument())
  })

  it('shows field-level errors from the server', async () => {
    vi.mocked(entriesService.createEntry).mockRejectedValue(
      new ApiError(400, { errors: [{ field: 'brand', reason: 'required' }] })
    )
    renderScreen('/content-types/ct1/entries/new')

    fireEvent.click(await screen.findByRole('button', { name: 'Create entry' }))

    expect(await screen.findByText('This field is required.')).toBeInTheDocument()
  })
})

describe('EntryEditorScreen — edit mode', () => {
  it('pre-fills the form from the existing entry and saves changes', async () => {
    vi.mocked(entriesService.getEntry).mockResolvedValue({
      id: 'e1', contentTypeId: 'ct1', contentTypeVersion: 1,
      data: { brand: 'Toyota', available: true }, isValid: true, errors: [], createdAt: '', updatedAt: '',
    })
    vi.mocked(entriesService.updateEntry).mockResolvedValue({
      id: 'e1', contentTypeId: 'ct1', contentTypeVersion: 1, data: {}, createdAt: '', updatedAt: '',
    })

    renderScreen('/content-types/ct1/entries/e1')

    await waitFor(() => expect(screen.getByPlaceholderText('brand')).toHaveValue('Toyota'))

    fireEvent.click(screen.getByRole('button', { name: 'Save entry' }))

    await waitFor(() =>
      expect(entriesService.updateEntry).toHaveBeenCalledWith('ct1', 'e1', { brand: 'Toyota', available: true })
    )
  })
})

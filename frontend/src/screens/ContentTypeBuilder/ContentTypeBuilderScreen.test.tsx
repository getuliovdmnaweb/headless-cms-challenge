import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ApiError } from '../../services/apiClient'
import * as contentTypesService from '../../services/contentTypes'
import ContentTypeBuilderScreen from './ContentTypeBuilderScreen'

vi.mock('../../services/contentTypes')

function renderScreen(initialPath: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/content-types/new" element={<ContentTypeBuilderScreen />} />
          <Route path="/content-types/:id/edit" element={<ContentTypeBuilderScreen />} />
          <Route path="/" element={<div>Content type list screen</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.mocked(contentTypesService.getContentTypes).mockResolvedValue([])
})

afterEach(() => vi.clearAllMocks())

describe('ContentTypeBuilderScreen — create mode', () => {
  it('auto-derives the slug from the name', async () => {
    renderScreen('/content-types/new')

    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Podcast episode' } })

    expect(screen.getByPlaceholderText('Slug')).toHaveValue('podcast-episode')
  })

  it('adds and removes fields', async () => {
    renderScreen('/content-types/new')

    fireEvent.click(screen.getByRole('button', { name: 'Add field' }))
    expect(screen.getAllByPlaceholderText('Field name')).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(screen.queryAllByPlaceholderText('Field name')).toHaveLength(0)
  })

  it('creates a content type and navigates to the list', async () => {
    vi.mocked(contentTypesService.createContentType).mockResolvedValue({
      id: '1', name: 'Car', slug: 'car', version: 1, fields: [], createdAt: '', updatedAt: '',
    })
    renderScreen('/content-types/new')

    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Car' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create content type' }))

    await waitFor(() =>
      expect(contentTypesService.createContentType).toHaveBeenCalledWith({ name: 'Car', slug: 'car', fields: [] })
    )
    await waitFor(() => expect(screen.getByText('Content type list screen')).toBeInTheDocument())
  })

  it('shows a field-level error from the server', async () => {
    vi.mocked(contentTypesService.createContentType).mockRejectedValue(
      new ApiError(400, { error: { field: 'name', message: 'Name is required' } })
    )
    renderScreen('/content-types/new')

    fireEvent.click(screen.getByRole('button', { name: 'Create content type' }))

    expect(await screen.findByText('Name is required')).toBeInTheDocument()
  })
})

describe('ContentTypeBuilderScreen — edit mode', () => {
  beforeEach(() => {
    vi.mocked(contentTypesService.getContentType).mockResolvedValue({
      id: '1',
      name: 'Car',
      slug: 'car',
      version: 1,
      fields: [{ id: 'f1', name: 'brand', type: 'text', required: true }],
      createdAt: '',
      updatedAt: '',
    })
  })

  it('pre-fills the form from the existing content type', async () => {
    renderScreen('/content-types/1/edit')

    await waitFor(() => expect(screen.getByPlaceholderText('Name')).toHaveValue('Car'))
    expect(screen.getByPlaceholderText('Field name')).toHaveValue('brand')
  })

  it('commits a non-risky change directly without showing the preview', async () => {
    vi.mocked(contentTypesService.previewContentTypeChange).mockResolvedValue({ risky: false, impacts: [] })
    vi.mocked(contentTypesService.commitContentTypeChange).mockResolvedValue({
      id: '1', name: 'Car', slug: 'car', version: 2, fields: [], createdAt: '', updatedAt: '',
    })

    renderScreen('/content-types/1/edit')
    await waitFor(() => expect(screen.getByPlaceholderText('Name')).toHaveValue('Car'))

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(contentTypesService.commitContentTypeChange).toHaveBeenCalledWith(
        '1',
        [{ id: 'f1', name: 'brand', type: 'text', required: true }],
        {}
      )
    )
    expect(screen.queryByText('Review content type change')).not.toBeInTheDocument()
  })

  it('shows the change preview for a risky change and commits with the chosen backfills on confirm', async () => {
    vi.mocked(contentTypesService.previewContentTypeChange).mockResolvedValue({
      risky: true,
      impacts: [
        {
          fieldId: 'f1',
          fieldName: 'brand',
          changes: ['required-changed'],
          affectedCount: 1,
          autoMigratedCount: 0,
          needsAttention: [{ entryId: 'e1', currentValue: undefined }],
        },
      ],
    })
    vi.mocked(contentTypesService.commitContentTypeChange).mockResolvedValue({
      id: '1', name: 'Car', slug: 'car', version: 2, fields: [], createdAt: '', updatedAt: '',
    })

    renderScreen('/content-types/1/edit')
    await waitFor(() => expect(screen.getByPlaceholderText('Name')).toHaveValue('Car'))

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Review content type change')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Backfill value'), { target: { value: 'Unknown' } })
    fireEvent.click(screen.getByRole('button', { name: 'Commit changes' }))

    await waitFor(() =>
      expect(contentTypesService.commitContentTypeChange).toHaveBeenCalledWith(
        '1',
        [{ id: 'f1', name: 'brand', type: 'text', required: true }],
        { f1: 'Unknown' }
      )
    )
    await waitFor(() => expect(screen.getByText('Content type list screen')).toBeInTheDocument())
  })

  it('leaves the content type untouched when the preview is cancelled', async () => {
    vi.mocked(contentTypesService.previewContentTypeChange).mockResolvedValue({
      risky: true,
      impacts: [
        { fieldId: 'f1', fieldName: 'brand', changes: ['required-changed'], affectedCount: 1, autoMigratedCount: 0, needsAttention: [{ entryId: 'e1', currentValue: undefined }] },
      ],
    })

    renderScreen('/content-types/1/edit')
    await waitFor(() => expect(screen.getByPlaceholderText('Name')).toHaveValue('Car'))

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    const heading = await screen.findByText('Review content type change')

    fireEvent.click(within(heading.closest('div')!.parentElement!).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByText('Review content type change')).not.toBeInTheDocument()
    expect(contentTypesService.commitContentTypeChange).not.toHaveBeenCalled()
  })
})

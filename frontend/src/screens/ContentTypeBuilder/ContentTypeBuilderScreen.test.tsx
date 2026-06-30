import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ApiError } from '../../services/apiClient'
import * as contentTypesService from '../../services/contentTypes'
import ContentTypeBuilderScreen from './ContentTypeBuilderScreen'

vi.mock('../../services/contentTypes')

function renderScreen(initialPath: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const utils = render(
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
  return { ...utils, queryClient }
}

beforeEach(() => {
  vi.mocked(contentTypesService.getContentTypes).mockResolvedValue([])
})

afterEach(() => vi.resetAllMocks())

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
    vi.mocked(contentTypesService.previewContentTypeChange).mockResolvedValue({ risky: false, impacts: [], baseVersion: 1, currentFields: [] })
    vi.mocked(contentTypesService.commitContentTypeChange).mockResolvedValue({
      id: '1', name: 'Car', slug: 'car', version: 2, fields: [], createdAt: '', updatedAt: '',
    })

    renderScreen('/content-types/1/edit')
    await waitFor(() => expect(screen.getByPlaceholderText('Name')).toHaveValue('Car'))

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(contentTypesService.commitContentTypeChange).toHaveBeenCalledWith(
        '1',
        1,
        [{ id: 'f1', name: 'brand', type: 'text', required: true }],
        {}
      )
    )
    expect(screen.queryByText('Review content type change')).not.toBeInTheDocument()
  })

  it('shows the change preview for a risky change and commits with the chosen backfills on confirm', async () => {
    vi.mocked(contentTypesService.previewContentTypeChange).mockResolvedValue({
      risky: true,
      baseVersion: 1,
      currentFields: [{ id: 'f1', name: 'brand', type: 'text', required: true }],
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
        1,
        [{ id: 'f1', name: 'brand', type: 'text', required: true }],
        { f1: 'Unknown' }
      )
    )
    await waitFor(() => expect(screen.getByText('Content type list screen')).toBeInTheDocument())
  })

  it('leaves the content type untouched when the preview is cancelled', async () => {
    vi.mocked(contentTypesService.previewContentTypeChange).mockResolvedValue({
      risky: true,
      baseVersion: 1,
      currentFields: [{ id: 'f1', name: 'brand', type: 'text', required: true }],
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

  describe('mid-edit schema shift', () => {
    it('shows a conflict message instead of navigating away when commit reports a version conflict', async () => {
      vi.mocked(contentTypesService.previewContentTypeChange).mockResolvedValue({ risky: false, impacts: [], baseVersion: 1, currentFields: [] })
      vi.mocked(contentTypesService.commitContentTypeChange).mockRejectedValue(
        new ApiError(409, {
          error: {
            message: 'This content type changed since you started editing.',
            currentVersion: 2,
            currentFields: [{ id: 'f1', name: 'make', type: 'text', required: true }],
          },
        })
      )

      renderScreen('/content-types/1/edit')
      await waitFor(() => expect(screen.getByPlaceholderText('Name')).toHaveValue('Car'))

      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

      expect(await screen.findByText(/changed since you started editing/i)).toBeInTheDocument()
      expect(screen.queryByText('Content type list screen')).not.toBeInTheDocument()
    })

    it('reloads the latest fields when the user confirms after a conflict', async () => {
      vi.mocked(contentTypesService.previewContentTypeChange).mockResolvedValue({ risky: false, impacts: [], baseVersion: 1, currentFields: [] })
      vi.mocked(contentTypesService.commitContentTypeChange).mockRejectedValue(
        new ApiError(409, {
          error: {
            message: 'This content type changed since you started editing.',
            currentVersion: 2,
            currentFields: [{ id: 'f1', name: 'make', type: 'text', required: true }],
          },
        })
      )

      renderScreen('/content-types/1/edit')
      await waitFor(() => expect(screen.getByPlaceholderText('Name')).toHaveValue('Car'))

      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
      await screen.findByText(/changed since you started editing/i)

      vi.mocked(contentTypesService.getContentType).mockResolvedValue({
        id: '1',
        name: 'Car',
        slug: 'car',
        version: 2,
        fields: [{ id: 'f1', name: 'make', type: 'text', required: true }],
        createdAt: '',
        updatedAt: '',
      })
      fireEvent.click(screen.getByRole('button', { name: 'Reload latest version' }))

      await waitFor(() => expect(screen.getByPlaceholderText('Field name')).toHaveValue('make'))
      expect(screen.queryByText(/changed since you started editing/i)).not.toBeInTheDocument()
    })

    it('reloads the latest fields even when realtime sync already wrote that exact data into the cache before the reload', async () => {
      // Reproduces a real bug: if a background refetch (e.g. realtime invalidation) already
      // populated the query cache with the latest data before the user clicks "Reload latest
      // version", TanStack Query's structural sharing keeps the same `data` object reference
      // when the explicit refetch resolves with value-identical data — so an effect keyed on
      // `[existing]` never re-fires and the form stays stuck on the old local edit.
      vi.mocked(contentTypesService.previewContentTypeChange).mockResolvedValue({ risky: false, impacts: [], baseVersion: 1, currentFields: [] })
      vi.mocked(contentTypesService.commitContentTypeChange).mockRejectedValue(
        new ApiError(409, {
          error: {
            message: 'This content type changed since you started editing.',
            currentVersion: 2,
            currentFields: [{ id: 'f1', name: 'make', type: 'text', required: true }],
          },
        })
      )

      const { queryClient } = renderScreen('/content-types/1/edit')
      await waitFor(() => expect(screen.getByPlaceholderText('Name')).toHaveValue('Car'))

      // Simulate realtime sync already having refreshed the cache with the latest server state
      // before the user ever clicks save.
      queryClient.setQueryData(['contentTypes', '1'], {
        id: '1',
        name: 'Car',
        slug: 'car',
        version: 2,
        fields: [{ id: 'f1', name: 'make', type: 'text', required: true }],
        createdAt: '',
        updatedAt: '',
      })

      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
      await screen.findByText(/changed since you started editing/i)

      // The explicit reload's refetch resolves with data that is value-identical to what's
      // already cached above — this is what triggers structural sharing to preserve the old
      // object reference.
      vi.mocked(contentTypesService.getContentType).mockResolvedValue({
        id: '1',
        name: 'Car',
        slug: 'car',
        version: 2,
        fields: [{ id: 'f1', name: 'make', type: 'text', required: true }],
        createdAt: '',
        updatedAt: '',
      })
      fireEvent.click(screen.getByRole('button', { name: 'Reload latest version' }))

      await waitFor(() => expect(screen.getByPlaceholderText('Field name')).toHaveValue('make'))
      expect(screen.queryByText(/changed since you started editing/i)).not.toBeInTheDocument()
    })

    it('detects a conflict from the preview response itself, before ever showing an impact preview based on stale fields', async () => {
      // The content type was at version 1 when this screen loaded (see outer beforeEach), but by the
      // time preview-change runs, someone else has already moved it to version 2 — preview-change always
      // reflects the live current state, so it comes back as baseVersion 2 with the new current fields.
      vi.mocked(contentTypesService.previewContentTypeChange).mockResolvedValue({
        risky: false,
        impacts: [],
        baseVersion: 2,
        currentFields: [{ id: 'f1', name: 'brand', type: 'text', required: true }],
      })

      renderScreen('/content-types/1/edit')
      await waitFor(() => expect(screen.getByPlaceholderText('Name')).toHaveValue('Car'))

      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

      expect(await screen.findByText(/changed since you started editing/i)).toBeInTheDocument()
      expect(screen.queryByText('Review content type change')).not.toBeInTheDocument()
      expect(contentTypesService.commitContentTypeChange).not.toHaveBeenCalled()
    })

    it('does not let a background refetch (e.g. from realtime sync) silently overwrite an in-progress edit or hide a real conflict', async () => {
      vi.mocked(contentTypesService.previewContentTypeChange).mockResolvedValue({
        risky: false,
        impacts: [],
        baseVersion: 2,
        currentFields: [{ id: 'f1', name: 'brand', type: 'text', required: true }],
      })

      const { queryClient } = renderScreen('/content-types/1/edit')
      await waitFor(() => expect(screen.getByPlaceholderText('Name')).toHaveValue('Car'))

      // The user starts editing locally.
      fireEvent.change(screen.getByPlaceholderText('Field name'), { target: { value: 'model' } })

      // Meanwhile, realtime sync (or any other background refetch) silently updates the cached
      // content type to reflect someone else's concurrent commit — this must not clobber the
      // user's in-progress edit, and must not quietly move the baseline the conflict check uses.
      queryClient.setQueryData(['contentTypes', '1'], {
        id: '1',
        name: 'Car',
        slug: 'car',
        version: 2,
        fields: [{ id: 'f1', name: 'brand', type: 'text', required: true }],
        createdAt: '',
        updatedAt: '',
      })

      // Let any background re-sync triggered by the cache update fully settle, then save.
      // The assertions below are the real proof this isn't clobbered: if the background update
      // had silently overwritten the user's edit and the loaded-version baseline, this save would
      // either commit the wrong fields or fail to detect the conflict at all.
      fireEvent.click(await screen.findByRole('button', { name: 'Save changes' }))

      expect(await screen.findByText(/changed since you started editing/i)).toBeInTheDocument()
      expect(contentTypesService.commitContentTypeChange).not.toHaveBeenCalled()
      expect(screen.getByPlaceholderText('Field name')).toHaveValue('model')
    })
  })
})

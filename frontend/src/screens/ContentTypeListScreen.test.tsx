import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import * as contentTypesService from '../services/contentTypes'
import ContentTypeListScreen from './ContentTypeListScreen'

vi.mock('../services/contentTypes')

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<ContentTypeListScreen />} />
          <Route path="/content-types/new" element={<div>New content type screen</div>} />
          <Route path="/content-types/:id/edit" element={<div>Edit content type screen</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ContentTypeListScreen', () => {
  afterEach(() => vi.clearAllMocks())

  it('lists content types with field and entry counts', async () => {
    vi.mocked(contentTypesService.getContentTypes).mockResolvedValue([
      { id: '1', name: 'Car', slug: 'car', version: 1, fields: [], fieldCount: 3, entryCount: 12, createdAt: '', updatedAt: '' },
    ])

    renderScreen()

    expect(await screen.findByText('Car')).toBeInTheDocument()
    expect(screen.getByText('car')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('shows an empty state with no content types', async () => {
    vi.mocked(contentTypesService.getContentTypes).mockResolvedValue([])
    renderScreen()
    expect(await screen.findByText('No content types yet.')).toBeInTheDocument()
  })

  it('navigates to the new content type screen', async () => {
    vi.mocked(contentTypesService.getContentTypes).mockResolvedValue([])
    renderScreen()

    fireEvent.click(await screen.findByRole('button', { name: 'New content type' }))

    await waitFor(() => expect(screen.getByText('New content type screen')).toBeInTheDocument())
  })

  it('navigates to the edit screen for a content type', async () => {
    vi.mocked(contentTypesService.getContentTypes).mockResolvedValue([
      { id: '1', name: 'Car', slug: 'car', version: 1, fields: [], fieldCount: 0, entryCount: 0, createdAt: '', updatedAt: '' },
    ])
    renderScreen()

    fireEvent.click(await screen.findByRole('button', { name: 'Edit fields' }))

    await waitFor(() => expect(screen.getByText('Edit content type screen')).toBeInTheDocument())
  })
})

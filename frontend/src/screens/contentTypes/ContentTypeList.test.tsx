import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ContentTypeList from './ContentTypeList'
import * as service from '../../services/contentTypes'
import type { ContentTypeSummary } from '../../types/contentType'

vi.mock('../../services/contentTypes')

const mockList = vi.mocked(service.listContentTypes)
const mockDelete = vi.mocked(service.deleteContentType)

function render$(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('ContentTypeList', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows a loading state while fetching', () => {
    mockList.mockReturnValue(new Promise(() => {}))
    render$(<ContentTypeList />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('renders content types in a table', async () => {
    const types: ContentTypeSummary[] = [
      { id: 1, name: 'Article', slug: 'article', version: 1, fieldCount: 3 },
      { id: 2, name: 'Author', slug: 'author', version: 1, fieldCount: 2 },
    ]
    mockList.mockResolvedValue(types)
    render$(<ContentTypeList />)

    expect(await screen.findByText('Article')).toBeInTheDocument()
    expect(screen.getByText('Author')).toBeInTheDocument()
    expect(screen.getByText('3 fields')).toBeInTheDocument()
    expect(screen.getByText('2 fields')).toBeInTheDocument()
  })

  it('shows empty state when no types exist', async () => {
    mockList.mockResolvedValue([])
    render$(<ContentTypeList />)
    expect(await screen.findByText(/no content types/i)).toBeInTheDocument()
  })

  it('shows an error message when fetch fails', async () => {
    mockList.mockRejectedValue(new Error('Network error'))
    render$(<ContentTypeList />)
    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument()
  })

  it('removes a row from the list after confirming delete', async () => {
    const types: ContentTypeSummary[] = [
      { id: 1, name: 'Article', slug: 'article', version: 1, fieldCount: 3 },
      { id: 2, name: 'Author', slug: 'author', version: 1, fieldCount: 2 },
    ]
    mockList.mockResolvedValue(types)
    mockDelete.mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render$(<ContentTypeList />)
    await screen.findByText('Article')

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await userEvent.click(deleteButtons[0])

    await waitFor(() => expect(screen.queryByText('Article')).not.toBeInTheDocument())
    expect(mockDelete).toHaveBeenCalledWith('article')
    expect(screen.getByText('Author')).toBeInTheDocument()
  })

  it('does not call delete when user cancels the confirm dialog', async () => {
    const types: ContentTypeSummary[] = [
      { id: 1, name: 'Article', slug: 'article', version: 1, fieldCount: 3 },
    ]
    mockList.mockResolvedValue(types)
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    render$(<ContentTypeList />)
    await screen.findByText('Article')

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await userEvent.click(deleteButtons[0])

    expect(mockDelete).not.toHaveBeenCalled()
    expect(screen.getByText('Article')).toBeInTheDocument()
  })
})

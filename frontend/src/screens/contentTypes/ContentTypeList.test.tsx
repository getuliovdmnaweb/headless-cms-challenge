import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ContentTypeList from './ContentTypeList'
import * as service from '../../services/contentTypes'
import type { ContentTypeSummary } from '../../types/contentType'

vi.mock('../../services/contentTypes')

const mockList = vi.mocked(service.listContentTypes)

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
})

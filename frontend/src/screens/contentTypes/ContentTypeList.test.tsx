import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ContentTypeList from './ContentTypeList'
import * as service from '../../services/contentTypes'
import { socket } from '../../services/socket'
import type { ContentTypeSummary } from '../../types/contentType'

vi.mock('../../services/contentTypes')
vi.mock('../../services/socket', () => ({
  socket: { on: vi.fn(), off: vi.fn() },
}))

const mockList = vi.mocked(service.listContentTypes)
const mockDelete = vi.mocked(service.deleteContentType)
const mockOn = vi.mocked(socket.on)
const mockOff = vi.mocked(socket.off)

function render$(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

function getHandler(event: string): (...args: unknown[]) => void {
  const call = mockOn.mock.calls.find(([e]) => e === event)
  if (!call) throw new Error(`No socket.on handler registered for "${event}"`)
  return call[1] as (...args: unknown[]) => void
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

  describe('real-time socket subscriptions', () => {
    it('registers handlers for all three CT events on mount', async () => {
      mockList.mockResolvedValue([])
      render$(<ContentTypeList />)
      await screen.findByText(/no content types/i)

      const events = mockOn.mock.calls.map(([e]) => e)
      expect(events).toContain('content-type:created')
      expect(events).toContain('content-type:updated')
      expect(events).toContain('content-type:deleted')
    })

    it('refetches the list when content-type:created fires', async () => {
      mockList.mockResolvedValue([])
      render$(<ContentTypeList />)
      await screen.findByText(/no content types/i)

      const newType: ContentTypeSummary = { id: 1, name: 'Post', slug: 'post', version: 1, fieldCount: 2 }
      mockList.mockResolvedValue([newType])
      getHandler('content-type:created')()

      expect(await screen.findByText('Post')).toBeInTheDocument()
      expect(mockList).toHaveBeenCalledTimes(2)
    })

    it('refetches the list when content-type:updated fires', async () => {
      const types: ContentTypeSummary[] = [{ id: 1, name: 'Article', slug: 'article', version: 1, fieldCount: 2 }]
      mockList.mockResolvedValue(types)
      render$(<ContentTypeList />)
      await screen.findByText('Article')

      const updated: ContentTypeSummary[] = [{ id: 1, name: 'Article v2', slug: 'article', version: 2, fieldCount: 3 }]
      mockList.mockResolvedValue(updated)
      getHandler('content-type:updated')()

      expect(await screen.findByText('Article v2')).toBeInTheDocument()
      expect(mockList).toHaveBeenCalledTimes(2)
    })

    it('refetches the list when content-type:deleted fires', async () => {
      const types: ContentTypeSummary[] = [{ id: 1, name: 'Article', slug: 'article', version: 1, fieldCount: 2 }]
      mockList.mockResolvedValue(types)
      render$(<ContentTypeList />)
      await screen.findByText('Article')

      mockList.mockResolvedValue([])
      getHandler('content-type:deleted')()

      await waitFor(() => expect(screen.queryByText('Article')).not.toBeInTheDocument())
      expect(mockList).toHaveBeenCalledTimes(2)
    })

    it('deregisters all handlers on unmount', async () => {
      mockList.mockResolvedValue([])
      const { unmount } = render$(<ContentTypeList />)
      await screen.findByText(/no content types/i)

      unmount()

      const offEvents = mockOff.mock.calls.map(([e]) => e)
      expect(offEvents).toContain('content-type:created')
      expect(offEvents).toContain('content-type:updated')
      expect(offEvents).toContain('content-type:deleted')
    })
  })
})

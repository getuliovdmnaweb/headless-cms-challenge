import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import NewContentType from './NewContentType'
import * as service from '../../services/contentTypes'

vi.mock('../../services/contentTypes')
const mockCreate = vi.mocked(service.createContentType)

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function render$() {
  return render(<MemoryRouter><NewContentType /></MemoryRouter>)
}

describe('NewContentType', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate.mockResolvedValue({
      id: 1, name: 'Article', slug: 'article', version: 1,
      fields: [{ id: 1, content_type_id: 1, name: 'Title', type: 'text', required: true, position: 0 }],
    })
  })

  it('renders the form with Name and Slug fields', () => {
    render$()
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByText(/slug/i)).toBeInTheDocument()
  })

  it('derives the slug from the name input', async () => {
    render$()
    await userEvent.type(screen.getByPlaceholderText(/blog post/i), 'Blog Post')
    expect(screen.getByDisplayValue('blog-post')).toBeInTheDocument()
  })

  it('submit button is disabled when no fields are added', () => {
    render$()
    expect(screen.getByRole('button', { name: /create content type/i })).toBeDisabled()
  })

  it('shows hint text when no fields are added', () => {
    render$()
    expect(screen.getByText(/add at least one field to continue/i)).toBeInTheDocument()
  })

  it('enables submit button after adding a field', async () => {
    render$()
    await userEvent.click(screen.getByRole('button', { name: /add field/i }))
    expect(screen.getByRole('button', { name: /create content type/i })).not.toBeDisabled()
  })

  it('shows "Name is required" when submitting with empty name', async () => {
    render$()
    await userEvent.click(screen.getByRole('button', { name: /add field/i }))
    fireEvent.submit(screen.getByRole('form'))
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument()
  })

  it('shows "Field name is required" when a field has no name', async () => {
    render$()
    await userEvent.type(screen.getByPlaceholderText(/blog post/i), 'Article')
    await userEvent.click(screen.getByRole('button', { name: /add field/i }))
    fireEvent.submit(screen.getByRole('form'))
    expect(await screen.findByText(/field name is required/i)).toBeInTheDocument()
  })

  it('submits and navigates to list on success', async () => {
    render$()
    await userEvent.type(screen.getByPlaceholderText(/blog post/i), 'Article')
    await userEvent.click(screen.getByRole('button', { name: /add field/i }))
    const fieldInputs = screen.getAllByPlaceholderText(/field name/i)
    await userEvent.type(fieldInputs[0], 'Title')
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'))
  })

  it('shows inline API error when name already exists', async () => {
    mockCreate.mockRejectedValue(new Error('A content type with this name already exists'))
    render$()
    await userEvent.type(screen.getByPlaceholderText(/blog post/i), 'Article')
    await userEvent.click(screen.getByRole('button', { name: /add field/i }))
    const fieldInputs = screen.getAllByPlaceholderText(/field name/i)
    await userEvent.type(fieldInputs[0], 'Title')
    fireEvent.submit(screen.getByRole('form'))
    expect(await screen.findByText(/already exists/i)).toBeInTheDocument()
  })

  it('Cancel navigates back to the list', async () => {
    render$()
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})

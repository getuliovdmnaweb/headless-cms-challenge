import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import FormField from './FormField'
import Input from './Input'

describe('FormField', () => {
  it('renders the label text', () => {
    render(
      <FormField label="Name" htmlFor="name">
        <Input id="name" />
      </FormField>
    )
    expect(screen.getByText('Name')).toBeInTheDocument()
  })

  it('connects label to input via htmlFor', () => {
    render(
      <FormField label="Name" htmlFor="ct-name">
        <Input id="ct-name" />
      </FormField>
    )
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
  })

  it('renders children', () => {
    render(
      <FormField label="Name" htmlFor="name">
        <Input id="name" placeholder="Enter name" />
      </FormField>
    )
    expect(screen.getByPlaceholderText('Enter name')).toBeInTheDocument()
  })

  it('renders error message when error prop is provided', () => {
    render(
      <FormField label="Name" htmlFor="name" error="Name is required">
        <Input id="name" />
      </FormField>
    )
    expect(screen.getByText('Name is required')).toBeInTheDocument()
  })

  it('does not render error element when error is absent', () => {
    render(
      <FormField label="Name" htmlFor="name">
        <Input id="name" />
      </FormField>
    )
    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument()
  })

  it('shows required asterisk when required prop is true', () => {
    render(
      <FormField label="Name" htmlFor="name" required>
        <Input id="name" />
      </FormField>
    )
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('does not show asterisk when required is false', () => {
    render(
      <FormField label="Name" htmlFor="name">
        <Input id="name" />
      </FormField>
    )
    expect(screen.queryByText('*')).not.toBeInTheDocument()
  })
})

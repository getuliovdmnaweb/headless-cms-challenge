import { render, screen } from '@testing-library/react'
import Table from './Table'

interface Row {
  id: string
  name: string
}

describe('Table', () => {
  it('renders headers and row cells', () => {
    const rows: Row[] = [{ id: '1', name: 'Car' }]
    render(
      <Table<Row>
        columns={[{ key: 'name', header: 'Name' }]}
        rows={rows}
        rowKey={(row) => row.id}
      />
    )

    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Car')).toBeInTheDocument()
  })
})

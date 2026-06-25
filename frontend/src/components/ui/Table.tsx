import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
}

interface Props<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  className?: string
}

export default function Table<T extends Record<string, unknown>>({ columns, rows, rowKey, className }: Props<T>) {
  return (
    <table className={cn('w-full text-sm', className)}>
      <thead>
        <tr className="border-b border-gray-200 text-left text-gray-500">
          {columns.map((column) => (
            <th key={column.key} className="py-2 px-3 font-medium">
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={rowKey(row)} className="border-b border-gray-100">
            {columns.map((column) => (
              <td key={column.key} className="py-2 px-3">
                {column.render ? column.render(row) : String(row[column.key] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

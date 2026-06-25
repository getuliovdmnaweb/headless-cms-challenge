import { cn } from '../../utils/cn'

interface Props {
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'number' | 'date'
  placeholder?: string
  className?: string
}

export default function Input({ value, onChange, type = 'text', placeholder, className }: Props) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
        className
      )}
    />
  )
}

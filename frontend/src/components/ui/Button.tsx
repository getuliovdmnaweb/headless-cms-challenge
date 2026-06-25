import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn'

const button = cva('rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed', {
  variants: {
    variant: {
      primary: 'bg-blue-600 text-white hover:bg-blue-700',
      secondary: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
      danger: 'bg-red-600 text-white hover:bg-red-700',
    },
    size: {
      sm: 'px-2.5 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
})

interface Props extends VariantProps<typeof button> {
  label: string
  onClick: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
}

export default function Button({ label, onClick, disabled, type = 'button', variant, size, className }: Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(button({ variant, size }), className)}
    >
      {label}
    </button>
  )
}

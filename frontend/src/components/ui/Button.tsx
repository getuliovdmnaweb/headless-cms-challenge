import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn'

const button = cva(
  'cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary:   'bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-md',
        secondary: 'border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-md hover:bg-gray-50',
        warning:   'bg-amber-600 hover:bg-amber-700 text-white text-sm px-4 py-2 rounded-md',
        ghost:     'text-sm text-indigo-600 hover:underline',
        danger:    'text-sm text-red-500 hover:underline',
        dashed:    'w-full border border-dashed border-indigo-300 text-sm text-indigo-600 hover:bg-indigo-50 rounded-md py-2',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  }
)

interface Props extends VariantProps<typeof button> {
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  className?: string
  'aria-label'?: string
}

export default function Button({
  children,
  onClick,
  type = 'button',
  disabled,
  variant,
  className,
  'aria-label': ariaLabel,
}: Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(button({ variant }), className)}
    >
      {children}
    </button>
  )
}

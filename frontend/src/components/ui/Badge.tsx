import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn'

const badge = cva('inline-block rounded-full px-2 py-0.5 text-xs font-medium', {
  variants: {
    variant: {
      success: 'bg-green-100 text-green-800',
      danger: 'bg-red-100 text-red-800',
      neutral: 'bg-gray-100 text-gray-700',
    },
  },
  defaultVariants: {
    variant: 'neutral',
  },
})

interface Props extends VariantProps<typeof badge> {
  label: string
  className?: string
}

export default function Badge({ label, variant, className }: Props) {
  return <span className={cn(badge({ variant }), className)}>{label}</span>
}

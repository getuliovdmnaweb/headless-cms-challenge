import { forwardRef } from 'react'
import { cn } from '../../utils/cn'

interface Props extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
}

const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { error, className, children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={cn(
        'w-full border rounded-md px-3 py-2 text-sm',
        error ? 'border-red-400 bg-red-50' : 'border-gray-300',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
})

export default Select

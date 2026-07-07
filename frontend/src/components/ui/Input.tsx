import { forwardRef } from 'react'
import { cn } from '../../utils/cn'

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { error, className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full border rounded-md px-3 py-2 text-sm',
        error ? 'border-red-400 bg-red-50' : 'border-gray-300',
        props.readOnly && 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed',
        className
      )}
      {...props}
    />
  )
})

export default Input

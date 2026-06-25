import { cn } from '../../utils/cn'

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  className?: string
}

export default function Checkbox({ checked, onChange, label, className }: Props) {
  return (
    <label className={cn('inline-flex items-center gap-2 text-sm text-gray-700', className)}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

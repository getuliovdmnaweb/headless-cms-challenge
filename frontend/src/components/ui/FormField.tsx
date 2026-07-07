interface Props {
  label: string
  htmlFor: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

export default function FormField({ label, htmlFor, error, required, children }: Props) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-600 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

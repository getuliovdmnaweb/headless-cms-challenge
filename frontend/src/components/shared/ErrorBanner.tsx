import { useState } from 'react'

interface Props {
  message: string
}

export default function ErrorBanner({ message }: Props) {
  const [dismissed, setDismissed] = useState(false)

  if (!message || dismissed) return null

  return (
    <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6">
      <span>{message}</span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="text-red-400 hover:text-red-600 text-lg leading-none"
      >
        ✕
      </button>
    </div>
  )
}

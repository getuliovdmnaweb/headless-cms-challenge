import type { ImpactPreview } from '../../services/contentTypes'

interface Props {
  impact: ImpactPreview
  onConfirm: (fallback: Record<string, unknown>) => void
  onCancel: () => void
}

export default function ReviewModal(_props: Props) {
  return <div role="dialog">stub</div>
}

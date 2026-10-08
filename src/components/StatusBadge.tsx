import type { PublishStatus } from '../types/entities'

const LABELS: Record<PublishStatus, string> = {
  draft: 'مسودة',
  reviewed: 'تمت المراجعة',
  published: 'منشور',
}

const STYLES: Record<PublishStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  reviewed: 'bg-amber-100 text-amber-700',
  published: 'bg-green-100 text-green-700',
}

export function StatusBadge({ status }: { status: PublishStatus }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  )
}

import type { SkillStatus } from '../types/entities'

// راجع القسم 27 في plan.md — مصطلحات غير تقنية فقط، بدون أرقام أو نسب.
const LABELS: Record<SkillStatus, string> = {
  not_started: 'لم يبدأ',
  learning: 'يتعلم',
  needs_practice: 'يحتاج تدريب',
  good: 'جيد',
  mastered: 'متقن',
}

const STYLES: Record<SkillStatus, string> = {
  not_started: 'bg-gray-100 text-gray-500',
  learning: 'bg-blue-100 text-blue-700',
  needs_practice: 'bg-amber-100 text-amber-700',
  good: 'bg-green-100 text-green-700',
  mastered: 'bg-purple-100 text-purple-700',
}

export function SkillStatusBadge({ status }: { status: SkillStatus }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  )
}

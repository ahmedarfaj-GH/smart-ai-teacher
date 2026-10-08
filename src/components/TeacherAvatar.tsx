// Placeholder بصري لشخصية المعلم — دائرة بسيطة تحمل الاسم (القسم 36 في plan.md).
// نقطة استبدال واحدة لاحقًا بشخصية كرتونية حقيقية: عدّل هذا الملف فقط.

const SIZES = {
  sm: 'h-16 w-16 text-lg',
  md: 'h-20 w-20 text-xl',
  lg: 'h-28 w-28 text-3xl',
} as const

type Size = keyof typeof SIZES

export function TeacherAvatar({ name, size = 'md' }: { name: string; size?: Size }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-purple-100 font-bold text-purple-700 ${SIZES[size]}`}
    >
      {name}
    </div>
  )
}

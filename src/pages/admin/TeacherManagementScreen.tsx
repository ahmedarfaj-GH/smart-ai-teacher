import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TeacherAvatar } from '../../components/TeacherAvatar'
import { getTeachers } from '../../lib/referenceDataRepository'
import type { Teacher } from '../../types/entities'

const BOOLEAN_LABEL = { true: 'مفعّل', false: 'غير مفعّل' } as const

export function TeacherManagementScreen() {
  const [teachers, setTeachers] = useState<Teacher[] | null>(null)

  useEffect(() => {
    getTeachers().then(setTeachers)
  }, [])

  if (!teachers) {
    return <p className="p-6 text-gray-400">جارِ التحميل...</p>
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <Link to="/admin" className="text-sm text-gray-500 hover:text-gray-700">
        → رجوع
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">المعلمون</h1>

      <div className="mt-6 flex flex-col gap-4">
        {teachers.map((teacher) => (
          <div key={teacher.id} className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-4">
              <TeacherAvatar name={teacher.name} size="sm" />
              <div>
                <div className="text-lg font-bold text-gray-900">{teacher.name}</div>
                <div className="text-sm text-gray-500">{teacher.stage} · {teacher.language}</div>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <Field label="الجنس" value={teacher.gender} />
              <Field label="أسلوب التدريس" value={teacher.teachingStyle} />
              <Field label="سلامة الطفل" value={teacher.childSafety} />
              <Field label="مدة الجلسة" value={`${teacher.sessionLengthMinutes[0]}–${teacher.sessionLengthMinutes[1]} دقيقة`} />
              <Field label="التلميح أولاً" value={BOOLEAN_LABEL[String(teacher.hintFirst) as 'true' | 'false']} />
              <Field label="إعطاء إجابة مباشرة" value={BOOLEAN_LABEL[String(teacher.giveDirectAnswer) as 'true' | 'false']} />
              <Field label="توجيه واحد بالمرة" value={BOOLEAN_LABEL[String(teacher.oneInstructionAtATime) as 'true' | 'false']} />
            </dl>
          </div>
        ))}
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-gray-400">{label}</dt>
      <dd className="text-gray-800">{value}</dd>
    </div>
  )
}

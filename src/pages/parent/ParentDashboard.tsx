import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getStudentSkills, getWeeklySessionStats, type WeeklySessionStats } from '../../lib/learningEngine'
import { getGrades, getSemesters } from '../../lib/referenceDataRepository'
import { addChild, getMyChildren, updateChild } from '../../lib/studentsRepository'
import type { Grade, Id, Semester, Student } from '../../types/entities'

interface ChildSummary {
  weekly: WeeklySessionStats
  needsPracticeCount: number
}

export function ParentDashboard() {
  const { profile } = useAuth()
  const [children, setChildren] = useState<Student[] | null>(null)
  const [grades, setGrades] = useState<Grade[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [summaries, setSummaries] = useState<Map<Id, ChildSummary>>(new Map())
  const [addingChild, setAddingChild] = useState(false)
  const [editingId, setEditingId] = useState<Id | null>(null)

  async function reload() {
    if (!profile) return
    const [childList, gradeList, semesterList] = await Promise.all([
      getMyChildren(profile.id),
      getGrades(),
      getSemesters(),
    ])
    setChildren(childList)
    setGrades(gradeList)
    setSemesters(semesterList)

    const summaryEntries = await Promise.all(
      childList.map(async (child) => {
        const [weekly, skills] = await Promise.all([getWeeklySessionStats(child.id), getStudentSkills(child.id)])
        const needsPracticeCount = skills.filter((s) => s.status === 'needs_practice').length
        return [child.id, { weekly, needsPracticeCount }] as const
      }),
    )
    setSummaries(new Map(summaryEntries))
  }

  useEffect(() => {
    reload()
  }, [profile])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">أبنائي</h1>

      {!children ? (
        <p className="mt-6 text-gray-400">جارِ التحميل...</p>
      ) : (
        <div className="mt-6 flex flex-wrap gap-4">
          {children.map((child) => {
            const grade = grades.find((g) => g.id === child.gradeId)
            const semester = semesters.find((s) => s.id === child.semesterId)
            const summary = summaries.get(child.id)
            if (editingId === child.id) {
              return (
                <div key={child.id} className="w-64">
                  <ChildForm
                    grades={grades}
                    semesters={semesters}
                    initial={child}
                    submitLabel="حفظ"
                    onSubmit={async (values) => {
                      await updateChild(child.id, values)
                      setEditingId(null)
                      reload()
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              )
            }
            return (
              <div key={child.id} className="w-64 rounded-xl border border-gray-200 bg-white p-5">
                <div className="text-lg font-bold text-gray-900">{child.name}</div>
                <div className="mt-2 text-sm text-gray-500">العمر: {child.age} سنوات</div>
                <div className="text-sm text-gray-500">الصف: {grade?.name}</div>
                {semester && <div className="text-sm text-gray-500">{semester.name}</div>}

                {summary && (
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
                    <span className="text-gray-500">
                      جلسات الأسبوع: <span className="font-semibold text-gray-700">{summary.weekly.completed}/{summary.weekly.target}</span>
                    </span>
                    {summary.needsPracticeCount > 0 && (
                      <span className="font-semibold text-amber-600">يحتاج متابعة</span>
                    )}
                  </div>
                )}

                <Link
                  to={`/parent/students/${child.id}`}
                  className="mt-4 block rounded-lg bg-purple-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-purple-700"
                >
                  عرض {child.name}
                </Link>
                <button
                  onClick={() => setEditingId(child.id)}
                  className="mt-2 w-full rounded-lg bg-gray-100 px-4 py-2 text-center text-sm font-semibold text-gray-700 hover:bg-gray-200"
                >
                  تعديل البيانات
                </button>
              </div>
            )
          })}

          <div className="w-64">
            {addingChild ? (
              <ChildForm
                grades={grades}
                semesters={semesters}
                submitLabel="إضافة"
                onSubmit={async (values) => {
                  await addChild({ parentId: profile!.id, ...values })
                  setAddingChild(false)
                  reload()
                }}
                onCancel={() => setAddingChild(false)}
              />
            ) : (
              <button
                onClick={() => setAddingChild(true)}
                className="flex h-full w-full items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-5 text-sm font-semibold text-gray-500 hover:border-purple-400 hover:text-purple-600"
              >
                + إضافة ابن
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ChildForm({
  grades,
  semesters,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  grades: Grade[]
  semesters: Semester[]
  initial?: Student
  submitLabel: string
  onSubmit: (values: { name: string; age: number; gradeId: Id; semesterId: Id }) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [age, setAge] = useState(initial ? String(initial.age) : '')
  const [gradeId, setGradeId] = useState(initial?.gradeId ?? grades[0]?.id ?? '')
  const [semesterId, setSemesterId] = useState(initial?.semesterId ?? '')
  const [saving, setSaving] = useState(false)

  // الفصول المتاحة للصف المختار؛ وعند تغيير الصف نختار أول فصل فيه.
  const gradeSemesters = semesters.filter((s) => s.gradeId === gradeId)
  const chosenSemesterId = gradeSemesters.some((s) => s.id === semesterId) ? semesterId : (gradeSemesters[0]?.id ?? '')

  async function handleSave() {
    if (!name.trim() || !age || !gradeId || !chosenSemesterId) return
    setSaving(true)
    try {
      await onSubmit({ name: name.trim(), age: Number(age), gradeId, semesterId: chosenSemesterId })
    } finally {
      setSaving(false)
    }
  }

  const field = 'rounded border border-gray-300 px-2 py-1 text-sm'

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-gray-300 bg-white p-5">
      <input autoFocus placeholder="اسم الابن" value={name} onChange={(e) => setName(e.target.value)} className={field} />
      <input
        type="number"
        min={1}
        max={20}
        placeholder="العمر"
        value={age}
        onChange={(e) => setAge(e.target.value)}
        className={field}
      />
      <label className="text-xs font-semibold text-gray-500">الصف</label>
      <select value={gradeId} onChange={(e) => setGradeId(e.target.value)} className={field}>
        {grades.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
      <label className="text-xs font-semibold text-gray-500">الفصل الدراسي</label>
      <select value={chosenSemesterId} onChange={(e) => setSemesterId(e.target.value)} className={field}>
        {gradeSemesters.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim() || !age || !chosenSemesterId}
          className="rounded-md bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-40"
        >
          {submitLabel}
        </button>
        <button onClick={onCancel} className="rounded-md bg-gray-100 px-4 py-1.5 text-xs font-semibold text-gray-700">
          إلغاء
        </button>
      </div>
    </div>
  )
}

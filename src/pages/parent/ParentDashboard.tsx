import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getStudentSkills, getWeeklySessionStats, type WeeklySessionStats } from '../../lib/learningEngine'
import { getGrades } from '../../lib/referenceDataRepository'
import { addChild, getMyChildren } from '../../lib/studentsRepository'
import type { Grade, Id, Student } from '../../types/entities'

interface ChildSummary {
  weekly: WeeklySessionStats
  needsPracticeCount: number
}

export function ParentDashboard() {
  const { profile } = useAuth()
  const [children, setChildren] = useState<Student[] | null>(null)
  const [grades, setGrades] = useState<Grade[]>([])
  const [summaries, setSummaries] = useState<Map<Id, ChildSummary>>(new Map())
  const [addingChild, setAddingChild] = useState(false)

  async function reload() {
    if (!profile) return
    const [childList, gradeList] = await Promise.all([getMyChildren(profile.id), getGrades()])
    setChildren(childList)
    setGrades(gradeList)

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
            const summary = summaries.get(child.id)
            return (
              <div key={child.id} className="w-64 rounded-xl border border-gray-200 bg-white p-5">
                <div className="text-lg font-bold text-gray-900">{child.name}</div>
                <div className="mt-2 text-sm text-gray-500">العمر: {child.age} سنوات</div>
                <div className="text-sm text-gray-500">الصف: {grade?.name}</div>

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
              </div>
            )
          })}

          <div className="w-64">
            {addingChild ? (
              <AddChildForm
                parentId={profile!.id}
                gradeId={grades[0]?.id ?? ''}
                onAdded={() => {
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

function AddChildForm({
  parentId,
  gradeId,
  onAdded,
  onCancel,
}: {
  parentId: string
  gradeId: string
  onAdded: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim() || !age || !gradeId) return
    setSaving(true)
    try {
      await addChild({ parentId, name: name.trim(), age: Number(age), gradeId })
      onAdded()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-gray-300 bg-white p-5">
      <input
        autoFocus
        placeholder="اسم الابن"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1 text-sm"
      />
      <input
        type="number"
        min={1}
        max={20}
        placeholder="العمر"
        value={age}
        onChange={(e) => setAge(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1 text-sm"
      />
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim() || !age}
          className="rounded-md bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-40"
        >
          إضافة
        </button>
        <button onClick={onCancel} className="rounded-md bg-gray-100 px-4 py-1.5 text-xs font-semibold text-gray-700">
          إلغاء
        </button>
      </div>
    </div>
  )
}

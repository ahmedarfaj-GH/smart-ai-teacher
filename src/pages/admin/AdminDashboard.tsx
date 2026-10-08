import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getBooks } from '../../lib/curriculumRepository'
import { getSubjects, getTeachers } from '../../lib/referenceDataRepository'
import { supabase } from '../../lib/supabaseClient'

interface Stats {
  books: number
  subjects: number
  teachers: number
  students: number
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [firstBookId, setFirstBookId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [books, subjects, teachers, studentsCount] = await Promise.all([
        getBooks(),
        getSubjects(),
        getTeachers(),
        supabase.from('students').select('*', { count: 'exact', head: true }),
      ])
      if (cancelled) return
      setFirstBookId(books[0]?.id ?? null)
      setStats({
        books: books.length,
        subjects: subjects.length,
        teachers: teachers.length,
        students: studentsCount.count ?? 0,
      })
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const quickActions = [
    { label: 'رفع كتاب', to: '/admin/books/new' },
    ...(firstBookId ? [{ label: 'إدارة المحتوى', to: `/admin/books/${firstBookId}` }] : []),
    { label: 'إدارة المعلمين', to: '/admin/teachers' },
  ]

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">لوحة الإدارة</h1>

      {!stats ? (
        <p className="mt-6 text-gray-400">جارِ التحميل...</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="الكتب" value={stats.books} />
          <StatCard label="المواد" value={stats.subjects} />
          <StatCard label="المعلمون" value={stats.teachers} />
          <StatCard label="الطلاب" value={stats.students} />
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-500">إجراءات سريعة</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className="rounded-lg bg-purple-600 px-5 py-3 text-sm font-semibold text-white hover:bg-purple-700"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 text-center">
      <div className="text-3xl font-bold text-purple-600">{value}</div>
      <div className="mt-1 text-sm text-gray-500">{label}</div>
    </div>
  )
}

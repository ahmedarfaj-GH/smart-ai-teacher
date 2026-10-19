import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getBooks } from '../../lib/curriculumRepository'
import { getGrades, getSemesters, getSubjects } from '../../lib/referenceDataRepository'
import type { Book, Grade, Semester, Subject } from '../../types/entities'

interface Curriculum {
  key: string
  grade: Grade
  subjectName: string
  terms: { semester: Semester; book?: Book }[]
}

export function ContentManagementScreen() {
  const [curricula, setCurricula] = useState<Curriculum[] | null>(null)
  const [openKey, setOpenKey] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [grades, semesters, subjects, books] = await Promise.all([getGrades(), getSemesters(), getSubjects(), getBooks()])
      const list: Curriculum[] = []
      for (const grade of grades) {
        const gradeSemesters = semesters.filter((s) => s.gradeId === grade.id)
        const subjectsOfGrade: Subject[] = subjects.filter((s) => gradeSemesters.some((sem) => sem.id === s.semesterId))
        for (const name of [...new Set(subjectsOfGrade.map((s) => s.name))]) {
          list.push({
            key: `${grade.id}-${name}`,
            grade,
            subjectName: name,
            terms: gradeSemesters.map((semester) => {
              const subject = subjectsOfGrade.find((s) => s.semesterId === semester.id && s.name === name)
              return { semester, book: books.find((b) => b.subjectId === subject?.id) }
            }),
          })
        }
      }
      setCurricula(list)
    }
    load()
  }, [])

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link to="/admin" className="text-sm text-gray-500 hover:text-gray-700">
        → رجوع
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">إدارة المحتوى</h1>
      <p className="mt-1 text-sm text-gray-500">اختر المنهج ثم الفصل الدراسي لتعديل كتابه.</p>

      {!curricula ? (
        <p className="mt-6 text-gray-400">جارِ التحميل...</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {curricula.map((c) => (
            <div key={c.key} className="rounded-xl border border-gray-200 bg-white p-5">
              <button onClick={() => setOpenKey(openKey === c.key ? null : c.key)} className="w-full text-right">
                <div className="text-lg font-bold text-gray-900">{c.subjectName}</div>
                <div className="text-sm text-gray-500">{c.grade.name}</div>
              </button>
              {openKey === c.key && (
                <div className="mt-4 flex flex-col gap-2">
                  <div className="text-xs font-semibold text-gray-500">اختر الفصل الدراسي</div>
                  {c.terms.map(({ semester, book }) =>
                    book ? (
                      <Link
                        key={semester.id}
                        to={`/admin/books/${book.id}`}
                        className="rounded-lg bg-purple-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-purple-700"
                      >
                        {semester.name}
                      </Link>
                    ) : (
                      <div key={semester.id} className="rounded-lg bg-gray-50 px-4 py-2 text-center text-sm text-gray-400">
                        {semester.name} — لا يوجد كتاب بعد
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

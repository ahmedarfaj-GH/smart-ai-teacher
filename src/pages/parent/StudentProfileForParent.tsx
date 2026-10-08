import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SubjectActivationModal } from '../../components/SubjectActivationModal'
import { getGrades, getSemesters, getSubjects, getTeachers } from '../../lib/referenceDataRepository'
import { activateSubject, getStudentSubject } from '../../lib/studentSubjectRepository'
import { getStudentById } from '../../lib/studentsRepository'
import type { Grade, Semester, Student, StudentSubject, Subject, Teacher } from '../../types/entities'

interface PageData {
  student: Student | null
  grade: Grade | undefined
  teacher: Teacher
  availableSubjects: { subject: Subject; semester: Semester | undefined }[]
  relations: Map<string, StudentSubject | undefined>
}

export function StudentProfileForParent() {
  const { studentId } = useParams<{ studentId: string }>()
  const [pageData, setPageData] = useState<PageData | null>(null)
  const [activatingSubjectId, setActivatingSubjectId] = useState<string | null>(null)

  async function load() {
    if (!studentId) return
    const [student, grades, semesters, subjects, teachers] = await Promise.all([
      getStudentById(studentId),
      getGrades(),
      getSemesters(),
      getSubjects(),
      getTeachers(),
    ])

    if (!student) {
      setPageData({ student: null, grade: undefined, teacher: teachers[0], availableSubjects: [], relations: new Map() })
      return
    }

    const grade = grades.find((g) => g.id === student.gradeId)
    const availableSubjects = subjects
      .filter((subj) => semesters.find((sem) => sem.id === subj.semesterId)?.gradeId === student.gradeId)
      .map((subject) => ({ subject, semester: semesters.find((sem) => sem.id === subject.semesterId) }))

    const relations = new Map<string, StudentSubject | undefined>()
    await Promise.all(
      availableSubjects.map(async ({ subject }) => {
        relations.set(subject.id, await getStudentSubject(student.id, subject.id))
      }),
    )

    setPageData({ student, grade, teacher: teachers[0], availableSubjects, relations })
  }

  useEffect(() => {
    load()
  }, [studentId])

  if (!pageData) {
    return <p className="p-6 text-gray-400">جارِ التحميل...</p>
  }

  if (!pageData.student) {
    return (
      <div className="p-6">
        <Link to="/parent" className="text-sm text-gray-500 hover:text-gray-700">
          → رجوع
        </Link>
        <p className="mt-4 text-gray-500">الطالب غير موجود.</p>
      </div>
    )
  }

  const { student, grade, teacher, availableSubjects, relations } = pageData
  const activatingSubject = availableSubjects.find((s) => s.subject.id === activatingSubjectId)?.subject

  return (
    <div className="mx-auto max-w-xl p-6">
      <Link to="/parent" className="text-sm text-gray-500 hover:text-gray-700">
        → رجوع
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">{student.name}</h1>
      <p className="text-sm text-gray-500">{grade?.name}</p>

      <h2 className="mt-6 text-sm font-semibold text-gray-500">المواد المتاحة</h2>
      <div className="mt-3 flex flex-col gap-3">
        {availableSubjects.map(({ subject, semester }) => {
          const relation = relations.get(subject.id)
          const active = relation?.active ?? false

          return (
            <div key={subject.id} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-gray-900">{subject.name}</div>
                  <div className="text-sm text-gray-500">{semester?.name}</div>
                  <div className="text-sm text-gray-500">المعلم: {teacher.name}</div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {active ? 'مفعّلة' : 'غير مفعلة'}
                </span>
              </div>

              {!active && (
                <button
                  onClick={() => setActivatingSubjectId(subject.id)}
                  className="mt-4 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                >
                  تفعيل المادة
                </button>
              )}

              {active && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link
                    to={`/parent/students/${student.id}/subjects/${subject.id}/baseline`}
                    className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                  >
                    ابدأ مع {teacher.name}
                  </Link>
                  <Link
                    to={`/parent/students/${student.id}/subjects/${subject.id}/progress`}
                    className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                  >
                    عرض التقدم
                  </Link>
                  <Link
                    to={`/parent/students/${student.id}/subjects/${subject.id}/position`}
                    className="text-xs font-semibold text-gray-400 hover:text-purple-600 hover:underline"
                  >
                    تخصيص نقطة البداية
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {activatingSubject && (
        <SubjectActivationModal
          subjectName={activatingSubject.name}
          teacherName={teacher.name}
          studentName={student.name}
          onCancel={() => setActivatingSubjectId(null)}
          onConfirm={async () => {
            await activateSubject(student.id, activatingSubject.id, teacher.id)
            setActivatingSubjectId(null)
            load()
          }}
        />
      )}
    </div>
  )
}

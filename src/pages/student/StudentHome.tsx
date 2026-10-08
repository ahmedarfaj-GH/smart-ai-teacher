import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TeacherAvatar } from '../../components/TeacherAvatar'
import { getSubjects, getTeachers } from '../../lib/referenceDataRepository'
import { getStudentSubject } from '../../lib/studentSubjectRepository'
import { getStudentById } from '../../lib/studentsRepository'
import type { Student, Subject, Teacher } from '../../types/entities'

export function StudentHome() {
  const { studentId } = useParams<{ studentId: string }>()
  const navigate = useNavigate()
  const [student, setStudent] = useState<Student | null>(null)
  const [subject, setSubject] = useState<Subject | null>(null)
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    if (!studentId) return
    async function load() {
      const [s, subjects, teachers] = await Promise.all([getStudentById(studentId!), getSubjects(), getTeachers()])
      const subj = subjects[0]
      setStudent(s ?? null)
      setSubject(subj ?? null)
      setTeacher(teachers[0] ?? null)
      if (s && subj) {
        const relation = await getStudentSubject(s.id, subj.id)
        setIsActive(relation?.active ?? false)
      }
    }
    load()
  }, [studentId])

  if (!student || !subject || !teacher) {
    return <p className="p-6 text-center text-gray-400">جارِ التحميل...</p>
  }

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center gap-8 p-6 text-center">
      <TeacherAvatar name={teacher.name} size="lg" />

      <div>
        <h1 className="text-3xl font-bold text-gray-900">هلا {student.name} 👋</h1>
        <p className="mt-2 text-xl text-gray-500">جاهز نتعلم سوا؟</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-4">
        <button
          onClick={() => navigate(`/student/${student.id}/session`)}
          disabled={!isActive}
          className="rounded-2xl bg-purple-600 px-6 py-5 text-xl font-bold text-white transition-colors hover:bg-purple-700 disabled:opacity-40"
        >
          ابدأ مع {teacher.name}
        </button>
        <button
          disabled
          className="rounded-2xl bg-gray-100 px-6 py-5 text-xl font-bold text-gray-400"
        >
          راجع معي <span className="text-sm font-normal">(قريبًا)</span>
        </button>
        <button
          disabled
          className="rounded-2xl bg-gray-100 px-6 py-5 text-xl font-bold text-gray-400"
        >
          عندي واجب <span className="text-sm font-normal">(قريبًا)</span>
        </button>
      </div>

      {!isActive && (
        <p className="text-sm text-gray-400">
          لسه {teacher.name} ما جاهز — اطلب من بابا أو ماما يفعّلون المادة أولًا.
        </p>
      )}
    </div>
  )
}

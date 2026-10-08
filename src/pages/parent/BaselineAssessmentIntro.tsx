import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useRole } from '../../context/RoleContext'
import { getTeachers } from '../../lib/referenceDataRepository'
import { getStudentById } from '../../lib/studentsRepository'
import type { Student, Teacher } from '../../types/entities'

export function BaselineAssessmentIntro() {
  const { studentId } = useParams<{ studentId: string }>()
  const [student, setStudent] = useState<Student | null | undefined>(undefined)
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const navigate = useNavigate()
  const { setRole } = useRole()

  useEffect(() => {
    if (!studentId) return
    Promise.all([getStudentById(studentId), getTeachers()]).then(([s, teachers]) => {
      setStudent(s ?? null)
      setTeacher(teachers[0] ?? null)
    })
  }, [studentId])

  if (student === undefined || !teacher) {
    return <p className="p-6 text-gray-400">جارِ التحميل...</p>
  }

  if (!student) {
    return (
      <div className="p-6">
        <Link to="/parent" className="text-sm text-gray-500 hover:text-gray-700">
          → رجوع
        </Link>
        <p className="mt-4 text-gray-500">الطالب غير موجود.</p>
      </div>
    )
  }

  function handleStart() {
    setRole('student')
    navigate(`/student/${studentId}`)
  }

  return (
    <div className="mx-auto max-w-md p-6 text-center">
      <h1 className="text-2xl font-bold text-gray-900">جاهزون نبدأ مع {student.name}</h1>
      <p className="mt-4 text-gray-600">
        قبل أن يبدأ {teacher.name} مع {student.name}، سنجري تقييمًا قصيرًا لمعرفة مستواه الحالي.
      </p>
      <button
        onClick={handleStart}
        className="mt-6 rounded-lg bg-purple-600 px-6 py-3 text-sm font-semibold text-white hover:bg-purple-700"
      >
        بدء التقييم
      </button>
    </div>
  )
}

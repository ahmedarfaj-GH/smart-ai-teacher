import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getLatestSession, getSkillsPracticedInSession } from '../../lib/learningEngine'
import { getTeachers } from '../../lib/referenceDataRepository'
import { getStudentById } from '../../lib/studentsRepository'
import { TeacherEngine } from '../../lib/teacherEngine'
import type { Id, Student, Teacher } from '../../types/entities'

export function SessionSummaryScreen() {
  const { studentId } = useParams<{ studentId: string }>()
  const navigate = useNavigate()
  const [student, setStudent] = useState<Student | null>(null)
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [practicedSkills, setPracticedSkills] = useState<{ id: Id; name: string }[]>([])

  useEffect(() => {
    if (!studentId) return
    async function load() {
      const [s, teachers] = await Promise.all([getStudentById(studentId!), getTeachers()])
      setStudent(s ?? null)
      setTeacher(teachers[0] ?? null)
      if (s) {
        const latestSession = await getLatestSession(s.id)
        if (latestSession) setPracticedSkills(await getSkillsPracticedInSession(latestSession.id))
      }
    }
    load()
  }, [studentId])

  if (!student || !teacher) {
    return <p className="p-6 text-center text-gray-400">جارِ التحميل...</p>
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-56px)] max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="text-5xl">🎉</div>
      <h1 className="text-2xl font-bold text-gray-900">{TeacherEngine.getSessionClosing(student.name)}</h1>

      {practicedSkills.length > 0 && (
        <div className="w-full rounded-2xl border border-gray-200 bg-white p-5">
          <div className="text-sm font-semibold text-gray-500">تدربنا اليوم على</div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {practicedSkills.map((skill) => (
              <span
                key={skill.id}
                className="rounded-full bg-purple-50 px-3 py-1 text-sm font-semibold text-purple-700"
              >
                {skill.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => navigate(`/student/${student.id}`)}
        className="rounded-xl bg-purple-600 px-8 py-4 text-lg font-bold text-white hover:bg-purple-700"
      >
        رجوع لـ {teacher.name}
      </button>
    </div>
  )
}

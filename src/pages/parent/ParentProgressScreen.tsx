import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SkillStatusBadge } from '../../components/SkillStatusBadge'
import { getProgressSummary, getStudentSkills, getWeeklySessionStats, type WeeklySessionStats } from '../../lib/learningEngine'
import { getSkills, getSubjects } from '../../lib/referenceDataRepository'
import { getStudentById } from '../../lib/studentsRepository'
import { TeacherEngine } from '../../lib/teacherEngine'
import type { Skill, Student, StudentSkill, Subject } from '../../types/entities'

interface PageData {
  student: Student | null
  subject: Subject | undefined
  weekly: WeeklySessionStats
  studentSkills: StudentSkill[]
  skills: Skill[]
  recommendation: string
}

export function ParentProgressScreen() {
  const { studentId, subjectId } = useParams<{ studentId: string; subjectId: string }>()
  const [data, setData] = useState<PageData | null>(null)

  useEffect(() => {
    async function load() {
      if (!studentId || !subjectId) return
      const [student, subjects] = await Promise.all([getStudentById(studentId), getSubjects()])
      const subject = subjects.find((s) => s.id === subjectId)

      if (!student) {
        setData({ student: null, subject, weekly: { completed: 0, target: 5, minutes: 0 }, studentSkills: [], skills: [], recommendation: '' })
        return
      }

      const [weekly, studentSkills, skills, summary] = await Promise.all([
        getWeeklySessionStats(student.id),
        getStudentSkills(student.id),
        getSkills(),
        getProgressSummary(student.id),
      ])

      const recommendation = TeacherEngine.getProgressRecommendation({
        studentName: student.name,
        bestSkillName: summary.bestSkill?.name,
        strugglingSkillName: summary.strugglingSkill?.name,
      })

      setData({ student, subject, weekly, studentSkills, skills, recommendation })
    }
    load()
  }, [studentId, subjectId])

  if (!data) {
    return <p className="p-6 text-gray-400">جارِ التحميل...</p>
  }

  if (!data.student || !data.subject) {
    return (
      <div className="p-6">
        <Link to="/parent" className="text-sm text-gray-500 hover:text-gray-700">
          → رجوع
        </Link>
        <p className="mt-4 text-gray-500">الطالب أو المادة غير موجودة.</p>
      </div>
    )
  }

  const { student, subject, weekly, studentSkills, skills, recommendation } = data

  return (
    <div className="mx-auto max-w-xl p-6">
      <Link to={`/parent/students/${student.id}`} className="text-sm text-gray-500 hover:text-gray-700">
        → رجوع
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">تقدم {student.name}</h1>
      <p className="text-sm text-gray-500">{subject.name}</p>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {weekly.completed} / {weekly.target}
          </div>
          <div className="mt-1 text-sm text-gray-500">جلسات هذا الأسبوع</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 text-center">
          <div className="text-2xl font-bold text-purple-600">{weekly.minutes} دقيقة</div>
          <div className="mt-1 text-sm text-gray-500">وقت التعلم</div>
        </div>
      </div>

      <h2 className="mt-6 text-sm font-semibold text-gray-500">حالة المهارات</h2>
      {studentSkills.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">لسه ما بدأ {student.name} أي جلسة.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {studentSkills.map((s) => {
            const skill = skills.find((sk) => sk.id === s.skillId)
            return (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-4 py-2"
              >
                <span className="text-sm text-gray-800">{skill?.name}</span>
                <SkillStatusBadge status={s.status} />
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-6 rounded-xl bg-purple-50 p-4">
        <div className="text-xs font-semibold text-purple-600">توصية المعلم</div>
        <p className="mt-1 text-sm text-gray-700">{recommendation}</p>
      </div>
    </div>
  )
}

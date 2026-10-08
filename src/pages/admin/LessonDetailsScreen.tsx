import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StatusBadge } from '../../components/StatusBadge'
import { addLessonSkill, getLessonActivities, getLessonById, getUnitById, removeLessonSkill } from '../../lib/curriculumRepository'
import { getLessonSkillIds, getSkills } from '../../lib/referenceDataRepository'
import type { Id, Lesson, LessonActivity, LessonActivityKind, Skill, Unit } from '../../types/entities'

const KIND_LABELS: Record<LessonActivityKind, string> = {
  reading: 'قراءة',
  listening: 'استماع ونطق',
  memorization: 'حفظ',
  dictation: 'إملاء',
  writing: 'كتابة',
  speaking: 'تحدث',
  paper: 'ورقي',
  enrichment: 'إثرائي',
}

export function LessonDetailsScreen() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const [lesson, setLesson] = useState<Lesson | null | undefined>(undefined)
  const [unit, setUnit] = useState<Unit | undefined>(undefined)
  const [skills, setSkills] = useState<Skill[]>([])
  const [linkedSkillIds, setLinkedSkillIds] = useState<Set<Id>>(new Set())
  const [activities, setActivities] = useState<LessonActivity[]>([])

  useEffect(() => {
    if (!lessonId) return
    async function load() {
      const l = await getLessonById(lessonId!)
      setLesson(l ?? null)
      if (l) {
        const [u, allSkills, linkedIds, lessonActivities] = await Promise.all([
          getUnitById(l.unitId),
          getSkills(),
          getLessonSkillIds(l.id),
          getLessonActivities(l.id),
        ])
        setActivities(lessonActivities)
        setUnit(u)
        setSkills(allSkills)
        setLinkedSkillIds(new Set(linkedIds))
      }
    }
    load()
  }, [lessonId])

  async function toggleSkill(skillId: Id) {
    if (!lesson) return
    if (linkedSkillIds.has(skillId)) {
      await removeLessonSkill(lesson.id, skillId)
      setLinkedSkillIds((prev) => {
        const next = new Set(prev)
        next.delete(skillId)
        return next
      })
    } else {
      await addLessonSkill(lesson.id, skillId)
      setLinkedSkillIds((prev) => new Set(prev).add(skillId))
    }
  }

  if (lesson === undefined) {
    return <p className="p-6 text-gray-400">جارِ التحميل...</p>
  }

  if (!lesson) {
    return (
      <div className="p-6">
        <Link to="/admin" className="text-sm text-gray-500 hover:text-gray-700">
          → رجوع
        </Link>
        <p className="mt-4 text-gray-500">الدرس غير موجود.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <Link to={unit ? `/admin/books/${unit.bookId}` : '/admin'} className="text-sm text-gray-500 hover:text-gray-700">
        → رجوع للمنهج
      </Link>

      <div className="mt-2 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{lesson.title}</h1>
        <StatusBadge status={lesson.status} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-gray-400">الوحدة</dt>
          <dd className="text-gray-800">{unit?.title ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-gray-400">نوع المحتوى</dt>
          <dd className="text-gray-800">{lesson.contentType}</dd>
        </div>
        <div>
          <dt className="text-gray-400">الصفحات</dt>
          <dd className="text-gray-800">{lesson.pages}</dd>
        </div>
      </dl>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-500">الأنشطة ({activities.length})</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {activities.map((activity) => (
            <li key={activity.id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700">
                  {KIND_LABELS[activity.kind]}
                </span>
                {activity.page && <span className="text-xs text-gray-400">ص {activity.page}</span>}
                <span className="text-gray-800">{activity.title}</span>
              </div>
              {activity.content && (
                <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs text-gray-500">{activity.content}</p>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-500">المهارات المرتبطة</h2>
        <div className="mt-2 flex flex-col gap-2">
          {skills.map((skill) => (
            <label key={skill.id} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={linkedSkillIds.has(skill.id)}
                onChange={() => toggleSkill(skill.id)}
                className="accent-purple-600"
              />
              {skill.name}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

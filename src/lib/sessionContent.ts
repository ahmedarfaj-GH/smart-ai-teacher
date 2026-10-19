// اختيار درس الجلسة: أول درس (من المنشور، وإن لم يوجد منشور فكل الدروس) فيه نشاط مفعَّل لم ينجزه الطالب بعد.
// بهذا يتقدّم الطالب تلقائيًا من درس لآخر بحسب إنجازه، دون الاعتماد على موضع يدوي.

import { isSessionActivity } from './activityItems'
import { getBookActivities, getBooks, getLessons, getUnits } from './curriculumRepository'
import { getFinishedActivityIds } from './progressRepository'
import type { Id, Lesson } from '../types/entities'

export async function getLessonForSession(studentId: Id, subjectId: Id): Promise<Lesson | undefined> {
  const book = (await getBooks()).find((b) => b.subjectId === subjectId)
  if (!book) return undefined

  const [units, activities, finished] = await Promise.all([
    getUnits(book.id),
    getBookActivities(book.id),
    getFinishedActivityIds(studentId),
  ])
  const lessons = (await Promise.all(units.map((u) => getLessons(u.id)))).flat()
  const published = lessons.filter((l) => l.status === 'published')
  const pool = published.length > 0 ? published : lessons

  return pool.find((l) => activities.some((a) => a.lessonId === l.id && isSessionActivity(a) && !finished.has(a.id)))
}


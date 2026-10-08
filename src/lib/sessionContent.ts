// اختيار درس الجلسة: الموضع الحالي للطالب إن وُجد، وإلا أول درس فعلي (contentType = "درس") في كتاب المادة.

import { getBooks, getLessonById, getLessons, getUnits } from './curriculumRepository'
import { getStudentSubject } from './studentSubjectRepository'
import type { Id, Lesson } from '../types/entities'

export async function getLessonForSession(studentId: Id, subjectId: Id): Promise<Lesson | undefined> {
  const studentSubject = await getStudentSubject(studentId, subjectId)
  if (studentSubject?.currentLessonId) {
    const current = await getLessonById(studentSubject.currentLessonId)
    if (current) return current
  }

  const book = (await getBooks()).find((b) => b.subjectId === subjectId)
  if (!book) return undefined

  for (const unit of await getUnits(book.id)) {
    const lesson = (await getLessons(unit.id)).find((l) => l.contentType === 'درس')
    if (lesson) return lesson
  }
  return undefined
}

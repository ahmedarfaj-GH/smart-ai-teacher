// إدارة علاقة الطالب بالمادة: التفعيل والموضع الحالي في المنهج (StudentSubject) — Supabase حقيقي (المرحلة 8).
// راجع القسم 17-19 في plan.md.

import { getBooks, getLessons, getUnits } from './curriculumRepository'
import { supabase } from './supabaseClient'
import type { Id, StudentSubject } from '../types/entities'

function mapRow(row: Record<string, unknown>): StudentSubject {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    subjectId: row.subject_id as string,
    teacherId: row.teacher_id as string,
    active: row.active as boolean,
    currentUnitId: (row.current_unit_id as string | null) ?? undefined,
    currentLessonId: (row.current_lesson_id as string | null) ?? undefined,
  }
}

export async function getStudentSubjects(studentId: Id): Promise<StudentSubject[]> {
  const { data, error } = await supabase.from('student_subjects').select('*').eq('student_id', studentId)
  if (error) throw error
  return (data ?? []).map(mapRow)
}

export async function getStudentSubject(studentId: Id, subjectId: Id): Promise<StudentSubject | undefined> {
  const { data, error } = await supabase
    .from('student_subjects')
    .select('*')
    .eq('student_id', studentId)
    .eq('subject_id', subjectId)
    .maybeSingle()
  if (error) throw error
  return data ? mapRow(data) : undefined
}

export async function setCurrentPosition(studentId: Id, subjectId: Id, unitId: Id, lessonId: Id): Promise<void> {
  const { error } = await supabase
    .from('student_subjects')
    .update({ current_unit_id: unitId, current_lesson_id: lessonId })
    .eq('student_id', studentId)
    .eq('subject_id', subjectId)
  if (error) throw error
}

// تحدّد أول وحدة/درس منشور تلقائيًا — حتى لا يُطلب من ولي الأمر اختيار الموضع يدويًا
// كخطوة إلزامية (قرار تجربة استخدام: بعض أولياء الأمور لا يُتوقع منهم أي إدخال إضافي).
// التقييم التشخيصي (Baseline) هو من يكتشف المستوى الحقيقي لاحقًا، لا اختيار ولي الأمر المسبق.
async function autoSetInitialPosition(studentId: Id, subjectId: Id): Promise<void> {
  const books = await getBooks()
  const book = books.find((b) => b.subjectId === subjectId)
  if (!book) return

  const units = await getUnits(book.id)
  const firstPublishedUnit = units.find((u) => u.status === 'published')
  if (!firstPublishedUnit) return

  const lessons = await getLessons(firstPublishedUnit.id)
  const firstPublishedLesson = lessons.find((l) => l.status === 'published')
  if (!firstPublishedLesson) return

  await setCurrentPosition(studentId, subjectId, firstPublishedUnit.id, firstPublishedLesson.id)
}

export async function activateSubject(studentId: Id, subjectId: Id, teacherId: Id): Promise<StudentSubject> {
  const { error } = await supabase
    .from('student_subjects')
    .upsert(
      { student_id: studentId, subject_id: subjectId, teacher_id: teacherId, active: true },
      { onConflict: 'student_id,subject_id' },
    )
  if (error) throw error

  await autoSetInitialPosition(studentId, subjectId)

  const activated = await getStudentSubject(studentId, subjectId)
  if (!activated) throw new Error('تعذّر تفعيل المادة.')
  return activated
}

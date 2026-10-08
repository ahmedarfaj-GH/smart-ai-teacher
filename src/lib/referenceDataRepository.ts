// بيانات مرجعية (سنوات/مراحل/صفوف/فصول/مواد/مهارات/معلمين) — قراءة فقط من قاعدة البيانات الحقيقية،
// تحل محل الاستيراد الثابت من seed.ts بعد الانتقال لـ Supabase (المرحلة 8).

import { supabase } from './supabaseClient'
import type { AcademicYear, Grade, Id, Semester, Skill, Stage, Subject, Teacher } from '../types/entities'

function mapTeacher(row: Record<string, unknown>): Teacher {
  return {
    id: row.id as string,
    name: row.name as string,
    gender: row.gender as string,
    stage: row.stage as string,
    language: row.language as string,
    teachingStyle: row.teaching_style as string,
    childSafety: row.child_safety as string,
    hintFirst: row.hint_first as boolean,
    giveDirectAnswer: row.give_direct_answer as boolean,
    oneInstructionAtATime: row.one_instruction_at_a_time as boolean,
    sessionLengthMinutes: [row.session_length_min as number, row.session_length_max as number],
  }
}

export async function getAcademicYears(): Promise<AcademicYear[]> {
  const { data, error } = await supabase.from('academic_years').select('id, label')
  if (error) throw error
  return data ?? []
}

export async function getStages(): Promise<Stage[]> {
  const { data, error } = await supabase.from('stages').select('id, academic_year_id, name')
  if (error) throw error
  return (data ?? []).map((r) => ({ id: r.id, academicYearId: r.academic_year_id, name: r.name }))
}

export async function getGrades(): Promise<Grade[]> {
  const { data, error } = await supabase.from('grades').select('id, stage_id, name')
  if (error) throw error
  return (data ?? []).map((r) => ({ id: r.id, stageId: r.stage_id, name: r.name }))
}

export async function getSemesters(): Promise<Semester[]> {
  const { data, error } = await supabase.from('semesters').select('id, grade_id, name')
  if (error) throw error
  return (data ?? []).map((r) => ({ id: r.id, gradeId: r.grade_id, name: r.name }))
}

export async function getSubjects(): Promise<Subject[]> {
  const { data, error } = await supabase.from('subjects').select('id, semester_id, name')
  if (error) throw error
  return (data ?? []).map((r) => ({ id: r.id, semesterId: r.semester_id, name: r.name }))
}

export async function getSkills(): Promise<Skill[]> {
  const { data, error } = await supabase.from('skills').select('id, name')
  if (error) throw error
  return data ?? []
}

export async function getLessonSkillIds(lessonId: Id): Promise<Id[]> {
  const { data, error } = await supabase.from('lesson_skills').select('skill_id').eq('lesson_id', lessonId)
  if (error) throw error
  return (data ?? []).map((r) => r.skill_id as Id)
}

export async function getTeachers(): Promise<Teacher[]> {
  const { data, error } = await supabase.from('teachers').select('*')
  if (error) throw error
  return (data ?? []).map(mapTeacher)
}

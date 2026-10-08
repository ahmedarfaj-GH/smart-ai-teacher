// إدارة الأبناء الحقيقيين لكل ولي أمر (المرحلة 8) — تحل محل الطالب الواحد المُثبّت (خالد) في seed.ts.

import { supabase } from './supabaseClient'
import type { Id, Student } from '../types/entities'

function mapStudent(row: Record<string, unknown>): Student {
  return {
    id: row.id as string,
    parentId: row.parent_id as string,
    name: row.name as string,
    age: row.age as number,
    gradeId: row.grade_id as string,
  }
}

export async function getMyChildren(parentId: Id): Promise<Student[]> {
  const { data, error } = await supabase.from('students').select('*').eq('parent_id', parentId)
  if (error) throw error
  return (data ?? []).map(mapStudent)
}

export async function getStudentById(studentId: Id): Promise<Student | undefined> {
  const { data, error } = await supabase.from('students').select('*').eq('id', studentId).maybeSingle()
  if (error) throw error
  return data ? mapStudent(data) : undefined
}

export async function addChild(input: { parentId: Id; name: string; age: number; gradeId: Id }): Promise<Student> {
  const { data, error } = await supabase
    .from('students')
    .insert({ parent_id: input.parentId, name: input.name, age: input.age, grade_id: input.gradeId })
    .select()
    .single()
  if (error) throw error
  return mapStudent(data)
}

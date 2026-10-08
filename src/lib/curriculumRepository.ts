// طبقة بيانات المنهج — Supabase حقيقي (المرحلة 8). كل الأدمن CRUD على books/units/lessons يمر من هنا.
// يحوّل هذا الملف بين أسماء أعمدة قاعدة البيانات (snake_case) وأنواع الواجهة (camelCase في entities.ts).

import { supabase } from './supabaseClient'
import type { Book, Id, Lesson, PublishStatus, Unit } from '../types/entities'

function mapBook(row: Record<string, unknown>): Book {
  return {
    id: row.id as string,
    subjectId: row.subject_id as string,
    title: row.title as string,
    bookType: row.book_type as string,
    part: row.part as string,
    source: row.source as string,
    status: row.status as PublishStatus,
    rawExtractedText: (row.raw_extracted_text as string | null) ?? undefined,
  }
}

function mapUnit(row: Record<string, unknown>): Unit {
  return {
    id: row.id as string,
    bookId: row.book_id as string,
    order: row.order as number,
    title: row.title as string,
    status: row.status as PublishStatus,
  }
}

function mapLesson(row: Record<string, unknown>): Lesson {
  return {
    id: row.id as string,
    unitId: row.unit_id as string,
    order: row.order as number,
    title: row.title as string,
    contentType: row.content_type as string,
    pages: row.pages as string,
    status: row.status as PublishStatus,
  }
}

export async function getBooks(): Promise<Book[]> {
  const { data, error } = await supabase.from('books').select('*').order('created_at')
  if (error) throw error
  return (data ?? []).map(mapBook)
}

export async function getBookById(bookId: Id): Promise<Book | undefined> {
  const { data, error } = await supabase.from('books').select('*').eq('id', bookId).maybeSingle()
  if (error) throw error
  return data ? mapBook(data) : undefined
}

interface CreateBookInput {
  subjectId: Id
  title: string
  bookType: string
  part: string
  source: string
  rawExtractedText: string
  createdBy: Id
}

export async function createBook(input: CreateBookInput): Promise<Book> {
  const { data, error } = await supabase
    .from('books')
    .insert({
      subject_id: input.subjectId,
      title: input.title,
      book_type: input.bookType,
      part: input.part,
      source: input.source,
      raw_extracted_text: input.rawExtractedText,
      created_by: input.createdBy,
      status: 'draft',
    })
    .select()
    .single()
  if (error) throw error
  return mapBook(data)
}

export async function getUnits(bookId: Id): Promise<Unit[]> {
  const { data, error } = await supabase.from('units').select('*').eq('book_id', bookId).order('order')
  if (error) throw error
  return (data ?? []).map(mapUnit)
}

export async function getUnitById(unitId: Id): Promise<Unit | undefined> {
  const { data, error } = await supabase.from('units').select('*').eq('id', unitId).maybeSingle()
  if (error) throw error
  return data ? mapUnit(data) : undefined
}

export async function createUnit(bookId: Id, title: string): Promise<Unit> {
  const existing = await getUnits(bookId)
  const nextOrder = existing.length > 0 ? Math.max(...existing.map((u) => u.order)) + 1 : 1
  const { data, error } = await supabase
    .from('units')
    .insert({ book_id: bookId, title, order: nextOrder, status: 'draft' })
    .select()
    .single()
  if (error) throw error
  return mapUnit(data)
}

export async function getLessons(unitId: Id): Promise<Lesson[]> {
  const { data, error } = await supabase.from('lessons').select('*').eq('unit_id', unitId).order('order')
  if (error) throw error
  return (data ?? []).map(mapLesson)
}

export async function getLessonById(lessonId: Id): Promise<Lesson | undefined> {
  const { data, error } = await supabase.from('lessons').select('*').eq('id', lessonId).maybeSingle()
  if (error) throw error
  return data ? mapLesson(data) : undefined
}

interface CreateLessonInput {
  title: string
  contentType: string
  pages: string
}

export async function createLesson(unitId: Id, input: CreateLessonInput): Promise<Lesson> {
  const existing = await getLessons(unitId)
  const nextOrder = existing.length > 0 ? Math.max(...existing.map((l) => l.order)) + 1 : 1
  const { data, error } = await supabase
    .from('lessons')
    .insert({
      unit_id: unitId,
      title: input.title,
      content_type: input.contentType,
      pages: input.pages,
      order: nextOrder,
      status: 'draft',
    })
    .select()
    .single()
  if (error) throw error
  return mapLesson(data)
}

// مسار الاعتماد والنشر: draft → reviewed → published (راجع القسم 12 في plan.md)
export function getNextPublishStatus(status: PublishStatus): PublishStatus | null {
  if (status === 'draft') return 'reviewed'
  if (status === 'reviewed') return 'published'
  return null
}

export async function setUnitStatus(unitId: Id, status: PublishStatus): Promise<void> {
  const { error } = await supabase.from('units').update({ status }).eq('id', unitId)
  if (error) throw error
}

export async function setLessonStatus(lessonId: Id, status: PublishStatus): Promise<void> {
  const { error } = await supabase.from('lessons').update({ status }).eq('id', lessonId)
  if (error) throw error
}

export async function renameUnit(unitId: Id, title: string): Promise<void> {
  const { error } = await supabase.from('units').update({ title }).eq('id', unitId)
  if (error) throw error
}

export async function renameLesson(lessonId: Id, title: string): Promise<void> {
  const { error } = await supabase.from('lessons').update({ title }).eq('id', lessonId)
  if (error) throw error
}

export async function deleteUnit(unitId: Id): Promise<void> {
  const { error } = await supabase.from('units').delete().eq('id', unitId)
  if (error) throw error
}

export async function deleteLesson(lessonId: Id): Promise<void> {
  const { error } = await supabase.from('lessons').delete().eq('id', lessonId)
  if (error) throw error
}

export async function addLessonSkill(lessonId: Id, skillId: Id): Promise<void> {
  const { error } = await supabase.from('lesson_skills').insert({ lesson_id: lessonId, skill_id: skillId })
  if (error) throw error
}

export async function removeLessonSkill(lessonId: Id, skillId: Id): Promise<void> {
  const { error } = await supabase
    .from('lesson_skills')
    .delete()
    .eq('lesson_id', lessonId)
    .eq('skill_id', skillId)
  if (error) throw error
}

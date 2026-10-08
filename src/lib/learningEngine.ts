// LearningEngine — منطق حالة المهارة وقرارات الجلسة القادمة (منفصل تمامًا عن TeacherEngine)
// راجع القسم 25-30 و42 في plan.md: هذا المنطق هو المصدر الوحيد لقرارات "الإتقان" و"المراجعة".
// Supabase حقيقي (المرحلة 8) — كل دالة تكتب/تقرأ من قاعدة بيانات مشتركة، لا localStorage.

import { getSkills } from './referenceDataRepository'
import { supabase } from './supabaseClient'
import type { Id, Session, SkillStatus, StudentSkill } from '../types/entities'

function mapSession(row: Record<string, unknown>): Session {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    subjectId: row.subject_id as string,
    startedAt: row.started_at as string,
    endedAt: (row.ended_at as string | null) ?? undefined,
  }
}

function mapStudentSkill(row: Record<string, unknown>): StudentSkill {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    skillId: row.skill_id as string,
    status: row.status as SkillStatus,
  }
}

export async function startSession(studentId: Id, subjectId: Id): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ student_id: studentId, subject_id: subjectId })
    .select()
    .single()
  if (error) throw error
  return mapSession(data)
}

export async function endSession(sessionId: Id): Promise<void> {
  const { error } = await supabase.from('sessions').update({ ended_at: new Date().toISOString() }).eq('id', sessionId)
  if (error) throw error
}

interface RecordAttemptInput {
  sessionId: Id
  lessonId: Id
  skillId: Id
  score: 0 | 1 | 2 | 3
  hintsUsed: number
}

export async function recordAttempt(input: RecordAttemptInput): Promise<void> {
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('student_id')
    .eq('id', input.sessionId)
    .single()
  if (sessionError) throw sessionError

  const { count } = await supabase
    .from('activities')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', input.sessionId)

  const { data: activity, error: activityError } = await supabase
    .from('activities')
    .insert({
      session_id: input.sessionId,
      lesson_id: input.lessonId,
      skill_id: input.skillId,
      order: (count ?? 0) + 1,
    })
    .select()
    .single()
  if (activityError) throw activityError

  const { error: attemptError } = await supabase
    .from('attempts')
    .insert({ activity_id: activity.id, score: input.score, hints_used: input.hintsUsed })
  if (attemptError) throw attemptError

  await updateSkillStatus(session.student_id, input.skillId)
}

interface ScoredAttempt {
  score: 0 | 1 | 2 | 3
  sessionId: Id
}

// قاعدة الإتقان (القسم 28): لا نحكم بمهارة "متقنة" من إجابة واحدة — نحتاج تكرارًا واستقلالية واستمرارية عبر أكثر من جلسة.
export function computeSkillStatus(attempts: ScoredAttempt[]): SkillStatus {
  if (attempts.length === 0) return 'not_started'
  if (attempts.length < 2) return 'learning'

  const recent = attempts.slice(-5)
  const accuracyRate = recent.filter((a) => a.score >= 2).length / recent.length
  const independentRate = recent.filter((a) => a.score === 3).length / recent.length
  const distinctSessions = new Set(recent.map((a) => a.sessionId)).size
  const strugglingRecently = recent.slice(-2).some((a) => a.score === 0)

  if (strugglingRecently || accuracyRate < 0.5) return 'needs_practice'
  if (accuracyRate >= 0.8 && independentRate >= 0.6 && distinctSessions >= 2 && recent.length >= 4) {
    return 'mastered'
  }
  if (accuracyRate >= 0.6) return 'good'
  return 'learning'
}

async function getAttemptsForSkill(studentId: Id, skillId: Id): Promise<ScoredAttempt[]> {
  const { data, error } = await supabase
    .from('attempts')
    .select('score, created_at, activities!inner(session_id, skill_id, sessions!inner(student_id))')
    .eq('activities.skill_id', skillId)
    .eq('activities.sessions.student_id', studentId)
    .order('created_at')

  if (error) throw error

  return (data ?? []).map((row) => {
    const activities = row.activities as unknown as { session_id: Id }
    return { score: row.score as 0 | 1 | 2 | 3, sessionId: activities.session_id }
  })
}

async function updateSkillStatus(studentId: Id, skillId: Id): Promise<void> {
  const status = computeSkillStatus(await getAttemptsForSkill(studentId, skillId))
  const { error } = await supabase
    .from('student_skills')
    .upsert({ student_id: studentId, skill_id: skillId, status }, { onConflict: 'student_id,skill_id' })
  if (error) throw error
}

export async function getStudentSkills(studentId: Id): Promise<StudentSkill[]> {
  const { data, error } = await supabase.from('student_skills').select('*').eq('student_id', studentId)
  if (error) throw error
  return (data ?? []).map(mapStudentSkill)
}

export async function getSkillStatus(studentId: Id, skillId: Id): Promise<SkillStatus> {
  const { data, error } = await supabase
    .from('student_skills')
    .select('status')
    .eq('student_id', studentId)
    .eq('skill_id', skillId)
    .maybeSingle()
  if (error) throw error
  return (data?.status as SkillStatus) ?? 'not_started'
}

export type SessionPlan = { type: 'review'; skillId: Id; skillName: string } | { type: 'new_lesson' }

// راجع القسم 30 في plan.md: يجب أن تتأثر الجلسة القادمة بنتائج الجلسة السابقة.
export async function getNextSessionPlan(studentId: Id): Promise<SessionPlan> {
  const studentSkills = await getStudentSkills(studentId)
  const needsPractice = studentSkills.find((s) => s.status === 'needs_practice')
  if (!needsPractice) return { type: 'new_lesson' }

  const skills = await getSkills()
  const skill = skills.find((s) => s.id === needsPractice.skillId)
  return { type: 'review', skillId: needsPractice.skillId, skillName: skill?.name ?? '' }
}

// راجع القسم 4 في plan.md: 5 جلسات أسبوعيًا هو الهدف الأسبوعي في البيانات التجريبية.
const WEEKLY_SESSION_TARGET = 5

function startOfWeek(date: Date): Date {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - start.getDay())
  return start
}

export interface WeeklySessionStats {
  completed: number
  target: number
  minutes: number
}

export async function getWeeklySessionStats(studentId: Id): Promise<WeeklySessionStats> {
  const weekStart = startOfWeek(new Date())
  const { data, error } = await supabase
    .from('sessions')
    .select('started_at, ended_at')
    .eq('student_id', studentId)
    .gte('started_at', weekStart.toISOString())
  if (error) throw error

  const sessionsThisWeek = data ?? []
  const completed = sessionsThisWeek.filter((s) => s.ended_at).length
  const minutes = sessionsThisWeek.reduce((sum, s) => {
    if (!s.ended_at) return sum
    return sum + (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000
  }, 0)

  return { completed, target: WEEKLY_SESSION_TARGET, minutes: Math.round(minutes) }
}

export interface ProgressSummary {
  bestSkill?: { id: Id; name: string }
  strugglingSkill?: { id: Id; name: string }
}

// راجع القسم 31-32: توصية ولي الأمر تُبنى من أفضل مهارة وأكثر مهارة تحتاج تدريبًا، لا من مقاييس تقنية.
export async function getProgressSummary(studentId: Id): Promise<ProgressSummary> {
  const [studentSkills, skills] = await Promise.all([getStudentSkills(studentId), getSkills()])
  const withNames = studentSkills.map((s) => ({
    ...s,
    name: skills.find((skill) => skill.id === s.skillId)?.name ?? '',
  }))

  const best = withNames.find((s) => s.status === 'mastered') ?? withNames.find((s) => s.status === 'good')
  const struggling = withNames.find((s) => s.status === 'needs_practice')

  return {
    bestSkill: best ? { id: best.skillId, name: best.name } : undefined,
    strugglingSkill: struggling ? { id: struggling.skillId, name: struggling.name } : undefined,
  }
}

export async function getLatestSession(studentId: Id): Promise<Session | undefined> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('student_id', studentId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ? mapSession(data) : undefined
}

export async function getSkillsPracticedInSession(sessionId: Id): Promise<{ id: Id; name: string }[]> {
  const { data, error } = await supabase.from('activities').select('skill_id').eq('session_id', sessionId)
  if (error) throw error

  const skillIds = new Set((data ?? []).map((r) => r.skill_id as Id))
  const skills = await getSkills()
  return skills.filter((s) => skillIds.has(s.id)).map((s) => ({ id: s.id, name: s.name }))
}

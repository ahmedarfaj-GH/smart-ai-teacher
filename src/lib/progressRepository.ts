// تقدّم الطالب في الأنشطة غير المقيَّمة آليًا (القراءة والحفظ): النظام يحتفظ بما أنجزه ولا يتحقق منه.
// "learned" = تعلّم المحفوظ وينتظر التسميع، ويؤكده ولي الأمر لاحقًا ("recited").

import { supabase } from './supabaseClient'
import type { ActivityProgressStatus, Id } from '../types/entities'

export async function getFinishedActivityIds(studentId: Id): Promise<Set<Id>> {
  const { data, error } = await supabase.from('activity_progress').select('activity_id').eq('student_id', studentId)
  if (error) throw error
  return new Set((data ?? []).map((r) => r.activity_id as Id))
}

export async function saveProgress(studentId: Id, activityId: Id, status: ActivityProgressStatus): Promise<void> {
  const { error } = await supabase
    .from('activity_progress')
    .upsert(
      { student_id: studentId, activity_id: activityId, status, updated_at: new Date().toISOString() },
      { onConflict: 'student_id,activity_id' },
    )
  if (error) throw error
}

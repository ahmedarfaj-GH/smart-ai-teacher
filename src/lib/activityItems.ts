// تحويل نشاط الكتاب إلى "عناصر" يؤديها الطالب واحدًا بعد الآخر (كلمة/جملة)، وربط نوع النشاط بالمهارة.

import type { LessonActivity, LessonActivityKind } from '../types/entities'

// أسماء المهارات في جدول skills (راجع supabase/migrations/002_real_book.sql).
export const KIND_SKILL_NAME: Partial<Record<LessonActivityKind, string>> = {
  reading: 'القراءة',
  listening: 'الاستماع والنطق',
  memorization: 'الحفظ',
  speaking: 'التحدث',
  dictation: 'الإملاء',
  writing: 'الكتابة',
}

function plain(text: string): string {
  return text.replace(/[ً-ٰٟ]/g, '').replace(/[أإآ]/g, 'ا')
}

const INSTRUCTION_LINE = /المعلم|الطالب|الطلاب/

export function getActivityItems(activity: LessonActivity): string[] {
  const lines = activity.content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !INSTRUCTION_LINE.test(l) && !plain(l).startsWith('الكلمة'))

  if (activity.kind === 'dictation' || activity.kind === 'writing') {
    const words = lines.flatMap((l) => l.split(' — ')).map((w) => w.trim()).filter((w) => w && w.length <= 30)
    return [...new Set(words)].slice(0, activity.kind === 'dictation' ? 3 : 2)
  }

  return lines
    .map((l) => (l.includes(' — ') ? l.split(' — ')[0].trim() : l))
    .filter((l) => l.length <= 120)
    .slice(0, 6)
}

// بلا علامات الترقيم حتى لا تؤثر على المطابقة مع ما يسمعه المتصفح.
export function toMatchTarget(item: string): string {
  return item.replace(/[:؟?.!،,«»"()]/g, '').trim()
}

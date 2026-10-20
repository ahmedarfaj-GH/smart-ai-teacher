// تحويل نشاط الكتاب إلى "عناصر" يؤديها الطالب واحدًا بعد الآخر (كلمة/جملة)، وربط نوع النشاط بالمهارة.

import type { LessonActivity, LessonActivityKind } from '../types/entities'
import { isTrackActive } from './tracks'

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

const INSTRUCTION_LINE = /المعلم|الطالب|الطلاب|^الشاعر|رحمه الله/

export function getActivityItems(activity: LessonActivity): string[] {
  const lines = activity.content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !INSTRUCTION_LINE.test(l) && !plain(l).startsWith('الكلمة'))

  if (activity.kind === 'dictation' || activity.kind === 'writing') {
    const words = lines.flatMap((l) => l.split(' — ')).map((w) => w.trim()).filter((w) => w && w.length <= 30 && !w.includes('...'))
    return [...new Set(words)].slice(0, activity.kind === 'dictation' ? 5 : 8)
  }

  // سطر فيه أكثر من خليتين (أبي — أمي — أخي...) قائمة كلمات: كل كلمة عنصر. سطر بخليتين (كلمة — حرف مجرّد) نأخذ كلمته فقط.
  const items = lines.flatMap((l) => {
    const cells = l.split(' — ').map((c) => c.trim()).filter(Boolean)
    if (cells.length >= 3) return cells.filter((c) => !c.includes('...')) // الأجزاء الناقصة (…مَلَ) ليست نصًّا يُقرأ
    return cells.length === 2 ? [cells[0]] : [l]
  })
  return items.filter((l) => l.length <= 120).slice(0, activity.kind === 'memorization' ? 30 : 12)
}

// ما ينطقه أحمد لعنصر في الجلسة: في أول عنصر من نشاط قراءة/كتابة يقرأ للطالب المطلوب (عنوان النشاط) ثم العنصر.
export function getItemSpeech(activity: LessonActivity, index: number, item: string): string {
  if (index !== 0 || activity.kind === 'dictation' || activity.kind === 'memorization') return item
  const instruction = activity.title
    .replace(/\*/g, '')
    .replace(/^\s*([٠-٩]+\s*[-.]\s*)?(أَوَّلًا|ثَانِيًا|ثَالِثًا|رَابِعًا|خَامِسًا|سَادِسًا|سَابِعًا)?\s*/, '')
    .trim()
  return instruction.length > 12 ? `${instruction} ${item}` : item
}

// نشاط "أقرأ الكلمات ثم أحلّلها إلى مقاطع وحروف": الطالب يحلّل في دفتره ثم يقارن بالتحليل الصحيح.
export function isAnalysisActivity(activity: LessonActivity): boolean {
  return plain(activity.title + activity.content).includes('احللها الى مقاطع') || plain(activity.title).startsWith('احلل')
}

// نشاط أسئلة (أجيب/أستخرج...): الطالب يجيب بنفسه ثم يقارن بالجواب.
export function isQuestionActivity(activity: LessonActivity): boolean {
  return plain(activity.title).includes('اجيب')
}

// يظهر في جلسة الطالب: مساره مفعَّل (القراءة والحفظ الآن) وله نص فعلي. الأهداف والأنشطة بلا نص لا تظهر.
export function isSessionActivity(activity: LessonActivity): boolean {
  return isTrackActive(activity.kind) && getActivityItems(activity).length > 0
}

// بلا علامات الترقيم حتى لا تؤثر على المطابقة مع ما يسمعه المتصفح.
export function toMatchTarget(item: string): string {
  return item.replace(/[:؟?.!،,«»"()]/g, '').trim()
}

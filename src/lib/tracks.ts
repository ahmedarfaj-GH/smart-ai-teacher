// مسارات المحتوى وتدرّج التفعيل. كل نشاط (kind) يتبع مسارًا واحدًا، والمسارات المفعَّلة فقط تظهر في جلسة الطالب.
// التدرّج (راجع الخارطة في plan.md): الآن القراءة والحفظ بلا أي تحقق آلي، وبقية المسارات تُفعَّل لاحقًا بإضافتها هنا.

import type { LessonActivityKind } from '../types/entities'

export type Track = 'reading' | 'memorization' | 'writing' | 'paper' | 'enrichment'

export const TRACK_OF_KIND: Record<LessonActivityKind, Track> = {
  reading: 'reading',
  listening: 'reading',
  speaking: 'reading',
  memorization: 'memorization',
  writing: 'writing',
  dictation: 'writing',
  paper: 'paper',
  enrichment: 'enrichment',
}

export const TRACK_LABEL: Record<Track, string> = {
  reading: 'قراءة',
  memorization: 'حفظ وتسميع',
  writing: 'كتابة وإملاء',
  paper: 'ورقي',
  enrichment: 'إثرائي',
}

export const ACTIVE_TRACKS: Track[] = ['reading', 'memorization']

export function isTrackActive(kind: LessonActivityKind): boolean {
  return ACTIVE_TRACKS.includes(TRACK_OF_KIND[kind])
}

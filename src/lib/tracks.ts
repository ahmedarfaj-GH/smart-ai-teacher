// مسارات المحتوى وتدرّج التفعيل. كل نشاط (kind) يتبع مسارًا واحدًا، والمسارات المفعَّلة فقط تظهر في جلسة الطالب.
// التدرّج: القراءة والحفظ والكتابة مفعَّلة بلا أي تحقق آلي. الكتابة بأسلوب الدفتر: الطالب يكتب على ورقه ويقارن بنفسه
// (التحقق الآلي من الخط مؤجَّل). المسار الورقي (تلوين/توصيل) يبقى خارج الجلسة.

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

export const ACTIVE_TRACKS: Track[] = ['reading', 'memorization', 'writing']

export function isTrackActive(kind: LessonActivityKind): boolean {
  return ACTIVE_TRACKS.includes(TRACK_OF_KIND[kind])
}

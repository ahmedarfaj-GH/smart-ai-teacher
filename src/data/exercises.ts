// بنك أنشطة تجريبي لدرس "صلة الرحم" فقط — هو الدرس الوحيد المُفصَّل بأنشطة في هذا الـ Prototype.
// كل نشاط مرتبط بمهارة واحدة، ويحمل نص السؤال وخيارات ومحتوى التلميحات.
//
// معرّفات lessonId/skillId هنا يجب أن تطابق UUIDs البيانات الأولية في supabase/schema.sql بالضبط
// (قسم INSERT INTO lessons / skills) — لأن recordAttempt في learningEngine.ts يكتبها كمفاتيح أجنبية حقيقية.

import type { Id } from '../types/entities'

export interface Exercise {
  id: string
  lessonId: Id
  skillId: Id
  prompt: string
  options: string[]
  correctOptionIndex: number
  hint1: string
  hint2: string
  explanation: string
}

const LESSON_SILAT_ALRAHIM: Id = '00000000-0000-0000-0000-000000000043'

const SKILL_READING_WORDS: Id = '00000000-0000-0000-0000-000000000012'
const SKILL_COMPREHENSION: Id = '00000000-0000-0000-0000-000000000014'
const SKILL_VOCABULARY: Id = '00000000-0000-0000-0000-000000000015'
const SKILL_SYLLABLE_SEGMENTATION: Id = '00000000-0000-0000-0000-000000000016'
const SKILL_LETTER_RECOGNITION: Id = '00000000-0000-0000-0000-000000000017'

export const exercises: Exercise[] = [
  {
    id: 'ex-reading-words',
    lessonId: LESSON_SILAT_ALRAHIM,
    skillId: SKILL_READING_WORDS,
    prompt: 'أي كلمة من هذه هي: «عم»؟',
    options: ['عم', 'أم', 'عن'],
    correctOptionIndex: 0,
    hint1: 'لاحظ أول حرف وآخر حرف في الكلمة.',
    hint2: 'الكلمة تبدأ بحرف العين وتنتهي بحرف الميم.',
    explanation: 'الكلمة الصحيحة هي «عم».',
  },
  {
    id: 'ex-comprehension',
    lessonId: LESSON_SILAT_ALRAHIM,
    skillId: SKILL_COMPREHENSION,
    prompt: 'جدي قال لخالد: «تعال زرني كل جمعة». مين يبي يزوره خالد؟',
    options: ['جده', 'صديقه', 'معلمه'],
    correctOptionIndex: 0,
    hint1: 'من الشخص اللي كان يتكلم مع خالد؟',
    hint2: 'الشخص اللي قال الجملة هو جد خالد.',
    explanation: 'خالد يبي يزور جده.',
  },
  {
    id: 'ex-vocabulary',
    lessonId: LESSON_SILAT_ALRAHIM,
    skillId: SKILL_VOCABULARY,
    prompt: 'مين اللي هو أخو أبوي؟',
    options: ['العم', 'الخال', 'الجد'],
    correctOptionIndex: 0,
    hint1: 'فكر بأخ الأب، مو أخ الأم.',
    hint2: 'أخو الأب يسمى بكلمة تبدأ بحرف العين.',
    explanation: 'أخو الأب يسمى «العم».',
  },
  {
    id: 'ex-syllable-segmentation',
    lessonId: LESSON_SILAT_ALRAHIM,
    skillId: SKILL_SYLLABLE_SEGMENTATION,
    prompt: 'كم مقطعًا في كلمة: «صلة»؟',
    options: ['مقطع واحد', 'مقطعان', 'ثلاث مقاطع'],
    correctOptionIndex: 1,
    hint1: 'قسّم الكلمة إلى أجزاء وأنت تنطقها ببطء.',
    hint2: 'اسمعها معي: صِ-لة.',
    explanation: 'كلمة «صلة» فيها مقطعان: صِ-لة.',
  },
  {
    // نشاط ثانٍ لنفس المهارة: يضمن محاولتين على الأقل لهذه المهارة داخل الجلسة الواحدة،
    // حتى يستطيع computeSkillStatus (راجع learningEngine.ts) الحكم عليها بأنها "تحتاج تدريب" من نفس الجلسة (القسم 30 في plan.md).
    id: 'ex-syllable-segmentation-2',
    lessonId: LESSON_SILAT_ALRAHIM,
    skillId: SKILL_SYLLABLE_SEGMENTATION,
    prompt: 'كم مقطعًا في كلمة: «جدي»؟',
    options: ['مقطع واحد', 'مقطعان', 'ثلاث مقاطع'],
    correctOptionIndex: 1,
    hint1: 'قسّمها وأنت تنطقها ببطء: جد-ي.',
    hint2: 'اسمعها معي: جد-ي، مقطعان.',
    explanation: 'كلمة «جدي» فيها مقطعان: جد-ي.',
  },
  {
    id: 'ex-letter-recognition',
    lessonId: LESSON_SILAT_ALRAHIM,
    skillId: SKILL_LETTER_RECOGNITION,
    prompt: 'وش أول حرف في كلمة: «جدي»؟',
    options: ['ج', 'د', 'ي'],
    correctOptionIndex: 0,
    hint1: 'ركز على أول صوت تسمعه في الكلمة.',
    hint2: 'اسمعها معي: جـ-دي.',
    explanation: 'أول حرف في «جدي» هو حرف الجيم (ج).',
  },
]

export function getExercisesForLesson(lessonId: Id): Exercise[] {
  return exercises.filter((e) => e.lessonId === lessonId)
}

export function getExerciseForSkill(skillId: Id): Exercise | undefined {
  return exercises.find((e) => e.skillId === skillId)
}

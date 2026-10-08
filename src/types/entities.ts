// أنواع البيانات الأساسية للمنصة — المرحلة 0 (راجع plan.md)
// كل نوع هنا يمثل كيانًا من نموذج البيانات المتفق عليه، بلا منطق، بلا محتوى تجريبي.

export type Id = string

export type PublishStatus = 'draft' | 'reviewed' | 'published'

export type SkillStatus =
  | 'not_started'
  | 'learning'
  | 'needs_practice'
  | 'good'
  | 'mastered'

export interface AcademicYear {
  id: Id
  label: string // مثال: "1448هـ"
}

export interface Stage {
  id: Id
  academicYearId: Id
  name: string // مثال: "المرحلة الابتدائية"
}

export interface Grade {
  id: Id
  stageId: Id
  name: string // مثال: "الصف الثاني الابتدائي"
}

export interface Semester {
  id: Id
  gradeId: Id
  name: string // مثال: "الفصل الدراسي الأول"
}

export interface Subject {
  id: Id
  semesterId: Id
  name: string // مثال: "لغتي"
}

export interface Book {
  id: Id
  subjectId: Id
  title: string
  bookType: string
  part: string
  source: string
  status: PublishStatus
  rawExtractedText?: string
}

export interface Unit {
  id: Id
  bookId: Id
  order: number
  title: string
  status: PublishStatus
}

export interface Lesson {
  id: Id
  unitId: Id
  order: number
  title: string
  contentType: string
  pages: string
  status: PublishStatus
}

export interface Skill {
  id: Id
  name: string // مثال: "تحليل الكلمات إلى مقاطع" — قابلة لإعادة الاستخدام عبر دروس متعددة
}

export interface LessonSkill {
  id: Id
  lessonId: Id
  skillId: Id
}

export interface Teacher {
  id: Id
  name: string // "أحمد"
  gender: string
  stage: string
  language: string
  teachingStyle: string
  childSafety: string
  hintFirst: boolean
  giveDirectAnswer: boolean
  oneInstructionAtATime: boolean
  sessionLengthMinutes: [number, number]
}

export interface Student {
  id: Id
  name: string
  age: number
  gradeId: Id
  parentId: Id
}

export interface Parent {
  id: Id
  name: string
  childrenIds: Id[]
}

export interface StudentSubject {
  id: Id
  studentId: Id
  subjectId: Id
  teacherId: Id
  active: boolean
  currentUnitId?: Id
  currentLessonId?: Id
}

export interface StudentSkill {
  id: Id
  studentId: Id
  skillId: Id
  status: SkillStatus
}

export interface Session {
  id: Id
  studentId: Id
  subjectId: Id
  startedAt: string
  endedAt?: string
}

export interface Activity {
  id: Id
  sessionId: Id
  lessonId: Id
  skillId: Id
  order: number
}

export interface Attempt {
  id: Id
  activityId: Id
  score: 0 | 1 | 2 | 3 // راجع القسم 25 في plan.md: 3=مستقل، 2=تلميح بسيط، 1=تلميح/شرح قوي، 0=لم ينجح بعد
  hintsUsed: number
  createdAt: string
}

// TeacherEngine — محرك محاكاة حوار المعلم أحمد (Mock AI)
// كل دالة تُرجع رسالة واحدة تحمل توجيهًا واحدًا فقط (راجع القسم 23 في plan.md).
// هذه الطبقة مسؤولة عن "أسلوب الكلام" فقط — لا تتخذ أي قرار تعلّمي (ذلك من مسؤولية LearningEngine).
// قابلة للاستبدال لاحقًا بمزود AI حقيقي عبر نفس التوقيعات دون تغيير أي كود مستهلك لها.

function pickRandom<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)]
}

function getWelcomeMessage(teacherName: string, studentName: string): string {
  return `هلا ${studentName} 👋 معك ${teacherName}، جاهز نتعلم سوا؟`
}

function getDiagnosticIntro(studentName: string): string {
  return `هلا ${studentName} 👋 خلنا نسوي كم تحدي بسيط عشان أعرف الأشياء اللي تعرفها.`
}

function getEncouragement(): string {
  return pickRandom(['قريب! جرب مرة ثانية.', 'كفو، حاول مرة ثانية.', 'قربت تضبطها، جرب مرة ثانية.'])
}

function getPraise(): string {
  return pickRandom(['ممتاز! 🌟', 'أحسنت!', 'كفو عليك!', 'شغل رائع!'])
}

function getHint(level: 1 | 2, hintText: string): string {
  return level === 1 ? `تلميح: ${hintText}` : `خلنا نجربها مع بعض: ${hintText}`
}

function getGentleExplanationAndMoveOn(explanation: string): string {
  return `لا بأس، ${explanation} خلنا ننتقل للي بعده.`
}

function getOutOfScopeResponse(): string {
  return 'هذا السؤال الأفضل تسأل فيه بابا أو ماما.'
}

function getNextActivityIntro(): string {
  return pickRandom(['خلنا نجرب هذي.', 'جاهز؟ هذا السؤال الجاي.', 'يلا نكمل.'])
}

function getReviewIntro(skillName: string): string {
  return `قبل نبدأ درس اليوم، خلنا نراجع شوي مهارة "${skillName}".`
}

function getSessionClosing(studentName: string): string {
  return `شغل رائع اليوم يا ${studentName}! أشوفك في الجلسة الجاية 👋`
}

// صياغة توصية ولي الأمر من بيانات LearningEngine (لا تُقرَّر هنا أي مهارة هي الأفضل/الأضعف — ذلك من مسؤوليته).
function getProgressRecommendation(input: {
  studentName: string
  bestSkillName?: string
  strugglingSkillName?: string
}): string {
  const { studentName, bestSkillName, strugglingSkillName } = input

  if (bestSkillName && strugglingSkillName) {
    return `${studentName} يتقدم جيدًا في ${bestSkillName}، ويحتاج إلى تدريب إضافي في ${strugglingSkillName}.`
  }
  if (bestSkillName) {
    return `${studentName} يتقدم بشكل ممتاز، وخصوصًا في ${bestSkillName}.`
  }
  if (strugglingSkillName) {
    return `${studentName} يحتاج إلى تدريب إضافي في ${strugglingSkillName} هذه الفترة.`
  }
  return `لسه ما عندنا بيانات كافية عن ${studentName} — بعد أول جلسة بنقدر نعطيك صورة أوضح.`
}

export const TeacherEngine = {
  getWelcomeMessage,
  getDiagnosticIntro,
  getEncouragement,
  getPraise,
  getHint,
  getGentleExplanationAndMoveOn,
  getOutOfScopeResponse,
  getNextActivityIntro,
  getReviewIntro,
  getSessionClosing,
  getProgressRecommendation,
}

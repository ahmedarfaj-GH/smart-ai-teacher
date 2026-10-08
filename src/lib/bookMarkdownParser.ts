// تحويل كتاب بصيغة Markdown إلى وحدات ودروس وأنشطة مصنَّفة بقواعد ثابتة — بلا AI وبلا تكلفة.
// البنية المتوقعة: "# الوحدة ..." وحدة، "## ..." تحتها درس/قسم، "### ..." أو سطر عريض مرقَّم "**٣ ...**" نشاط.
// ما قبل أول وحدة (الغلاف، المقدمة، الفهرس) يُتجاهل.

export type ActivityKind =
  | 'reading' // قراءة
  | 'listening' // استماع ونطق
  | 'memorization' // حفظ (نشيد)
  | 'dictation' // إملاء
  | 'writing' // كتابة حرف/كلمة
  | 'speaking' // تحدث
  | 'paper' // ورقي (تلوين/توصيل/رسم) — يؤديه الطالب مع ولي الأمر
  | 'enrichment' // إثرائي — لا يُقيَّم

export type ActivitySection = 'lesson' | 'assessment' | 'enrichment'

export interface ParsedActivity {
  kind: ActivityKind
  section: ActivitySection
  title: string
  page: string
  text: string // النص المنظَّف الذي يُنطق/يُعرض (بلا صور ولا توجيهات)
  teacherNotes: string
  parentNote: string
}

export interface ParsedLesson {
  title: string
  contentType: string
  pages: string
  activities: ParsedActivity[]
}

export interface ParsedUnit {
  title: string
  lessons: ParsedLesson[]
}

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'

// إزالة التشكيل حتى تعمل المطابقة على "الدَّرْسُ" و"الدرس" بنفس الطريقة.
function stripDiacritics(text: string): string {
  return text.replace(/[ً-ٰٟ]/g, '').replace(/[أإآ]/g, 'ا')
}

function toLatinDigits(text: string): string {
  return text.replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))
}

function isUnitHeading(title: string): boolean {
  const plain = stripDiacritics(title)
  return plain.startsWith('الوحدة') || plain.startsWith('التهيئة')
}

function contentTypeOf(title: string): string {
  const plain = stripDiacritics(title)
  if (plain.startsWith('الدرس')) return 'درس'
  if (plain.startsWith('النشيد')) return 'نشيد'
  if (plain.startsWith('نص الاستماع')) return 'استماع'
  if (plain.startsWith('التقويم')) return 'تقويم'
  if (plain.startsWith('المجموعة')) return 'تهيئة'
  if (plain.startsWith('دليل')) return 'دليل'
  return 'محتوى'
}

// الصفحة من عنوان مثل "صفحة ٩٦ — ١ أُسَمّي..." أو "... — صفحة ٩١".
function pageOf(heading: string): string {
  return toLatinDigits(heading).match(/صفحة\s+(\d+)/)?.[1] ?? ''
}

// عنوان النشاط بلا "صفحة ٩٦ —" ولا الرقم المتسلسل.
function cleanActivityTitle(heading: string): string {
  return heading
    .replace(/\*\*/g, '')
    .replace(/^صفحة\s+[٠-٩]+\s*—\s*/, '')
    .replace(/\s*—\s*صفحة\s+[٠-٩]+\s*$/, '')
    .replace(/^[٠-٩]+\s+/, '')
    .trim()
}

// التصنيف من فعل العنوان — الأكثر تحديدًا أولًا.
function kindOf(title: string, section: ActivitySection): ActivityKind {
  const t = stripDiacritics(title)
  if (section === 'enrichment') return 'enrichment'
  if (/يملى|املاء/.test(t) || /^احلل .*ثم اكتبها/.test(t)) return 'dictation'
  if (/^انشد/.test(t)) return 'memorization'
  if (/^اكتب|^ارسم دائرة .*ثم اكتبه|^اكمل الحرف/.test(t)) return 'writing'
  if (/^اقرا|^اجرد|^احلل|^ارتب الحروف|^اكون/.test(t)) return 'reading'
  if (/^استمع|^اسمي الحرف|^اميز بين الصوت|^احاكي الصوت/.test(t) || t.includes('🎧')) return 'listening'
  if (/^اتحدث|^احاكي|^اعبر|^احكي/.test(t)) return 'speaking'
  // عناوين مركّبة مثل "ألاحظ الصور وأتحدث، ثم أستمع" — نبحث عن الفعل المقصود في العنوان كله.
  if (/اتحدث|احكي|اعبر/.test(t)) return 'speaking'
  if (/اقرا/.test(t)) return 'reading'
  if (/استمع/.test(t)) return 'listening'
  if (/اكتب/.test(t)) return 'writing'
  return 'paper'
}

// نص صالح للنطق/العرض: بلا أوصاف الصور ولا التوجيهات ولا رموز Markdown.
function cleanBody(lines: string[]): { text: string; teacherNotes: string; parentNote: string } {
  const text: string[] = []
  const teacher: string[] = []
  const parent: string[] = []

  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line === '---') continue
    if (/^>\s*\*\*توجيهات للمعلم/.test(stripDiacritics(line)) || /^>\s*\*\*تنبيه/.test(stripDiacritics(line))) {
      teacher.push(line.replace(/^>\s*/, '').replace(/\*\*/g, ''))
      continue
    }
    if (/^>\s*(\*\*)?أسرتي العزيزة/.test(stripDiacritics(line))) {
      parent.push(line.replace(/^>\s*/, '').replace(/\*\*/g, ''))
      continue
    }
    if (/^>\s*\(\\\*\)/.test(line)) {
      teacher.push(line.replace(/^>\s*/, '').replace(/\\\*/g, '*'))
      continue
    }
    if (/^\[(صور|جدول)/.test(line) || /^\*\(.*\)\*$/.test(line)) continue
    if (/^\|[\s|:-]+\|$/.test(line)) continue
    const cleaned = line
      .replace(/^>\s*/, '')
      .replace(/^[-•]\s+/, '')
      .replace(/^\|(.+)\|$/, (_, cells: string) => cells.split('|').map((c) => c.trim()).filter(Boolean).join(' — '))
      .replace(/\[صور[^\]]*\]\s*—?\s*/g, '')
      .replace(/\*\*/g, '')
      .replace(/\\\*/g, '')
      .trim()
    if (cleaned) text.push(cleaned)
  }

  return { text: text.join('\n'), teacherNotes: teacher.join('\n'), parentNote: parent.join('\n') }
}

// الإملاء في الكتاب جدول فارغ (المعلم يُملي)؛ فنقترح كلمات أول نشاط قراءة في الدرس (العمود الأول من الجدول).
function fillDictationWords(lesson: ParsedLesson) {
  const reading = lesson.activities.find((a) => a.kind === 'reading' && stripDiacritics(a.text).startsWith('الكلمة'))
  if (!reading) return
  const words = reading.text
    .split('\n')
    .filter((l) => l.includes(' — '))
    .map((l) => l.split(' — ')[0].trim())
    .filter((w) => w && !/^الكلمة/.test(stripDiacritics(w)))
  for (const a of lesson.activities) if (a.kind === 'dictation' && !a.text) a.text = words.join('\n')
}

export function parseBookMarkdown(markdown: string): ParsedUnit[] {
  const units: ParsedUnit[] = []
  let currentUnit: ParsedUnit | null = null
  let currentLesson: ParsedLesson | null = null
  let section: ActivitySection = 'lesson'
  let activityHeading: string | null = null
  let activityLines: string[] = []
  let lessonHeading = ''
  let lessonPages: number[] = []
  let lastPage = ''

  function flushActivity() {
    if (currentLesson && activityHeading) {
      const { text, teacherNotes, parentNote } = cleanBody(activityLines)
      const title = cleanActivityTitle(activityHeading)
      // رأس القسم نفسه (إنجازاتي/إثرائي) بلا محتوى لا يُعدّ نشاطًا.
      if (text || teacherNotes || kindOf(title, section) === 'dictation') {
        const effectiveSection = currentLesson.contentType === 'تقويم' ? 'assessment' : section
        currentLesson.activities.push({
          kind: currentLesson.contentType === 'نشيد' ? 'memorization' : kindOf(title, effectiveSection),
          section: effectiveSection,
          title,
          page: pageOf(activityHeading) || lastPage,
          text,
          teacherNotes,
          parentNote,
        })
      }
    }
    activityHeading = null
    activityLines = []
  }

  function flushLesson() {
    flushActivity()
    if (currentLesson) {
      const pages = lessonPages
      currentLesson.pages =
        pages.length === 0 ? '' : Math.min(...pages) === Math.max(...pages) ? String(pages[0]) : `${Math.min(...pages)}–${Math.max(...pages)}`
    }
    if (currentLesson) fillDictationWords(currentLesson)
    currentLesson = null
    section = 'lesson'
    lessonPages = []
  }

  function notePage(heading: string) {
    const page = pageOf(heading)
    if (page) {
      lessonPages.push(Number(page))
      lastPage = page
    }
  }

  for (const line of markdown.split('\n')) {
    const unitMatch = line.match(/^# (.+)$/)
    const lessonMatch = line.match(/^## (.+)$/)
    const activityMatch = line.match(/^### (.+)$/)
    const boldActivityMatch = line.match(/^\*\*[٠-٩]+\s+(.+?)\*\*\s*$/)

    if (unitMatch && isUnitHeading(unitMatch[1])) {
      flushLesson()
      currentUnit = { title: unitMatch[1].trim(), lessons: [] }
      units.push(currentUnit)
    } else if (lessonMatch && currentUnit) {
      flushLesson()
      lessonHeading = lessonMatch[1].trim()
      currentLesson = { title: lessonHeading, contentType: contentTypeOf(lessonHeading), pages: '', activities: [] }
      currentUnit.lessons.push(currentLesson)
      notePage(lessonHeading)
      // أقسام مثل النشيد/الاستماع/التقويم نصّها مباشرة تحت "##" بلا "###": نشاط واحد بعنوان القسم.
      activityHeading = lessonHeading
    } else if (activityMatch && currentLesson) {
      flushActivity()
      const heading = activityMatch[1].trim()
      const plain = stripDiacritics(heading)
      if (plain.startsWith('انجازاتي')) {
        section = 'assessment'
        notePage(heading)
      } else if (plain.startsWith('اثرائي')) {
        section = 'enrichment'
        notePage(heading)
        activityHeading = heading
      } else {
        notePage(heading)
        activityHeading = heading
      }
    } else if (boldActivityMatch && currentLesson) {
      flushActivity()
      activityHeading = boldActivityMatch[0]
    } else if (currentLesson) {
      activityLines.push(line)
    }
  }
  flushLesson()

  return units
}

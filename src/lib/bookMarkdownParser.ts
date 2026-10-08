// تحويل كتاب بصيغة Markdown إلى وحدات ودروس بقواعد ثابتة — بلا AI وبلا تكلفة.
// البنية المتوقعة: "# الوحدة ..." وحدة، و"## ..." تحتها درس/قسم. ما قبل أول وحدة (الغلاف، المقدمة، الفهرس) يُتجاهل.

export interface ParsedLesson {
  title: string
  contentType: string
  pages: string
  body: string
}

export interface ParsedUnit {
  title: string
  lessons: ParsedLesson[]
}

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'

// إزالة التشكيل حتى تعمل المطابقة على "الدَّرْسُ" و"الدرس" بنفس الطريقة.
function stripDiacritics(text: string): string {
  return text.replace(/[ً-ٰٟ]/g, '')
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

// نطاق الصفحات من علامات "صفحة ٩٦" في العنوان والعناوين الفرعية.
function pagesOf(heading: string, body: string): string {
  const text = toLatinDigits(`## ${heading}\n${body}`)
  const numbers = [...text.matchAll(/^#{2,3} .*?صفحة\s+(\d+)/gm)].map((m) => Number(m[1]))
  if (numbers.length === 0) return ''
  const min = Math.min(...numbers)
  const max = Math.max(...numbers)
  return min === max ? String(min) : `${min}–${max}`
}

export function parseBookMarkdown(markdown: string): ParsedUnit[] {
  const units: ParsedUnit[] = []
  let currentUnit: ParsedUnit | null = null
  let lessonTitle: string | null = null
  let lessonLines: string[] = []

  function flushLesson() {
    if (currentUnit && lessonTitle) {
      const body = lessonLines.join('\n').trim()
      currentUnit.lessons.push({
        title: lessonTitle,
        contentType: contentTypeOf(lessonTitle),
        pages: pagesOf(lessonTitle, body),
        body,
      })
    }
    lessonTitle = null
    lessonLines = []
  }

  for (const line of markdown.split('\n')) {
    const unitMatch = line.match(/^# (.+)$/)
    const lessonMatch = line.match(/^## (.+)$/)

    if (unitMatch && isUnitHeading(unitMatch[1])) {
      flushLesson()
      currentUnit = { title: unitMatch[1].trim(), lessons: [] }
      units.push(currentUnit)
    } else if (lessonMatch && currentUnit) {
      flushLesson()
      lessonTitle = lessonMatch[1].trim()
    } else if (lessonTitle) {
      lessonLines.push(line)
    }
  }
  flushLesson()

  return units
}

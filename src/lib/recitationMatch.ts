// مطابقة ما سمعه التفريغ الصوتي مع السطر المطلوب كلمةً كلمة (بلا نموذج لغوي): نتسامح مع التشكيل وحروف الإملاء المتقاربة
// وأخطاء التعرّف الصوتي البسيطة لنطق الأطفال، ونعدّ الكلمة خطأ إن نقصت أو اختلفت كثيرًا.

function normalize(text: string): string {
  return text
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = temp
    }
  }
  return row[b.length]
}

function sameWord(expected: string, heard: string): boolean {
  if (expected === heard) return true
  if (Math.min(expected.length, heard.length) <= 3) return false // الكلمات القصيرة (أبي/امي) تُطابَق تمامًا
  return editDistance(expected, heard) / Math.max(expected.length, heard.length) <= 0.34
}

export interface MatchResult {
  matches: boolean
  wrongWords: string[] // كلمات السطر المطلوب (كما كُتبت فيه) التي لم تُسمع أو اختلفت
}

export function compareRecitation(expectedLine: string, heardText: string): MatchResult {
  const expectedWords = expectedLine.split(/\s+/).filter(Boolean)
  const expected = expectedWords.map(normalize)
  const heard = normalize(heardText).split(' ').filter(Boolean)

  // محاذاة بالبرمجة الديناميكية: أكبر عدد من الكلمات المتطابقة بنفس الترتيب.
  const m = expected.length
  const n = heard.length
  const score = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      score[i][j] = Math.max(score[i - 1][j], score[i][j - 1], score[i - 1][j - 1] + (sameWord(expected[i - 1], heard[j - 1]) ? 1 : 0))
    }
  }
  const matched = new Array<boolean>(m).fill(false)
  for (let i = m, j = n; i > 0 && j > 0; ) {
    if (sameWord(expected[i - 1], heard[j - 1]) && score[i][j] === score[i - 1][j - 1] + 1) {
      matched[i - 1] = true
      i--
      j--
    } else if (score[i - 1][j] >= score[i][j - 1]) i--
    else j--
  }

  const wrongWords = expectedWords.filter((_, i) => !matched[i])
  return { matches: wrongWords.length === 0, wrongWords }
}

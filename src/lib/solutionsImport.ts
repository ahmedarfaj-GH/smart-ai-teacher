// مطابقة ملف الحلول (md) مع أنشطة الكتاب: كل حل يُربط بالسؤال المطابق له في النص داخل نفس الصفحة،
// فيصبح جوابه الصحيح الذي يعرضه أحمد بعد "أجبت/أكملتها". ما لا يتطابق نصّه يُترك ويُعدّ في التقرير.
//
// صيغة الملف: "## صفحة ٢٤" ثم "### عنوان النشاط" ثم أسطر "س: السؤال" و"ج: الجواب" أو "ج: كلمة ← جوابها".

import { getActivityItems } from './activityItems'
import { getBookActivities } from './curriculumRepository'
import { supabase } from './supabaseClient'
import type { Id } from '../types/entities'

interface SolutionEntry {
  page: string
  question: string
  answer: string
}

// بلا تشكيل ولا أرقام ولا علامات، لتتطابق "١. لِمَاذَا غَابَتْ؟" مع "لماذا غابت".
function normalize(text: string): string {
  return text
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/[٠-٩0-9]/g, '')
    .replace(/[^\p{L}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseSolutions(markdown: string): SolutionEntry[] {
  const entries: SolutionEntry[] = []
  let page = ''
  let pendingQuestion = ''
  for (const raw of markdown.split('\n')) {
    const line = raw.trim()
    const pageMatch = line.match(/^##\s+صفحة\s+([٠-٩0-9]+)/)
    if (pageMatch) {
      page = pageMatch[1].replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      pendingQuestion = ''
    } else if (line.startsWith('س:')) {
      pendingQuestion = line.slice(2).trim()
    } else if (line.startsWith('ج:') && page) {
      const body = line.slice(2).trim()
      if (pendingQuestion) {
        entries.push({ page, question: pendingQuestion, answer: body })
        pendingQuestion = ''
      } else if (body.includes('←')) {
        const [question, answer] = body.split('←').map((s) => s.trim())
        if (question && answer) entries.push({ page, question, answer })
      }
    }
  }
  return entries
}

export async function importSolutions(bookId: Id, markdown: string): Promise<{ matched: number; total: number }> {
  const entries = parseSolutions(markdown)
  const activities = await getBookActivities(bookId)
  let matched = 0

  for (const activity of activities) {
    const forPage = entries.filter((e) => e.page === activity.page)
    if (forPage.length === 0) continue
    const answers = { ...activity.answers }
    let changed = false
    for (const item of getActivityItems(activity)) {
      const key = normalize(item)
      if (key.length < 3) continue
      const hit = forPage.find((e) => {
        const q = normalize(e.question)
        return q.length >= 3 && (key.includes(q) || q.includes(key))
      })
      if (hit) {
        answers[item] = { ...answers[item], word: hit.answer }
        matched++
        changed = true
      }
    }
    if (changed) {
      const { error } = await supabase.from('lesson_activities').update({ answers }).eq('id', activity.id)
      if (error) throw error
    }
  }
  return { matched, total: entries.length }
}

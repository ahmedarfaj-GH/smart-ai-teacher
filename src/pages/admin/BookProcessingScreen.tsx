import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { createBook, createLesson, createUnit } from '../../lib/curriculumRepository'
import { parseBookMarkdown } from '../../lib/bookMarkdownParser'
import { extractPdfText, type ExtractionProgress } from '../../lib/pdfExtractor'
import type { Book, Id } from '../../types/entities'

interface LocationState {
  file: File
  title: string
  bookType: string
  part: string
  source: string
  subjectId: Id
}

export function BookProcessingScreen() {
  const location = useLocation()
  const state = location.state as LocationState | null
  const { profile } = useAuth()

  const [progress, setProgress] = useState<ExtractionProgress | null>(null)
  const [extractedText, setExtractedText] = useState<string | null>(null)
  const [book, setBook] = useState<Book | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!state?.file || !profile) return
    let cancelled = false

    async function run() {
      try {
        const isMarkdown = state!.file.name.toLowerCase().endsWith('.md')
        const text = isMarkdown
          ? await state!.file.text()
          : await extractPdfText(state!.file, (p) => {
              if (!cancelled) setProgress(p)
            })
        if (cancelled) return
        setExtractedText(text)

        const created = await createBook({
          subjectId: state!.subjectId,
          title: state!.title,
          bookType: state!.bookType,
          part: state!.part,
          source: state!.source,
          rawExtractedText: text,
          createdBy: profile!.id,
        })
        // كتاب Markdown: تُنشأ الوحدات والدروس تلقائيًا من العناوين (مسودة، تُراجع قبل النشر).
        if (isMarkdown) {
          for (const unit of parseBookMarkdown(text)) {
            const createdUnit = await createUnit(created.id, unit.title)
            for (const lesson of unit.lessons) {
              await createLesson(createdUnit.id, {
                title: lesson.title,
                contentType: lesson.contentType,
                pages: lesson.pages,
              })
            }
          }
        }
        if (!cancelled) setBook(created)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'تعذّر معالجة الملف.')
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [state?.file, profile])

  if (!state?.file) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <p className="text-gray-500">لم يتم رفع ملف. ارجع لصفحة إضافة كتاب وابدأ من جديد.</p>
        <Link to="/admin/books/new" className="mt-4 inline-block text-purple-600 hover:underline">
          → رجوع لإضافة كتاب
        </Link>
      </div>
    )
  }

  const extracted = extractedText !== null
  const done = book !== null

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="text-2xl font-bold text-gray-900">جارِ قراءة الملف: {state.file.name}</h1>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        {error ? (
          <p className="text-red-600">{error}</p>
        ) : extracted ? (
          <p className="text-green-700">
            ✓ تمت قراءة الملف{progress ? ` (${progress.totalPages} صفحة)` : ''}{done ? ' — وتم إنشاء الكتاب.' : ' — جارِ الحفظ...'}
          </p>
        ) : progress ? (
          <div>
            <p className="text-gray-700">
              جارِ القراءة — صفحة {progress.pageNumber} من {progress.totalPages}
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full bg-purple-600 transition-all"
                style={{ width: `${(progress.pageNumber / progress.totalPages) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-gray-400">جارِ فتح الملف...</p>
        )}
      </div>

      {extracted && (
        <div className="mt-4 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          <div className="mb-2 text-xs font-semibold text-gray-400">
            معاينة النص المستخرج (خام — نظّمه يدويًا إلى وحدات ودروس في شاشة المراجعة)
          </div>
          <p className="whitespace-pre-wrap">
            {extractedText.slice(0, 4000) || 'لم يُعثر على نص قابل للاستخراج في هذا الملف.'}
          </p>
        </div>
      )}

      {done && (
        <Link
          to={`/admin/books/${book.id}`}
          className="animate-fade-in-up mt-4 inline-block rounded-lg bg-purple-600 px-5 py-3 text-sm font-semibold text-white hover:bg-purple-700"
        >
          مراجعة المحتوى
        </Link>
      )}
    </div>
  )
}

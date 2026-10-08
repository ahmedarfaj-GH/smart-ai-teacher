import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CurriculumTree } from '../../components/CurriculumTree'
import { StatusBadge } from '../../components/StatusBadge'
import { getBookById } from '../../lib/curriculumRepository'
import type { Book } from '../../types/entities'

export function CurriculumReviewScreen() {
  const { bookId } = useParams<{ bookId: string }>()
  const [book, setBook] = useState<Book | null | undefined>(undefined)
  const [showRawText, setShowRawText] = useState(false)

  useEffect(() => {
    if (!bookId) return
    getBookById(bookId).then((b) => setBook(b ?? null))
  }, [bookId])

  if (book === undefined) {
    return <p className="p-6 text-gray-400">جارِ التحميل...</p>
  }

  if (!book) {
    return (
      <div className="p-6">
        <Link to="/admin" className="text-sm text-gray-500 hover:text-gray-700">
          → رجوع
        </Link>
        <p className="mt-4 text-gray-500">الكتاب غير موجود.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link to="/admin" className="text-sm text-gray-500 hover:text-gray-700">
        → رجوع
      </Link>
      <div className="mt-2 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{book.title}</h1>
        <StatusBadge status={book.status} />
      </div>
      <p className="mt-1 text-sm text-gray-500">
        {book.bookType} · {book.part} · {book.source}
      </p>

      {book.rawExtractedText && (
        <div className="mt-4">
          <button
            onClick={() => setShowRawText((v) => !v)}
            className="text-xs font-semibold text-purple-600 hover:underline"
          >
            {showRawText ? 'إخفاء النص المستخرج' : 'عرض النص المستخرج من الملف الأصلي'}
          </button>
          {showRawText && (
            <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <p className="whitespace-pre-wrap">{book.rawExtractedText}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        <CurriculumTree bookId={book.id} />
      </div>
    </div>
  )
}

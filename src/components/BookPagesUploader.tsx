// رفع صور صفحات الكتاب من ملف PDF الأصلي، لتظهر للطالب مع أنشطته. الرفع مرة واحدة ويمكن إعادته.
import { useState } from 'react'
import { uploadBookPages } from '../lib/bookPagesUpload'
import type { Id } from '../types/entities'

export function BookPagesUploader({ bookId }: { bookId: Id }) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [finished, setFinished] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const running = progress !== null && !finished && !error

  async function handleFile(file: File) {
    setError(null)
    setFinished(false)
    setProgress({ done: 0, total: 0 })
    try {
      await uploadBookPages(bookId, file, (done, total) => setProgress({ done, total }))
      setFinished(true)
    } catch (err) {
      setError(typeof err === 'object' && err && 'message' in err ? String(err.message) : 'تعذّر رفع الصفحات.')
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-sm font-semibold text-gray-700">صور صفحات الكتاب</div>
      <p className="mt-1 text-xs text-gray-500">ارفع ملف PDF الأصلي لتظهر صفحة كل نشاط للطالب مع أحمد.</p>
      <input
        type="file"
        accept="application/pdf"
        disabled={running}
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        className="mt-2 block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-purple-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-purple-700"
      />
      {progress && !finished && !error && (
        <p className="mt-2 text-xs text-gray-500">
          جارِ الرفع: {progress.done} من {progress.total || '…'}
        </p>
      )}
      {finished && <p className="mt-2 text-xs font-semibold text-green-600">تم رفع {progress?.total} صفحة ✓</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}

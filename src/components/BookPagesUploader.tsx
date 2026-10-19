// رفع صور الكتاب (ملفات صور) لتظهر للطالب مع أنشطة صفحاتها. اسم الملف يحمل رقم الصفحة: p27-1.jpg ← صفحة 27.
import { useState } from 'react'
import { uploadBookImages } from '../lib/bookPagesUpload'
import type { Id } from '../types/entities'

export function BookPagesUploader({ bookId }: { bookId: Id }) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [finished, setFinished] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const running = progress !== null && !finished && !error

  async function handleFiles(files: File[]) {
    setError(null)
    setFinished(false)
    setProgress({ done: 0, total: files.length })
    try {
      await uploadBookImages(bookId, files, (done, total) => setProgress({ done, total }))
      setFinished(true)
    } catch (err) {
      setError(typeof err === 'object' && err && 'message' in err ? String(err.message) : 'تعذّر رفع الصور.')
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-sm font-semibold text-gray-700">صور الكتاب</div>
      <p className="mt-1 text-xs text-gray-500">اختر ملفات الصور معًا. رقم الصفحة أول رقم في اسم الملف (p27-1.jpg ← صفحة 27).</p>
      <input
        type="file"
        accept="image/*"
        multiple
        disabled={running}
        onChange={(e) => e.target.files?.length && handleFiles(Array.from(e.target.files))}
        className="mt-2 block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-purple-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-purple-700"
      />
      {running && (
        <p className="mt-2 text-xs text-gray-500">
          جارِ الرفع: {progress.done} من {progress.total}
        </p>
      )}
      {finished && <p className="mt-2 text-xs font-semibold text-green-600">تم رفع {progress?.total} صورة ✓</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}

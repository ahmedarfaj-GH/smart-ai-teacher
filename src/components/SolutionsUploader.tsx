// رفع ملف الحلول (md) لمطابقته مع أسئلة الكتاب وترتيب كل جواب مع سؤاله.
import { useState } from 'react'
import { importSolutions } from '../lib/solutionsImport'
import type { Id } from '../types/entities'

export function SolutionsUploader({ bookId }: { bookId: Id }) {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ matched: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)
    setResult(null)
    setRunning(true)
    try {
      setResult(await importSolutions(bookId, await file.text()))
    } catch (err) {
      setError(typeof err === 'object' && err && 'message' in err ? String(err.message) : 'تعذّر استيراد الحلول.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-sm font-semibold text-gray-700">ملف الإجابات والحلول</div>
      <p className="mt-1 text-xs text-gray-500">
        ارفع ملف الحلول (md). يُطابَق كل حل مع سؤاله في نفس الصفحة ليعرضه أحمد بعد أن يجيب الطالب.
      </p>
      <input
        type="file"
        accept=".md,text/markdown,text/plain"
        disabled={running}
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        className="mt-2 block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-purple-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-purple-700"
      />
      {running && <p className="mt-2 text-xs text-gray-500">جارِ المطابقة...</p>}
      {result && (
        <p className="mt-2 text-xs font-semibold text-green-600">
          تمت مطابقة {result.matched} من {result.total} حلًّا مع أسئلة الكتاب.
          {result.matched === 0 && ' تأكد أن الحلول لنفس الكتاب (أرقام الصفحات ونص الأسئلة).'}
        </p>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}

// توليد مسبق لصوت الكتاب (اختياري): يجمع نصوص مسار القراءة (قراءة/استماع/تحدث) وعبارات أحمد الثابتة،
// ويولّد ما ليس محفوظًا فقط. وأي نص لم يُولَّد هنا يُولَّد تلقائيًا عند أول تشغيل له من أي مستخدم ويُحفظ للجميع.
import { useEffect, useRef, useState } from 'react'
import { getActivityItems } from '../lib/activityItems'
import { countCached, generateAndStoreAudio } from '../lib/audioCache'
import { getBookActivities } from '../lib/curriculumRepository'
import { TeacherEngine } from '../lib/teacherEngine'
import type { Id, LessonActivityKind } from '../types/entities'

// مسار القراءة فقط في هذه المرحلة (الحفظ والكتابة لاحقًا — راجع الخارطة في plan.md).
const READING_TRACK: LessonActivityKind[] = ['reading', 'listening', 'speaking']
const CONCURRENCY = 3

export function AudioGenerator({ bookId }: { bookId: Id }) {
  const [texts, setTexts] = useState<string[]>([])
  const [cached, setCached] = useState(0)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const stopRef = useRef(false)

  async function refresh(list: string[]) {
    setCached(await countCached(list))
  }

  useEffect(() => {
    async function load() {
      const activities = await getBookActivities(bookId)
      const bookTexts = activities.filter((a) => READING_TRACK.includes(a.kind)).flatMap(getActivityItems)
      const all = [...new Set([...bookTexts, ...TeacherEngine.getFixedPhrases()])]
      setTexts(all)
      await refresh(all)
    }
    load().catch((err) => setError(err?.message ?? 'تعذّر تحميل الأنشطة.'))
  }, [bookId])

  async function generateMissing() {
    stopRef.current = false
    setError(null)
    setRunning(true)
    const queue = [...texts]

    async function worker() {
      while (queue.length > 0 && !stopRef.current) {
        const text = queue.shift() as string
        try {
          if ((await generateAndStoreAudio(text)) === 'generated') setCached((c) => c + 1)
        } catch (err) {
          // نوقف عند أول خطأ (مفتاح خاطئ/حد استخدام) ويمكن المتابعة لاحقًا: ما حُفظ لا يُعاد توليده.
          stopRef.current = true
          setError(err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err))
        }
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
    await refresh(texts)
    setRunning(false)
  }

  const missing = texts.length - cached
  return (
    <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-gray-700">صوت أحمد (يُولَّد مرة واحدة ويُحفظ للجميع)</h2>
      <p className="mt-1 text-sm text-gray-500">
        مسار القراءة وعبارات أحمد الثابتة: {texts.length} نصًّا — الجاهز {cached} — الناقص {Math.max(missing, 0)}
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={generateMissing}
          disabled={running || missing <= 0}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {running ? 'جارِ التوليد...' : missing <= 0 && texts.length > 0 ? 'كل الأصوات جاهزة ✓' : 'توليد الأصوات الناقصة'}
        </button>
        {running && (
          <button
            onClick={() => (stopRef.current = true)}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700"
          >
            إيقاف
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}

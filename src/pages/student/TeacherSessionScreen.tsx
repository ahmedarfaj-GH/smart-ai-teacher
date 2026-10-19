import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { TeacherAvatar } from '../../components/TeacherAvatar'
import { getActivityItems, isSessionActivity } from '../../lib/activityItems'
import { loadAudioCache, playSpeechAudio, prefetchAudio, stopAudio } from '../../lib/audioCache'
import { getLessonActivities, getLessonById } from '../../lib/curriculumRepository'
import { endSession, startSession } from '../../lib/learningEngine'
import { getFinishedActivityIds, getLastFinishedLessonId, saveProgress } from '../../lib/progressRepository'
import { getSubjects, getTeachers } from '../../lib/referenceDataRepository'
import { getLessonForSession } from '../../lib/sessionContent'
import { getStudentById } from '../../lib/studentsRepository'
import { TeacherEngine } from '../../lib/teacherEngine'
import { TRACK_OF_KIND } from '../../lib/tracks'
import type { Id, Lesson, LessonActivity, Student, Teacher } from '../../types/entities'

// المرحلة الحالية بلا أي تحقق آلي: أحمد ينطق والطالب يستمع ويردد، ويضغط "التالي" بنفسه.
// read = قراءة (يسمع ويقرأ) — memorize = حفظ: يسمع كل سطر ويردده، ثم يسمّع المحفوظ لولي أمره (التسميع يؤكده ولي الأمر لاحقًا).
type Mode = 'read' | 'memorize'

interface PlannedActivity {
  activity: LessonActivity
  items: string[]
  mode: Mode
}

export function TeacherSessionScreen() {
  const { studentId } = useParams<{ studentId: string }>()
  const navigate = useNavigate()
  // ?repeat=1 → إعادة آخر درس أنجزه الطالب (كل أنشطته من جديد)، بدل التقدّم إلى درس جديد.
  const repeat = useSearchParams()[0].get('repeat') === '1'
  const startedRef = useRef(false)

  const [student, setStudent] = useState<Student | null>(null)
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [lesson, setLesson] = useState<Lesson | null | undefined>(undefined)
  const [sessionId, setSessionId] = useState<Id | null>(null)
  const [plans, setPlans] = useState<PlannedActivity[]>([])
  const [activityIndex, setActivityIndex] = useState(0)
  const [itemIndex, setItemIndex] = useState(0)
  const [begun, setBegun] = useState(false) // الطفل يضغط "يلا نبدأ" بعد ترحيب أحمد
  const [reciting, setReciting] = useState(false) // آخر خطوة في الحفظ: تسميع المحفوظ لولي الأمر
  const [complete, setComplete] = useState(false)
  const [say, setSay] = useState('')
  const [audioFailed, setAudioFailed] = useState(false)
  const [audioLoading, setAudioLoading] = useState(false)

  // ref guard: نبدأ الجلسة مرة واحدة فقط، حتى مع الاستدعاء المزدوج لـ React StrictMode في وضع التطوير.
  useLayoutEffect(() => {
    if (startedRef.current || !studentId) return
    startedRef.current = true

    async function setup() {
      const [s, subjects, teachers] = await Promise.all([getStudentById(studentId!), getSubjects(), getTeachers()])
      const subject = subjects[0]
      const currentTeacher = teachers[0]
      if (!s || !subject || !currentTeacher) return
      setStudent(s)
      setTeacher(currentTeacher)

      const lastLessonId = repeat ? await getLastFinishedLessonId(s.id) : undefined
      const currentLesson = repeat
        ? lastLessonId && (await getLessonById(lastLessonId))
        : await getLessonForSession(s.id, subject.id)
      setLesson(currentLesson || null)
      if (!currentLesson) return

      const finished = repeat ? new Set<Id>() : await getFinishedActivityIds(s.id)
      const planned: PlannedActivity[] = (await getLessonActivities(currentLesson.id))
        .filter((a) => isSessionActivity(a) && !finished.has(a.id))
        .map((activity) => ({
          activity,
          items: getActivityItems(activity),
          mode: TRACK_OF_KIND[activity.kind] === 'memorization' ? 'memorize' : 'read',
        }))

      // نحمّل الصوت المحفوظ (طلب واحد)؛ وما ليس محفوظًا يُولَّد عند أول نطق ويُحفظ للجميع.
      await loadAudioCache([...planned.flatMap((p) => p.items), ...TeacherEngine.getFixedPhrases()]).catch(() => 0)

      const session = await startSession(s.id, subject.id)
      const welcome = TeacherEngine.getWelcomeMessage(currentTeacher.name, s.name)
      setSessionId(session.id)
      setPlans(planned)
      setSay(welcome)
      // نجهّز في الخلفية صوت الترحيب وكل أسطر الجلسة (بالتتابع)، حتى لا ينتظر الطفل توليدها عند الضغط.
      prefetchAudio([welcome, ...planned.flatMap((p) => p.items)])
    }

    setup()
  }, [studentId])

  const current = plans[activityIndex]
  const currentItem = current?.items[itemIndex]

  // الصوت الوحيد: صوت أحمد المحفوظ (يُولَّد ويُحفظ أول مرة فقط). لا صوت بديل؛ عند الفشل يظهر زر إعادة المحاولة.
  async function speakBest(text: string) {
    setAudioFailed(false)
    const timer = setTimeout(() => setAudioLoading(true), 900) // لا نُظهر المؤشر إلا إن طال التجهيز
    const ok = await playSpeechAudio(text)
    clearTimeout(timer)
    setAudioLoading(false)
    if (!ok) setAudioFailed(true)
  }

  // السطر التالي (أو أول سطر في النشاط التالي) يُجهَّز صوته مسبقًا أثناء نطق الحالي.
  function upcomingTexts(): string[] {
    if (!current) return []
    if (itemIndex + 1 < current.items.length) return current.items.slice(itemIndex + 1, itemIndex + 3)
    return plans[activityIndex + 1]?.items.slice(0, 1) ?? []
  }

  // أحمد ينطق كل رسالة بعد أن يضغط الطفل "يلا نبدأ" (المتصفح لا يسمح بتشغيل الصوت قبل أي لمسة).
  useEffect(() => {
    if (!begun || !say) return
    speakBest(say)
    prefetchAudio(upcomingTexts())
  }, [say, begun])

  useEffect(() => stopAudio, [])

  function startActivity(index: number) {
    setActivityIndex(index)
    setItemIndex(0)
    setReciting(false)
    setSay(plans[index].items[0])
  }

  function handleStart() {
    if (plans.length === 0) return
    setBegun(true)
    startActivity(0)
  }

  async function finishActivity() {
    if (!student || !current) return
    // لا تحقق آلي: نحفظ الإنجاز فقط. المحفوظ يبقى "تعلّمه" حتى يؤكد ولي الأمر التسميع.
    await saveProgress(student.id, current.activity.id, current.mode === 'memorize' ? 'learned' : 'done')

    const next = activityIndex + 1
    if (next < plans.length) {
      startActivity(next)
      return
    }
    if (sessionId) await endSession(sessionId)
    setSay(TeacherEngine.getSessionClosing(student.name))
    setComplete(true)
  }

  async function handleNext() {
    if (!current) return
    if (reciting) {
      await finishActivity()
      return
    }
    if (itemIndex + 1 < current.items.length) {
      setItemIndex(itemIndex + 1)
      setSay(current.items[itemIndex + 1])
      return
    }
    if (current.mode === 'memorize') {
      setReciting(true)
      setSay('الحين سمّع المحفوظ من حفظك لبابا أو ماما.')
      return
    }
    await finishActivity()
  }

  if (!student || !teacher) {
    return <p className="p-6 text-center text-gray-400">جارِ التحميل...</p>
  }

  const repeatLesson = () => window.location.assign(`/student/${student.id}/session?repeat=1`)

  if (lesson === null || (lesson && sessionId && plans.length === 0)) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 text-center">
        <p className="text-gray-500">أنجزتَ كل ما هو متاح الحين، أحسنت! بنضيف دروس جديدة قريبًا.</p>
        {!repeat && (
          <button onClick={repeatLesson} className="rounded-xl bg-purple-600 px-8 py-4 text-lg font-bold text-white hover:bg-purple-700">
            نعيد آخر درس
          </button>
        )}
      </div>
    )
  }

  const nextLabel = reciting ? 'سمّعت ✓' : current?.mode === 'memorize' ? 'رددتها ✓' : 'قرأتها ✓'

  return (
    <div className="mx-auto flex min-h-[calc(100vh-56px)] max-w-lg flex-col items-center justify-center gap-6 p-6">
      <TeacherAvatar name={teacher.name} />

      <div
        key={say}
        className="animate-fade-in-up flex w-full items-center gap-3 rounded-2xl bg-purple-50 p-4 text-center text-lg font-semibold text-gray-800"
      >
        <button
          onClick={() => speakBest(say)}
          aria-label="اسمع مرة ثانية"
          className="shrink-0 rounded-full bg-purple-100 p-2 text-xl hover:bg-purple-200"
        >
          🔊
        </button>
        <span className="flex-1">{say}</span>
      </div>

      {audioLoading && <p className="text-xs text-gray-400">جارِ تجهيز صوت أحمد...</p>}

      {audioFailed && (
        <button
          onClick={() => speakBest(say)}
          className="w-full rounded-lg bg-amber-50 p-3 text-center text-sm font-semibold text-amber-700 hover:bg-amber-100"
        >
          ما قدرت أسمعك صوتي. اضغط هنا وأحاول مرة ثانية
        </button>
      )}

      {!begun && sessionId && (
        <button
          onClick={handleStart}
          className="rounded-xl bg-purple-600 px-8 py-4 text-lg font-bold text-white hover:bg-purple-700"
        >
          يلا نبدأ
        </button>
      )}

      {begun && !complete && current && (
        <div key={`${activityIndex}-${itemIndex}-${reciting}`} className="animate-fade-in-up flex w-full flex-col items-center gap-4">
          <p className="text-sm text-gray-400">
            {current.activity.title}
            {current.items.length > 1 && !reciting && ` · ${itemIndex + 1} من ${current.items.length}`}
          </p>
          {!reciting && currentItem && (
            <p className="text-center text-3xl font-bold leading-relaxed text-gray-900">{currentItem}</p>
          )}
          <button
            onClick={handleNext}
            className="rounded-xl bg-purple-600 px-8 py-4 text-lg font-bold text-white hover:bg-purple-700"
          >
            {nextLabel}
          </button>
        </div>
      )}

      {complete && (
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => navigate(`/student/${student.id}/session-summary`)}
            className="rounded-xl bg-purple-600 px-8 py-4 text-lg font-bold text-white hover:bg-purple-700"
          >
            شوف ملخص الجلسة
          </button>
          <button onClick={repeatLesson} className="rounded-xl bg-purple-50 px-8 py-3 font-bold text-purple-700 hover:bg-purple-100">
            نعيد الدرس
          </button>
        </div>
      )}
    </div>
  )
}

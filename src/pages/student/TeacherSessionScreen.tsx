import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { TeacherAvatar } from '../../components/TeacherAvatar'
import { getActivityItems, isSessionActivity } from '../../lib/activityItems'
import { loadAudioCache, playSpeechAudio, prefetchAudio, stopAudio } from '../../lib/audioCache'
import { getLessonActivities, getLessonById, getUnitById } from '../../lib/curriculumRepository'
import { endSession, startSession } from '../../lib/learningEngine'
import { getFinishedActivityIds, getLastFinishedLessonId, saveProgress } from '../../lib/progressRepository'
import { bookImageUrl, bookPageImageUrl } from '../../lib/bookPages'
import { getSubjectForStudent, getTeachers } from '../../lib/referenceDataRepository'
import { getLessonForSession } from '../../lib/sessionContent'
import { getStudentById } from '../../lib/studentsRepository'
import { TeacherEngine } from '../../lib/teacherEngine'
import { TRACK_LABEL, TRACK_OF_KIND, type Track } from '../../lib/tracks'
import type { Id, Lesson, LessonActivity, Student, Teacher } from '../../types/entities'

// بلا أي تحقق آلي في هذه المرحلة؛ أحمد ينطق والطالب يؤدي ويضغط بنفسه:
// read = قراءة: يسمع ويقرأ — memorize = حفظ: يسمع كل سطر ويردده (ويعيد متى شاء) ثم يسمّع لولي أمره
// write = كتابة/إملاء بالدفتر: يسمع، يكتب على ورقه، ثم "أريد التحقق" فتظهر له الجملة ليقارن بنفسه.
type Mode = 'read' | 'memorize' | 'write'
type Step = 'item' | 'check' | 'answer' | 'recite'

const MODE_OF_TRACK: Partial<Record<Track, Mode>> = { reading: 'read', memorization: 'memorize', writing: 'write' }
const OVERVIEW_TRACKS: Track[] = ['reading', 'memorization', 'writing', 'paper']

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
  const [bookId, setBookId] = useState<Id | null>(null)
  const [failedImageUrl, setFailedImageUrl] = useState<string | undefined>()
  const [sessionId, setSessionId] = useState<Id | null>(null)
  const [plans, setPlans] = useState<PlannedActivity[]>([])
  const [overview, setOverview] = useState<{ label: string; count: number }[]>([])
  const [activityIndex, setActivityIndex] = useState(0)
  const [itemIndex, setItemIndex] = useState(0)
  const [step, setStep] = useState<Step>('item')
  const [begun, setBegun] = useState(false) // الطفل يضغط "يلا نبدأ" بعد ترحيب أحمد
  const [complete, setComplete] = useState(false)
  // shown: ما يظهر في الفقاعة — spoken: ما ينطقه أحمد (قد يختلف، مثل الإملاء: ننطق الكلمة ولا نعرضها).
  const [say, setSay] = useState({ shown: '', spoken: '' })
  const [audioFailed, setAudioFailed] = useState(false)
  const [audioLoading, setAudioLoading] = useState(false)

  function sayText(shown: string, spoken = shown) {
    setSay({ shown, spoken })
  }

  // ref guard: نبدأ الجلسة مرة واحدة فقط، حتى مع الاستدعاء المزدوج لـ React StrictMode في وضع التطوير.
  useLayoutEffect(() => {
    if (startedRef.current || !studentId) return
    startedRef.current = true

    async function setup() {
      const [s, teachers] = await Promise.all([getStudentById(studentId!), getTeachers()])
      const subject = s ? await getSubjectForStudent(s) : undefined
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
      setBookId((await getUnitById(currentLesson.unitId))?.bookId ?? null)

      const finished = repeat ? new Set<Id>() : await getFinishedActivityIds(s.id)
      const activities = await getLessonActivities(currentLesson.id)
      const planned: PlannedActivity[] = activities
        .filter((a) => isSessionActivity(a) && !finished.has(a.id))
        .map((activity) => ({
          activity,
          items: getActivityItems(activity),
          mode: MODE_OF_TRACK[TRACK_OF_KIND[activity.kind]] as Mode,
        }))

      // خطة الدرس: تصنيفات أنشطته (ما سيؤديه مع أحمد، والورقي مع ولي الأمر).
      setOverview(
        OVERVIEW_TRACKS.map((track) => ({
          label: TRACK_LABEL[track],
          count: activities.filter(
            (a) => TRACK_OF_KIND[a.kind] === track && (track === 'paper' || isSessionActivity(a)),
          ).length,
        })).filter((o) => o.count > 0),
      )

      // نحمّل الصوت المحفوظ (طلب واحد)؛ وما ليس محفوظًا يُولَّد عند أول نطق ويُحفظ للجميع.
      await loadAudioCache([...planned.flatMap((p) => [...p.items, ...Object.values(p.activity.answers).map((a) => TeacherEngine.getAnswerSpeech(a.word))]), ...TeacherEngine.getFixedPhrases()]).catch(() => 0)

      const session = await startSession(s.id, subject.id)
      const welcome = TeacherEngine.getWelcomeMessage(currentTeacher.name, s.name)
      setSessionId(session.id)
      setPlans(planned)
      sayText(welcome)
      // نجهّز في الخلفية صوت الترحيب وكل أسطر الجلسة وعباراتها الثابتة (بالتتابع)، حتى لا ينتظر الطفل توليدها عند الضغط.
      const answerSpeeches = planned.flatMap((p) => Object.values(p.activity.answers).map((a) => TeacherEngine.getAnswerSpeech(a.word)))
      prefetchAudio([welcome, ...planned.flatMap((p) => p.items), ...answerSpeeches, ...TeacherEngine.getFixedPhrases()])
    }

    setup()
  }, [studentId])

  const current = plans[activityIndex]
  const currentItem = current?.items[itemIndex]
  const currentPage = current?.activity.page
  const currentAnswer = currentItem ? current?.activity.answers[currentItem] : undefined

  // صورة السؤال الخاصة تُعرض وحدها، وإلا صفحة النشاط كاملة؛ وإن لم يوجد الملف لا تظهر صورة.
  const imageUrl =
    bookId && currentPage
      ? currentAnswer?.image
        ? bookImageUrl(bookId, currentAnswer.image)
        : bookPageImageUrl(bookId, currentPage)
      : undefined

  // الصوت الوحيد: صوت أحمد المحفوظ (يُولَّد ويُحفظ أول مرة فقط). لا صوت بديل؛ عند الفشل يظهر زر إعادة المحاولة.
  async function speakBest(text: string) {
    setAudioFailed(false)
    const timer = setTimeout(() => setAudioLoading(true), 900) // لا نُظهر المؤشر إلا إن طال التجهيز
    const ok = await playSpeechAudio(text)
    clearTimeout(timer)
    setAudioLoading(false)
    if (!ok) setAudioFailed(true)
  }

  // أحمد ينطق كل رسالة بعد أن يضغط الطفل "يلا نبدأ" (المتصفح لا يسمح بتشغيل الصوت قبل أي لمسة).
  useEffect(() => {
    if (begun && say.spoken) speakBest(say.spoken)
  }, [say, begun])

  useEffect(() => stopAudio, [])

  function showItem(plan: PlannedActivity, index: number) {
    const item = plan.items[index]
    setStep('item')
    // الكتابة: تظهر تعليمات الدفتر وينطق أحمد الكلمة. غيرها: ينطق السطر ويظهر.
    if (plan.mode === 'write') sayText(TeacherEngine.getWritePrompt(), item)
    else sayText(item)
  }

  function startActivity(index: number) {
    setActivityIndex(index)
    setItemIndex(0)
    showItem(plans[index], 0)
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
    sayText(TeacherEngine.getSessionClosing(student.name))
    setComplete(true)
  }

  // بعد اكتمال العنصر: العنصر التالي، أو تسميع المحفوظ، أو إنهاء النشاط.
  async function advance() {
    if (!current) return
    if (itemIndex + 1 < current.items.length) {
      setItemIndex(itemIndex + 1)
      showItem(current, itemIndex + 1)
      return
    }
    if (current.mode === 'memorize') {
      setStep('recite')
      sayText(TeacherEngine.getRecitePrompt())
      return
    }
    await finishActivity()
  }

  async function handleNext() {
    if (step === 'recite') await finishActivity()
    else if (current?.mode === 'read' && step === 'item' && currentAnswer) {
      // عنصر "أكمل": نُظهر الكلمة الصحيحة ونسأل الطفل هل كانت إجابته صحيحة.
      setStep('answer')
      sayText(TeacherEngine.getAnswerPrompt(), TeacherEngine.getAnswerSpeech(currentAnswer.word))
    } else if (current?.mode === 'write' && step === 'item') {
      // كتب في دفتره وطلب التحقق: نُظهر له الجملة ليقارن بنفسه.
      setStep('check')
      sayText(TeacherEngine.getCheckPrompt())
    } else await advance()
  }

  // ترديد المحفوظ مرة أخرى من أول سطر.
  function repeatMemorization() {
    if (!current) return
    setItemIndex(0)
    showItem(current, 0)
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

  const primaryButton = 'rounded-xl bg-purple-600 px-8 py-4 text-lg font-bold text-white hover:bg-purple-700'
  const secondaryButton = 'rounded-xl bg-purple-50 px-8 py-3 font-bold text-purple-700 hover:bg-purple-100'
  const isDictation = current?.activity.kind === 'dictation'

  return (
    <div className="mx-auto flex min-h-[calc(100vh-56px)] max-w-lg flex-col items-center justify-center gap-6 p-6">
      <TeacherAvatar name={teacher.name} />

      <div
        key={say.shown}
        className="animate-fade-in-up flex w-full items-center gap-3 rounded-2xl bg-purple-50 p-4 text-center text-lg font-semibold text-gray-800"
      >
        <button
          onClick={() => speakBest(say.spoken)}
          aria-label="اسمع مرة ثانية"
          className="shrink-0 rounded-full bg-purple-100 p-2 text-xl hover:bg-purple-200"
        >
          🔊
        </button>
        <span className="flex-1">{say.shown}</span>
      </div>

      {audioLoading && <p className="text-xs text-gray-400">جارِ تجهيز صوت أحمد...</p>}

      {audioFailed && (
        <button
          onClick={() => speakBest(say.spoken)}
          className="w-full rounded-lg bg-amber-50 p-3 text-center text-sm font-semibold text-amber-700 hover:bg-amber-100"
        >
          ما قدرت أسمعك صوتي. اضغط هنا وأحاول مرة ثانية
        </button>
      )}

      {!begun && sessionId && (
        <div className="flex w-full flex-col items-center gap-4">
          {lesson && <p className="text-sm text-gray-500">{lesson.title}</p>}
          <div className="flex flex-wrap justify-center gap-2">
            {overview.map((o) => (
              <span key={o.label} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                {o.label} · {o.count}
              </span>
            ))}
          </div>
          <button onClick={handleStart} className={primaryButton}>
            يلا نبدأ
          </button>
        </div>
      )}

      {begun && !complete && current && (
        <div key={`${activityIndex}-${itemIndex}-${step}`} className="animate-fade-in-up flex w-full flex-col items-center gap-4">
          <p className="text-sm text-gray-400">
            {current.activity.title}
            {current.items.length > 1 && step !== 'recite' && ` · ${itemIndex + 1} من ${current.items.length}`}
          </p>

          {imageUrl && imageUrl !== failedImageUrl && (
            <img
              src={imageUrl}
              alt={`صفحة ${currentPage} من الكتاب`}
              onError={() => setFailedImageUrl(imageUrl)}
              className="max-h-[28rem] w-full max-w-md rounded-lg border border-gray-200 object-contain"
            />
          )}

          {step !== 'recite' && currentItem && !(current.mode === 'write' && step === 'item' && isDictation) && (
            <p className="text-center text-3xl font-bold leading-relaxed text-gray-900">{currentItem}</p>
          )}
          {current.mode === 'write' && step === 'item' && isDictation && (
            <p className="text-center text-lg text-gray-500">🎧 اسمع الكلمة واكتبها في دفترك</p>
          )}

          {current.mode === 'read' && step === 'answer' && currentAnswer && (
            <>
              <p className="text-center text-3xl font-bold leading-relaxed text-purple-700">{currentAnswer.word}</p>
              <div className="flex gap-3">
                <button onClick={advance} className={primaryButton}>
                  نعم
                </button>
                <button onClick={advance} className={secondaryButton}>
                  لا
                </button>
              </div>
            </>
          )}
          {current.mode === 'read' && step === 'item' && (
            <button onClick={handleNext} className={primaryButton}>
              {currentAnswer ? 'أكملتها ✓' : 'قرأتها ✓'}
            </button>
          )}

          {current.mode === 'memorize' && step === 'item' && (
            <button onClick={handleNext} className={primaryButton}>
              رددتها ✓
            </button>
          )}
          {current.mode === 'memorize' && step === 'recite' && (
            <>
              <button onClick={handleNext} className={primaryButton}>
                سمّعت ✓
              </button>
              <button onClick={repeatMemorization} className={secondaryButton}>
                أردد مرة ثانية
              </button>
            </>
          )}
          {current.mode === 'memorize' && step === 'item' && itemIndex > 0 && (
            <button onClick={repeatMemorization} className={secondaryButton}>
              أردد من الأول
            </button>
          )}

          {current.mode === 'write' && step === 'item' && (
            <button onClick={handleNext} className={primaryButton}>
              كتبتها — أريد التحقق
            </button>
          )}
          {current.mode === 'write' && step === 'check' && (
            <>
              <button onClick={advance} className={primaryButton}>
                كتبتها صح ✓
              </button>
              <button onClick={() => showItem(current, itemIndex)} className={secondaryButton}>
                أعيد الكتابة
              </button>
            </>
          )}
        </div>
      )}

      {complete && (
        <div className="flex flex-col items-center gap-3">
          <button onClick={() => navigate(`/student/${student.id}/session-summary`)} className={primaryButton}>
            شوف ملخص الجلسة
          </button>
          <button onClick={repeatLesson} className={secondaryButton}>
            نعيد الدرس
          </button>
        </div>
      )}
    </div>
  )
}

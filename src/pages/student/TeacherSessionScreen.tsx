import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { HandwritingPad } from '../../components/HandwritingPad'
import { TeacherAvatar } from '../../components/TeacherAvatar'
import { getActivityItems, KIND_SKILL_NAME, toMatchTarget } from '../../lib/activityItems'
import { getLessonActivities } from '../../lib/curriculumRepository'
import { checkHandwriting, isHandwritingCheckAvailable } from '../../lib/handwritingCheck'
import { endSession, getNextSessionPlan, getStudentSkills, recordAttempt, startSession } from '../../lib/learningEngine'
import { isModelReady, preloadVoiceModel, speakWithModel, stopModelSpeech } from '../../lib/mlSpeech'
import { getSkills, getSubjects, getTeachers } from '../../lib/referenceDataRepository'
import { getLessonForSession } from '../../lib/sessionContent'
import {
  hasArabicVoice,
  isCloseMatch,
  isSpeechRecognitionSupported,
  listenOnce,
  speak,
  stopSpeaking,
} from '../../lib/speech'
import { getStudentById } from '../../lib/studentsRepository'
import { TeacherEngine } from '../../lib/teacherEngine'
import type { Id, Lesson, LessonActivity, Student, Teacher } from '../../types/entities'

type Phase = 'doing' | 'feedback' | 'complete'
// voice: يردد الطالب بصوته — dictation: يسمع ويكتب — writing: ينسخ ويكتب — paper: يؤديه على الورق مع ولي الأمر
type Mode = 'voice' | 'dictation' | 'writing' | 'paper'

interface PlannedActivity {
  activity: LessonActivity
  items: string[]
  mode: Mode
  skillId?: Id
}

const MAX_WRONG_TRIES = 2

export function TeacherSessionScreen() {
  const { studentId } = useParams<{ studentId: string }>()
  const navigate = useNavigate()
  const startedRef = useRef(false)
  // عدّادات النشاط الحالي (refs لأن الدرجة تُحسب عند الانتقال، وقراءتها من state ستكون قديمة).
  const retriesRef = useRef(0)
  const gaveUpRef = useRef(0)

  const [student, setStudent] = useState<Student | null>(null)
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [lesson, setLesson] = useState<Lesson | null | undefined>(undefined)
  const [sessionId, setSessionId] = useState<Id | null>(null)
  const [plans, setPlans] = useState<PlannedActivity[]>([])
  const [activityIndex, setActivityIndex] = useState(0)
  const [itemIndex, setItemIndex] = useState(0)
  const [wrongTries, setWrongTries] = useState(0)
  const [phase, setPhase] = useState<Phase>('doing')
  // shown: ما يظهر في الفقاعة — spoken: ما ينطقه أحمد (قد يختلف، مثل الإملاء: ننطق الكلمة ولا نعرضها).
  const [say, setSay] = useState({ shown: '', spoken: '' })
  const [busy, setBusy] = useState(false)
  const [begun, setBegun] = useState(false) // الطفل يضغط "يلا نبدأ" بعد ترحيب أحمد
  const [arabicVoiceAvailable, setArabicVoiceAvailable] = useState<boolean | null>(null)
  const [mlModelFailed, setMlModelFailed] = useState(false)

  function sayText(shown: string, spoken = shown) {
    setSay({ shown, spoken })
  }

  useEffect(() => {
    hasArabicVoice().then(setArabicVoiceAvailable)
    preloadVoiceModel().catch(() => setMlModelFailed(true))
  }, [])

  // ref guard: نبدأ الجلسة مرة واحدة فقط، حتى مع الاستدعاء المزدوج لـ React StrictMode في وضع التطوير.
  useLayoutEffect(() => {
    if (startedRef.current || !studentId) return
    startedRef.current = true

    async function setup() {
      const [s, subjects, teachers, skills] = await Promise.all([
        getStudentById(studentId!),
        getSubjects(),
        getTeachers(),
        getSkills(),
      ])
      const subject = subjects[0]
      const currentTeacher = teachers[0]
      if (!s || !subject || !currentTeacher) return
      setStudent(s)
      setTeacher(currentTeacher)

      const currentLesson = await getLessonForSession(s.id, subject.id)
      setLesson(currentLesson ?? null)
      if (!currentLesson) return

      const activities = (await getLessonActivities(currentLesson.id)).filter((a) => a.kind !== 'enrichment')
      const planned: PlannedActivity[] = activities.map((activity) => {
        const items = getActivityItems(activity)
        const skillId = skills.find((sk) => sk.name === KIND_SKILL_NAME[activity.kind])?.id
        const canWrite = isHandwritingCheckAvailable()
        let mode: Mode = 'paper'
        if (items.length > 0 && skillId) {
          if (activity.kind === 'dictation' && canWrite) mode = 'dictation'
          else if (activity.kind === 'writing' && canWrite) mode = 'writing'
          else if (['reading', 'listening', 'memorization', 'speaking'].includes(activity.kind)) mode = 'voice'
        }
        return { activity, items, mode, skillId }
      })

      const session = await startSession(s.id, subject.id)
      const plan = await getNextSessionPlan(s.id)
      const isFirstEverSession = (await getStudentSkills(s.id)).length === 0

      let queue = planned
      let intro = isFirstEverSession
        ? TeacherEngine.getDiagnosticIntro(s.name)
        : TeacherEngine.getWelcomeMessage(currentTeacher.name, s.name)

      // مراجعة المهارة المتعثرة أولًا (قرار LearningEngine) ثم بقية الدرس.
      if (plan.type === 'review') {
        const reviewFirst = planned.find((p) => p.skillId === plan.skillId && p.mode !== 'paper')
        if (reviewFirst) {
          queue = [reviewFirst, ...planned.filter((p) => p !== reviewFirst)]
          intro = TeacherEngine.getReviewIntro(plan.skillName)
        }
      }

      setSessionId(session.id)
      setPlans(queue)
      sayText(intro)
    }

    setup()
  }, [studentId])

  const current = plans[activityIndex]
  const currentItem = current?.items[itemIndex]

  async function speakBest(text: string) {
    stopSpeaking()
    stopModelSpeech()
    if (isModelReady()) {
      const ok = await speakWithModel(text)
      if (ok) return
    }
    speak(text)
  }

  // أحمد ينطق كل رسالة فور ظهورها.
  useEffect(() => {
    if (say.spoken) speakBest(say.spoken)
  }, [say])

  useEffect(() => {
    return () => {
      stopSpeaking()
      stopModelSpeech()
    }
  }, [])

  // عند أول ظهور للنشاط (بعد الترحيب) نعرض عنصره الأول.
  function startActivity(plan: PlannedActivity, index: number) {
    retriesRef.current = 0
    gaveUpRef.current = 0
    setActivityIndex(index)
    setItemIndex(0)
    setWrongTries(0)
    setPhase('doing')
    showItem(plan, 0)
  }

  function showItem(plan: PlannedActivity, index: number) {
    const item = plan.items[index]
    if (plan.mode === 'paper') {
      sayText(`${plan.activity.title}. سوّها على الورقة مع بابا أو ماما، ولما تخلص اضغط خلصت.`)
    } else if (plan.mode === 'dictation') {
      sayText('اسمع الكلمة، واكتبها في المربع.', item)
    } else if (plan.mode === 'writing') {
      sayText(`اكتب: ${item}`)
    } else {
      sayText(item)
    }
  }

  function handleStart() {
    if (plans.length === 0) return
    setBegun(true)
    startActivity(plans[0], 0)
  }

  function handleItemResult(correct: boolean) {
    if (!current || !currentItem) return
    if (correct) {
      sayText(TeacherEngine.getPraise())
      setPhase('feedback')
      return
    }
    const nextWrong = wrongTries + 1
    setWrongTries(nextWrong)
    retriesRef.current += 1
    if (nextWrong < MAX_WRONG_TRIES) {
      sayText(TeacherEngine.getEncouragement(), current.mode === 'dictation' ? currentItem : undefined)
      return
    }
    gaveUpRef.current += 1
    sayText(TeacherEngine.getGentleExplanationAndMoveOn(`الصح: ${currentItem}.`))
    setPhase('feedback')
  }

  async function handleSpeak() {
    if (!currentItem) return
    setBusy(true)
    try {
      handleItemResult(isCloseMatch(await listenOnce(), toMatchTarget(currentItem)))
    } catch {
      sayText('ما سمعتك، جرب مرة ثانية.')
    } finally {
      setBusy(false)
    }
  }

  async function handleWritten(pngDataUrl: string) {
    if (!currentItem) return
    setBusy(true)
    try {
      handleItemResult((await checkHandwriting(pngDataUrl, toMatchTarget(currentItem))).matches)
    } catch (err) {
      console.error('فشل فحص الكتابة:', err)
      sayText('ما قدرت أشوف كتابتك، جرب مرة ثانية.')
    } finally {
      setBusy(false)
    }
  }

  // الدرجة (0-3) من أداء النشاط: بلا أخطاء = مستقل، محاولات إضافية = تلميح بسيط، تخطّي عناصر = يحتاج دعمًا.
  function scoreForActivity(itemCount: number): 0 | 1 | 2 | 3 {
    if (gaveUpRef.current >= itemCount) return 0
    if (gaveUpRef.current > 0) return 1
    return retriesRef.current === 0 ? 3 : 2
  }

  async function handleContinue() {
    if (!current || !sessionId || !lesson) return

    if (current.mode !== 'paper' && itemIndex + 1 < current.items.length) {
      const next = itemIndex + 1
      setItemIndex(next)
      setWrongTries(0)
      setPhase('doing')
      showItem(current, next)
      return
    }

    // انتهى النشاط: نسجّل محاولة واحدة للنشاط (الورقي لا يُقيَّم).
    if (current.mode !== 'paper' && current.skillId) {
      await recordAttempt({
        sessionId,
        lessonId: lesson.id,
        skillId: current.skillId,
        score: scoreForActivity(current.items.length),
        hintsUsed: Math.min(retriesRef.current, 2),
      })
    }

    const nextIndex = activityIndex + 1
    if (nextIndex < plans.length) {
      startActivity(plans[nextIndex], nextIndex)
      return
    }

    await endSession(sessionId)
    sayText(TeacherEngine.getSessionClosing(student?.name ?? ''))
    setPhase('complete')
  }

  if (!student || !teacher) {
    return <p className="p-6 text-center text-gray-400">جارِ التحميل...</p>
  }

  if (lesson === null || (lesson && plans.length === 0 && sessionId)) {
    return (
      <p className="p-6 text-center text-gray-500">
        ما فيه درس جاهز الحين. اطلب من الإدارة رفع الكتاب ونشره، ثم جرّب مرة ثانية.
      </p>
    )
  }

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

      {arabicVoiceAvailable === false && mlModelFailed && (
        <p className="w-full rounded-lg bg-amber-50 p-3 text-center text-xs text-amber-700">
          صوت أحمد غير متاح: لا يوجد صوت عربي مثبّت على هذا الجهاز. اطلب من بابا أو ماما تثبيت صوت عربي من إعدادات الجهاز.
        </p>
      )}

      {!begun && sessionId && (
        <button
          onClick={handleStart}
          className="rounded-xl bg-purple-600 px-8 py-4 text-lg font-bold text-white hover:bg-purple-700"
        >
          يلا نبدأ
        </button>
      )}

      {begun && phase === 'doing' && current && (
        <div key={`${activityIndex}-${itemIndex}-${wrongTries}`} className="animate-fade-in-up flex w-full flex-col items-center gap-4">
          <p className="text-sm text-gray-400">{current.activity.title}</p>

          {(current.mode === 'voice' || current.mode === 'writing') && currentItem && (
            <p className="text-center text-3xl font-bold leading-relaxed text-gray-900">{currentItem}</p>
          )}

          {current.mode === 'voice' &&
            (isSpeechRecognitionSupported() ? (
              <button
                onClick={handleSpeak}
                disabled={busy}
                className="rounded-xl border-2 border-purple-200 bg-purple-50 px-8 py-4 text-lg font-bold text-purple-700 hover:bg-purple-100 disabled:opacity-60"
              >
                🎤 {busy ? 'أسمعك...' : 'قولها'}
              </button>
            ) : (
              <button
                onClick={() => handleItemResult(true)}
                className="rounded-xl bg-purple-600 px-8 py-4 text-lg font-bold text-white hover:bg-purple-700"
              >
                قلتها ✓
              </button>
            ))}

          {(current.mode === 'dictation' || current.mode === 'writing') && (
            <div className="w-full">
              <HandwritingPad onSubmit={handleWritten} disabled={busy} />
              {busy && <p className="mt-2 text-center text-sm text-gray-400">أشوف كتابتك...</p>}
            </div>
          )}

          {current.mode === 'paper' && (
            <button
              onClick={() => {
                setPhase('feedback')
                sayText(TeacherEngine.getPraise())
              }}
              className="rounded-xl bg-purple-600 px-8 py-4 text-lg font-bold text-white hover:bg-purple-700"
            >
              خلصت
            </button>
          )}
        </div>
      )}

      {phase === 'feedback' && (
        <button
          onClick={handleContinue}
          className="rounded-xl bg-purple-600 px-8 py-4 text-lg font-bold text-white hover:bg-purple-700"
        >
          التالي
        </button>
      )}

      {phase === 'complete' && (
        <button
          onClick={() => navigate(`/student/${student.id}/session-summary`)}
          className="rounded-xl bg-purple-600 px-8 py-4 text-lg font-bold text-white hover:bg-purple-700"
        >
          شوف ملخص الجلسة
        </button>
      )}
    </div>
  )
}

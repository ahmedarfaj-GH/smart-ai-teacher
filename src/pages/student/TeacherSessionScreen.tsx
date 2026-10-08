import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ActivityCard } from '../../components/ActivityCard'
import { PronunciationPractice, type PronunciationState } from '../../components/PronunciationPractice'
import { TeacherAvatar } from '../../components/TeacherAvatar'
import { getExerciseForSkill, getExercisesForLesson, type Exercise } from '../../data/exercises'
import { endSession, getNextSessionPlan, getStudentSkills, recordAttempt, startSession } from '../../lib/learningEngine'
import { isModelReady, preloadVoiceModel, speakWithModel, stopModelSpeech } from '../../lib/mlSpeech'
import { getSubjects, getTeachers } from '../../lib/referenceDataRepository'
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
import type { Id, Student, Teacher } from '../../types/entities'

// درس "صلة الرحم" هو الدرس الوحيد المزوَّد بأنشطة في هذا الـ Prototype (راجع exercises.ts) —
// لذلك تُبنى كل جلسة من محتواه، بصرف النظر عن currentLessonId المسجّل لدى ولي الأمر.
const LESSON_ID: Id = '00000000-0000-0000-0000-000000000043'

type Phase = 'exercise' | 'feedback' | 'complete'

export function TeacherSessionScreen() {
  const { studentId } = useParams<{ studentId: string }>()
  const navigate = useNavigate()
  const startedRef = useRef(false)

  const [student, setStudent] = useState<Student | null>(null)
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [sessionId, setSessionId] = useState<Id | null>(null)
  const [queue, setQueue] = useState<Exercise[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('exercise')
  const [speech, setSpeech] = useState('')
  const [wrongCount, setWrongCount] = useState(0)
  const [hintsShown, setHintsShown] = useState(0)
  const [wrongOptionIndexes, setWrongOptionIndexes] = useState<number[]>([])
  const [pronunciationState, setPronunciationState] = useState<PronunciationState>('idle')
  const [arabicVoiceAvailable, setArabicVoiceAvailable] = useState<boolean | null>(null)
  const [mlModelFailed, setMlModelFailed] = useState(false)

  useEffect(() => {
    hasArabicVoice().then(setArabicVoiceAvailable)
    preloadVoiceModel().catch(() => setMlModelFailed(true))
  }, [])

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

      const session = await startSession(s.id, subject.id)
      const plan = await getNextSessionPlan(s.id)
      const isFirstEverSession = (await getStudentSkills(s.id)).length === 0
      const lessonExercises = getExercisesForLesson(LESSON_ID)

      let initialQueue = lessonExercises
      let initialSpeech = isFirstEverSession
        ? TeacherEngine.getDiagnosticIntro(s.name)
        : TeacherEngine.getWelcomeMessage(currentTeacher.name, s.name)

      if (plan.type === 'review') {
        const reviewExercise = getExerciseForSkill(plan.skillId)
        if (reviewExercise) {
          initialQueue = [reviewExercise, ...lessonExercises.filter((e) => e.id !== reviewExercise.id)]
          initialSpeech = TeacherEngine.getReviewIntro(plan.skillName)
        }
      }

      setSessionId(session.id)
      setQueue(initialQueue)
      setSpeech(initialSpeech)
    }

    setup()
  }, [studentId])

  const currentExercise = queue[currentIndex]

  // يفضّل النموذج المفتوح المصدر الأعلى جودة إن كان جاهزًا، ويرجع لصوت المتصفح فورًا إن لم يكن
  // (حتى لا ينتظر الطفل بصمت أثناء أول تحميل للنموذج) — راجع المرحلة 8 في plan.md.
  async function speakBest(text: string) {
    stopSpeaking()
    stopModelSpeech()
    if (isModelReady()) {
      const ok = await speakWithModel(text)
      if (ok) return
    }
    speak(text)
  }

  // أحمد ينطق كل رسالة (ترحيب/تشجيع/تلميح/سؤال) بصوت حقيقي فور ظهورها.
  useEffect(() => {
    if (!speech) return
    if (phase === 'exercise' && currentExercise) {
      speakBest(`${speech} ${currentExercise.prompt}`)
    } else {
      speakBest(speech)
    }
  }, [speech])

  useEffect(() => {
    return () => {
      stopSpeaking()
      stopModelSpeech()
    }
  }, [])

  function replaySpeech() {
    if (phase === 'exercise' && currentExercise) {
      speakBest(`${speech} ${currentExercise.prompt}`)
    } else {
      speakBest(speech)
    }
  }

  async function handlePracticePronunciation() {
    if (!currentExercise) return
    const targetWord = currentExercise.options[currentExercise.correctOptionIndex]
    setPronunciationState('listening')
    try {
      const spoken = await listenOnce()
      setPronunciationState(isCloseMatch(spoken, targetWord) ? 'match' : 'no-match')
    } catch {
      setPronunciationState('error')
    }
  }

  async function handleSelectOption(optionIndex: number) {
    if (!currentExercise || !sessionId) return

    if (optionIndex === currentExercise.correctOptionIndex) {
      const score = hintsShown === 0 ? 3 : hintsShown === 1 ? 2 : 1
      await recordAttempt({
        sessionId,
        lessonId: currentExercise.lessonId,
        skillId: currentExercise.skillId,
        score,
        hintsUsed: hintsShown,
      })
      setSpeech(TeacherEngine.getPraise())
      setPhase('feedback')
      return
    }

    setWrongOptionIndexes((prev) => [...prev, optionIndex])
    const nextWrongCount = wrongCount + 1
    setWrongCount(nextWrongCount)

    if (nextWrongCount === 1) {
      setSpeech(TeacherEngine.getEncouragement())
      return
    }
    if (nextWrongCount === 2) {
      setHintsShown(1)
      setSpeech(TeacherEngine.getHint(1, currentExercise.hint1))
      return
    }
    if (nextWrongCount === 3) {
      setHintsShown(2)
      setSpeech(TeacherEngine.getHint(2, currentExercise.hint2))
      return
    }

    await recordAttempt({
      sessionId,
      lessonId: currentExercise.lessonId,
      skillId: currentExercise.skillId,
      score: 0,
      hintsUsed: 2,
    })
    setSpeech(TeacherEngine.getGentleExplanationAndMoveOn(currentExercise.explanation))
    setPhase('feedback')
  }

  async function handleContinue() {
    const nextIndex = currentIndex + 1
    if (nextIndex < queue.length) {
      setCurrentIndex(nextIndex)
      setWrongCount(0)
      setHintsShown(0)
      setWrongOptionIndexes([])
      setPronunciationState('idle')
      setSpeech(TeacherEngine.getNextActivityIntro())
      setPhase('exercise')
      return
    }

    if (sessionId) await endSession(sessionId)
    setSpeech(TeacherEngine.getSessionClosing(student?.name ?? ''))
    setPhase('complete')
  }

  if (!student || !teacher) {
    return <p className="p-6 text-center text-gray-400">جارِ التحميل...</p>
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-56px)] max-w-lg flex-col items-center justify-center gap-6 p-6">
      <TeacherAvatar name={teacher.name} />

      <div
        key={speech}
        className="animate-fade-in-up flex w-full items-center gap-3 rounded-2xl bg-purple-50 p-4 text-center text-lg font-semibold text-gray-800"
      >
        <button
          onClick={replaySpeech}
          aria-label="اسمع مرة ثانية"
          className="shrink-0 rounded-full bg-purple-100 p-2 text-xl hover:bg-purple-200"
        >
          🔊
        </button>
        <span className="flex-1">{speech}</span>
      </div>

      {arabicVoiceAvailable === false && mlModelFailed && (
        <p className="w-full rounded-lg bg-amber-50 p-3 text-center text-xs text-amber-700">
          صوت أحمد غير متاح: لا يوجد صوت عربي مثبّت على هذا الجهاز. اطلب من بابا أو ماما تثبيت صوت عربي من إعدادات الجهاز.
        </p>
      )}

      {phase === 'exercise' && currentExercise && (
        <div key={currentExercise.id} className="animate-fade-in-up w-full">
          <ActivityCard
            prompt={currentExercise.prompt}
            options={currentExercise.options}
            markedWrongIndexes={wrongOptionIndexes}
            onSelect={handleSelectOption}
          />
        </div>
      )}

      {phase === 'feedback' && (
        <>
          {currentExercise && isSpeechRecognitionSupported() && (
            <PronunciationPractice
              targetWord={currentExercise.options[currentExercise.correctOptionIndex]}
              state={pronunciationState}
              onPractice={handlePracticePronunciation}
            />
          )}
          <button
            onClick={handleContinue}
            className="rounded-xl bg-purple-600 px-8 py-4 text-lg font-bold text-white hover:bg-purple-700"
          >
            التالي
          </button>
        </>
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

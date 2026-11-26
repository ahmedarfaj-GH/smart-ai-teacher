// ترديد سطر من النشيد: أحمد ينطق السطر، الطالب يفتح المايك ويرددّه، وGemini يتحقق من النطق؛
// إن كان صحيحًا يكمل، وإلا يطلب أحمد الإعادة مع التركيز على الكلمات الخاطئة (3 محاولات ثم نكمل).

import { useState } from 'react'
import { stopAudio } from '../lib/audioCache'
import { checkRecitation, getLastRecitationError } from '../lib/recitationCheck'
import { startRecording, type Recording } from '../lib/speechRecorder'
import { TeacherEngine } from '../lib/teacherEngine'

const MAX_ATTEMPTS = 3

type EchoState = 'idle' | 'recording' | 'checking' | 'retry' | 'passed' | 'gave-up' | 'unavailable'

function plain(text: string): string {
  return text.replace(/[ً-ٰٟ]/g, '').replace(/[أإآ]/g, 'ا')
}

interface Props {
  line: string
  onAccepted: () => void // نطق صحيح (أو تعذّر الفحص فاكتفينا بترديد الطالب)
  onSkipped: () => void // استنفد المحاولات؛ نكمل ونرجع للسطر لاحقًا
  say: (shown: string, spoken?: string) => void
  primaryButton: string
  secondaryButton: string
}

export function EchoRecorder({ line, onAccepted, onSkipped, say, primaryButton, secondaryButton }: Props) {
  const [state, setState] = useState<EchoState>('idle')
  const [attempts, setAttempts] = useState(0)
  const [wrongWords, setWrongWords] = useState<string[]>([])
  const [recording, setRecording] = useState<Recording | null>(null)

  async function begin() {
    stopAudio() // لا يلتقط المايك صوت أحمد
    try {
      setRecording(await startRecording())
      setState('recording')
    } catch {
      setState('unavailable') // المايك مرفوض أو غير موجود
    }
  }

  async function finish() {
    if (!recording) return
    setState('checking')
    try {
      const result = await checkRecitation(await recording.stop(), line)
      setRecording(null)
      if (result.matches) {
        say(TeacherEngine.getPraise())
        setState('passed')
        return
      }
      const used = attempts + 1
      setAttempts(used)
      if (used >= MAX_ATTEMPTS) {
        say(TeacherEngine.getGiveUpPrompt())
        setState('gave-up')
        return
      }
      setWrongWords(result.wrongWords)
      say(TeacherEngine.getRetryPrompt(result.wrongWords))
      setState('retry')
    } catch {
      setRecording(null)
      setState('unavailable')
    }
  }

  const wrong = new Set(wrongWords.map(plain))

  return (
    <div className="flex flex-col items-center gap-4">
      {state === 'retry' && (
        <p className="text-center text-2xl font-bold leading-relaxed text-gray-900">
          {line.split(' ').map((word, i) => (
            <span key={i} className={wrong.has(plain(word)) ? 'text-red-600' : undefined}>
              {word}{' '}
            </span>
          ))}
        </p>
      )}

      {(state === 'idle' || state === 'retry') && (
        <button onClick={begin} className={primaryButton}>
          🎤 {state === 'retry' ? 'أعيد' : 'رددها'}
        </button>
      )}
      {state === 'recording' && (
        <button onClick={finish} className={`${primaryButton} animate-pulse bg-red-600 hover:bg-red-700`}>
          ⏹ خلصت
        </button>
      )}
      {state === 'checking' && <p className="text-sm text-gray-500">جارِ الاستماع لنطقك...</p>}
      {state === 'passed' && (
        <button onClick={onAccepted} className={primaryButton}>
          السطر التالي ➜
        </button>
      )}
      {state === 'gave-up' && (
        <button onClick={onSkipped} className={primaryButton}>
          السطر التالي ➜
        </button>
      )}
      {state === 'unavailable' && (
        <>
          <p className="rounded-lg bg-amber-50 p-3 text-center text-sm font-semibold text-amber-700">
            ما قدرت أسمعك. تأكد أن المايك مفتوح للموقع.
            {getLastRecitationError() && (
              <span dir="ltr" className="mt-1 block break-words text-[10px] font-normal text-amber-600">
                {getLastRecitationError().slice(0, 220)}
              </span>
            )}
          </p>
          <button onClick={onAccepted} className={secondaryButton}>
            رددتها ✓
          </button>
          <button onClick={() => setState('idle')} className={secondaryButton}>
            🎤 أجرب مرة ثانية
          </button>
        </>
      )}
    </div>
  )
}

// كتابة الإجابة بلوحة المفاتيح (الإملاء وإكمال الكلمة): يقارن النظام ما كتبه الطالب بالمطلوب بلا اعتبار للتشكيل،
// فإن صحّ يمدحه أحمد وينتقل، وإلا يشجّعه على الإعادة، وبعد 3 محاولات يعرض الإجابة الصحيحة.

import { useState } from 'react'
import { TeacherEngine } from '../lib/teacherEngine'

const MAX_ATTEMPTS = 3

// المقارنة بلا تشكيل ولا تطويل ولا علامات ترقيم ولا فروق المسافات؛ الهمزات تُوحَّد فقط، وبقية الإملاء (ة/ه، ى/ي) محسوبة.
function normalize(text: string): string {
  return text
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/[.,،:؛؟?!"«»()\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

type TypedState = 'typing' | 'wrong' | 'correct' | 'gave-up'

interface Props {
  expected: string
  onCorrect: () => void
  onGiveUp: () => void // استنفد المحاولات بعد أن رأى الإجابة الصحيحة
  say: (shown: string, spoken?: string) => void
  primaryButton: string
}

export function TypedAnswer({ expected, onCorrect, onGiveUp, say, primaryButton }: Props) {
  const [typed, setTyped] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [state, setState] = useState<TypedState>('typing')

  function check() {
    if (normalize(typed) === normalize(expected)) {
      say(TeacherEngine.getPraise())
      setState('correct')
      return
    }
    const used = attempts + 1
    setAttempts(used)
    if (used >= MAX_ATTEMPTS) {
      say(expected)
      setState('gave-up')
      return
    }
    say(TeacherEngine.getEncouragement())
    setState('wrong')
  }

  if (state === 'correct') {
    return (
      <button onClick={onCorrect} className={primaryButton}>
        التالي ➜
      </button>
    )
  }
  if (state === 'gave-up') {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-center text-3xl font-bold text-purple-700">{expected}</p>
        <button onClick={onGiveUp} className={primaryButton}>
          التالي ➜
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (typed.trim()) check()
      }}
      className="flex w-full flex-col items-center gap-3"
    >
      <input
        autoFocus
        dir="rtl"
        lang="ar"
        spellCheck={false}
        autoComplete="off"
        value={typed}
        onChange={(e) => {
          setTyped(e.target.value)
          if (state === 'wrong') setState('typing')
        }}
        placeholder="اكتبها هنا"
        className={`w-full max-w-xs rounded-xl border-2 px-4 py-3 text-center text-2xl font-bold ${
          state === 'wrong' ? 'border-red-400' : 'border-purple-200'
        }`}
      />
      <button type="submit" disabled={!typed.trim()} className={`${primaryButton} disabled:opacity-40`}>
        تحقق ✓
      </button>
    </form>
  )
}

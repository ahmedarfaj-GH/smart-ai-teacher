export type PronunciationState = 'idle' | 'listening' | 'match' | 'no-match' | 'error'

interface PronunciationPracticeProps {
  targetWord: string
  state: PronunciationState
  onPractice: () => void
}

// ملاحظة مهمة: هذا يتحقق هل الكلمة المنطوقة تطابق الكلمة الصحيحة نصيًا (عبر خدمة الاستماع المجانية
// بالمتصفح) — لا يقيّم جودة مخارج الحروف أو النطق نفسه. راجع المرحلة 8 في plan.md.
export function PronunciationPractice({ targetWord, state, onPractice }: PronunciationPracticeProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onPractice}
        disabled={state === 'listening'}
        className="flex items-center gap-2 rounded-xl border-2 border-purple-200 bg-purple-50 px-5 py-3 text-base font-bold text-purple-700 transition-colors hover:border-purple-400 hover:bg-purple-100 disabled:opacity-60"
      >
        🎤 {state === 'listening' ? 'قول الكلمة الحين...' : `جرب تنطق: ${targetWord}`}
      </button>
      {state === 'match' && <p className="text-sm font-semibold text-green-600">نطق ممتاز! 🌟</p>}
      {state === 'no-match' && <p className="text-sm font-semibold text-amber-600">قريب! جرب مرة ثانية.</p>}
      {state === 'error' && <p className="text-xs text-gray-400">ما قدرنا نسمعك، جرب مرة ثانية.</p>}
    </div>
  )
}

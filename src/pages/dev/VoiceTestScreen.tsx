import { useState } from 'react'
import { isModelReady, preloadVoiceModel, speakWithModel } from '../../lib/mlSpeech'

// أداة اختبار داخلية فقط — لتجربة جودة صوت نموذج Gemini TTS
// بمعزل عن باقي التطبيق، وبدون الحاجة لصوت عربي مثبّت على الجهاز (النموذج يولّد صوته بنفسه).
// راجع المرحلة 8 في plan.md — ليست ميزة نهائية للمستخدم.

const SAMPLE_TEXTS = [
  'هلا خالد 👋 معك أحمد، جاهز نتعلم سوا؟',
  'أي كلمة من هذه هي: «عم»؟',
  'ممتاز! 🌟',
  'قريب! جرب مرة ثانية.',
  'كم مقطعًا في كلمة: «صلة»؟',
  'جدي قال لخالد: تعال زرني كل جمعة. مين يبي يزوره خالد؟',
  'شغل رائع اليوم يا خالد! أشوفك في الجلسة الجاية 👋',
]

type Status = 'idle' | 'loading' | 'playing' | 'error'

export function VoiceTestScreen() {
  const [statusByText, setStatusByText] = useState<Record<string, Status>>({})
  const [customText, setCustomText] = useState('')

  async function handlePlay(text: string) {
    setStatusByText((prev) => ({ ...prev, [text]: isModelReady() ? 'playing' : 'loading' }))
    const ok = await speakWithModel(text)
    setStatusByText((prev) => ({ ...prev, [text]: ok ? 'idle' : 'error' }))
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-bold text-gray-900">اختبار جودة صوت النموذج</h1>
      <p className="mt-2 text-sm text-gray-500">
        أداة داخلية لتجربة صوت Gemini TTS مباشرة (يحتاج VITE_GEMINI_API_KEY في .env)، وكل نطق
        بعده يأخذ عدة ثوانٍ (معالجة حقيقية، لا صوت مُسجَّل مسبقًا).
      </p>
      <button
        onClick={() => preloadVoiceModel().catch(() => undefined)}
        className="mt-4 rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
      >
        تحميل النموذج مسبقًا
      </button>

      <div className="mt-6 flex flex-col gap-3">
        {SAMPLE_TEXTS.map((text) => {
          const status = statusByText[text] ?? 'idle'
          return (
            <div key={text} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
              <button
                onClick={() => handlePlay(text)}
                disabled={status === 'loading' || status === 'playing'}
                className="shrink-0 rounded-full bg-purple-100 p-3 text-lg hover:bg-purple-200 disabled:opacity-50"
              >
                {status === 'loading' ? '⏳' : status === 'playing' ? '🔊' : '▶️'}
              </button>
              <span className="flex-1 text-gray-800">{text}</span>
              {status === 'error' && <span className="text-xs font-semibold text-red-600">فشل</span>}
            </div>
          )
        })}
      </div>

      <h2 className="mt-8 text-sm font-semibold text-gray-500">نص مخصّص</h2>
      <div className="mt-2 flex gap-2">
        <input
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="اكتب أي جملة عربية..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          onClick={() => customText.trim() && handlePlay(customText.trim())}
          disabled={!customText.trim()}
          className="rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-40"
        >
          نطق
        </button>
      </div>
      {customText.trim() && statusByText[customText.trim()] === 'error' && (
        <p className="mt-1 text-xs font-semibold text-red-600">فشل النطق.</p>
      )}
    </div>
  )
}

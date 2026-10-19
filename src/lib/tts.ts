// توليد صوت أحمد عبر Gemini TTS (REST). هذا هو مصدر الصوت الوحيد في التطبيق: لا صوت متصفح ولا نماذج محلية.
// كل استدعاء مدفوع، لذلك لا يُستدعى مباشرة؛ المرور دائمًا عبر audioCache.ts الذي يحفظ الناتج ويعيد استخدامه.
// ملاحظة أمنية: المفتاح VITE_GEMINI_API_KEY يُضمَّن في كود المتصفح (قرار الأمان مؤجَّل — راجع الخارطة في plan.md).

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
const MODEL_ID = (import.meta.env.VITE_GEMINI_TTS_MODEL as string | undefined) || 'gemini-3.8-flash-tts'
const VOICE_NAME = 'Schedar'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent`

export const TTS_MODEL = MODEL_ID
export const TTS_VOICE = VOICE_NAME

export function isTtsConfigured(): boolean {
  return Boolean(API_KEY)
}

// Gemini يرجع ملف WAV كامل (base64) — يُحفظ كما هو.
export async function synthesizeWavBlob(text: string): Promise<Blob> {
  if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY غير مضبوط')

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME } } },
      },
    }),
  })
  if (!response.ok) throw new Error(`Gemini TTS ${response.status}: ${await response.text()}`)

  const data = await response.json()
  const base64: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
  if (!base64) throw new Error('الاستجابة لا تحتوي على صوت')

  return new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], { type: 'audio/wav' })
}

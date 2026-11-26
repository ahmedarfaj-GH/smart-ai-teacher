// تفريغ صوت الطالب إلى نص عبر Groq (Whisper) — أسرع وأرخص من فحص الصوت بـ Gemini، ويُقارَن نصّه محليًا بالسطر المطلوب.
// مفتاحه VITE_GROQ_API_KEY في .env فقط (يُضمَّن في كود المتصفح مثل مفتاح Gemini — قرار الأمان مؤجَّل، راجع tts.ts).

const API_KEY = import.meta.env.VITE_GROQ_API_KEY as string | undefined
const MODEL_ID = (import.meta.env.VITE_GROQ_STT_MODEL as string | undefined) || 'whisper-large-v3'
const ENDPOINT = 'https://api.groq.com/openai/v1/audio/transcriptions'

export function isGroqConfigured(): boolean {
  return Boolean(API_KEY)
}

export async function transcribeWithGroq(wav: Blob): Promise<string> {
  if (!API_KEY) throw new Error('VITE_GROQ_API_KEY غير مضبوط')

  const form = new FormData()
  form.append('file', wav, 'speech.wav')
  form.append('model', MODEL_ID)
  form.append('language', 'ar')
  form.append('temperature', '0')
  form.append('response_format', 'json')

  const response = await fetch(ENDPOINT, { method: 'POST', headers: { Authorization: `Bearer ${API_KEY}` }, body: form })
  if (!response.ok) throw new Error(`Groq STT ${response.status}: ${await response.text()}`)

  const data = (await response.json()) as { text?: string }
  return data.text ?? ''
}

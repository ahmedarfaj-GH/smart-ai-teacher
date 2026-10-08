// نطق عربي بجودة عالية عبر Gemini TTS (REST) — يحل محل النموذج المفتوح المصدر السابق (mms-tts-ara).
// ملاحظة أمنية: المفتاح VITE_GEMINI_API_KEY يُضمَّن في كود المتصفح، فهذا الإعداد للتجربة المحلية فقط.
// قبل النشر العام يُنقل الاستدعاء إلى وسيط خادم يحمل المفتاح (سيُناقَش لاحقًا).
//
// الواجهة المصدَّرة (speakWithModel / isModelReady / preloadVoiceModel / stopModelSpeech) بقيت كما هي
// حتى لا تتأثر الشاشات المستهلِكة.

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
const MODEL_ID = (import.meta.env.VITE_GEMINI_TTS_MODEL as string | undefined) || 'gemini-3.8-flash-tts'
const VOICE_NAME = 'Schedar'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent`

let audioContext: AudioContext | null = null
let currentSource: AudioBufferSourceNode | null = null
// كل طلب مدفوع — نخزّن الصوت لكل نص حتى لا نعيد طلب نفس الجملة (مثل إعادة التلميح).
const audioCache = new Map<string, AudioBuffer>()

// لا يوجد تحميل نموذج هنا — "الجاهزية" تعني فقط وجود المفتاح.
export function isModelReady(): boolean {
  return Boolean(API_KEY)
}

export function preloadVoiceModel(): Promise<void> {
  return API_KEY ? Promise.resolve() : Promise.reject(new Error('VITE_GEMINI_API_KEY غير مضبوط'))
}

function getAudioContext(): AudioContext {
  if (!audioContext) audioContext = new AudioContext()
  return audioContext
}

export function stopModelSpeech(): void {
  try {
    currentSource?.stop()
  } catch {
    // لا شيء يُشغَّل حاليًا — تجاهل
  }
  currentSource = null
}


function base64ToArrayBuffer(base64: string): ArrayBuffer {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer
}

async function synthesize(text: string): Promise<AudioBuffer> {
  const cached = audioCache.get(text)
  if (cached) return cached

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY as string },
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

  const buffer = await getAudioContext().decodeAudioData(base64ToArrayBuffer(base64))
  audioCache.set(text, buffer)
  return buffer
}

// ترجع true لو نجح النطق، false لو فشل (حتى يستخدم المستدعي صوت المتصفح كبديل).
export async function speakWithModel(text: string): Promise<boolean> {
  if (!API_KEY) return false
  try {
    const buffer = await synthesize(text)
    stopModelSpeech()
    const ctx = getAudioContext()
    await ctx.resume()
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start()
    currentSource = source
    return true
  } catch (err) {
    console.error('فشل النطق عبر Gemini TTS:', err)
    return false
  }
}

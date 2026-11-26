// فحص ترديد الطالب للسطر: يرجع هل نطقه صحيح وأي كلمات تحتاج إعادة.
// الأولوية لـ Groq (Whisper يفرّغ الصوت ثم نقارنه محليًا) إن وُجد مفتاحه، وإلا Gemini بالصوت (نفس مفتاح الصوت VITE_GEMINI_API_KEY).
// راجع ملاحظة الأمان في tts.ts.

import { isGroqConfigured, transcribeWithGroq } from './groqTranscribe'
import { compareRecitation } from './recitationMatch'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
const MODEL_ID = (import.meta.env.VITE_GEMINI_AUDIO_MODEL as string | undefined) || 'gemini-3.8-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent`

export interface RecitationResult {
  heard: string // ما سمعه النموذج
  matches: boolean // هل رددّ السطر كاملًا بنطق مقبول
  wrongWords: string[] // كلمات من السطر المطلوب نُطقت خطأ أو نقصت (بلا تشكيل كما وردت في السطر)
}

let lastRecitationError = ''
export function getLastRecitationError(): string {
  return lastRecitationError
}

export function isRecitationCheckAvailable(): boolean {
  return Boolean(API_KEY) || isGroqConfigured()
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export async function checkRecitation(wav: Blob, expectedLine: string): Promise<RecitationResult> {
  lastRecitationError = ''
  try {
    return await requestRecitation(wav, expectedLine)
  } catch (err) {
    lastRecitationError = err instanceof Error ? err.message : String(err)
    throw err
  }
}

async function requestRecitation(wav: Blob, expectedLine: string): Promise<RecitationResult> {
  if (isGroqConfigured()) {
    try {
      const heard = await transcribeWithGroq(wav)
      return { heard, ...compareRecitation(expectedLine, heard) }
    } catch (err) {
      if (!API_KEY) throw err // لا بديل: يظهر الخطأ ويعود الزر اليدوي
      console.error('تعذّر Groq، نجرّب Gemini:', err)
    }
  }
  return requestGeminiRecitation(wav, expectedLine)
}

async function requestGeminiRecitation(wav: Blob, expectedLine: string): Promise<RecitationResult> {
  if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY غير مضبوط')

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text:
                `التسجيل لطفل عمره 7 سنوات يردد بالعربية كلمة أو سطرًا بعد معلمه. المطلوب: «${expectedLine}». ` +
                'اكتب في heard ما سمعته فعلًا. matches=true إذا نطق الطفل كلمات المطلوب كلها وبالترتيب نفسه ' +
                '(تسامح مع التشكيل ونبرة الطفل وتردد بسيط)، وإلا false. ' +
                'wrongWords: الكلمات من السطر المطلوب التي نقصت أو نُطقت خطأ بوضوح (فارغة إن كانت matches=true). ' +
                'إن كان التسجيل صامتًا أو غير مفهوم فـ matches=false وwrongWords فيها كل كلمات السطر.',
            },
            { inlineData: { mimeType: 'audio/wav', data: await toBase64(wav) } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            heard: { type: 'STRING' },
            matches: { type: 'BOOLEAN' },
            wrongWords: { type: 'ARRAY', items: { type: 'STRING' } },
          },
          required: ['heard', 'matches', 'wrongWords'],
        },
      },
    }),
  })
  if (!response.ok) throw new Error(`Gemini audio ${response.status}: ${await response.text()}`)

  const data = await response.json()
  const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('الاستجابة فارغة')
  return JSON.parse(text) as RecitationResult
}

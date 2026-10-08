// فحص الكتابة اليدوية (الإملاء/كتابة الحرف) عبر Gemini بالرؤية: يُرسل صورة مربع الكتابة ويرجع هل الكلمة صحيحة.
// استدعاء واحد صغير لكل إجابة. نفس مفتاح الصوت (VITE_GEMINI_API_KEY) — راجع ملاحظة الأمان في mlSpeech.ts.

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
const MODEL_ID = (import.meta.env.VITE_GEMINI_VISION_MODEL as string | undefined) || 'gemini-3.8-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent`

export interface HandwritingResult {
  read: string // ما قرأه النموذج من الصورة
  matches: boolean // هل يطابق المطلوب (بتساهل مع التشكيل وخط الطفل)
}

export function isHandwritingCheckAvailable(): boolean {
  return Boolean(API_KEY)
}

// pngDataUrl: ناتج canvas.toDataURL('image/png') — expected: الكلمة/الحرف المطلوب كتابته.
export async function checkHandwriting(pngDataUrl: string, expected: string): Promise<HandwritingResult> {
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
                `الصورة كتابة بخط يد طفل عمره 6 سنوات بالعربية. المطلوب كتابة: «${expected}». ` +
                'اقرأ ما كُتب في الصورة. matches=true إذا كانت الحروف المكتوبة صحيحة وبالترتيب نفسه ' +
                '(تجاهل التشكيل ورداءة الخط وعدم انتظام الحجم)، وإلا false. إن كانت الصورة فارغة فـ matches=false.',
            },
            { inlineData: { mimeType: 'image/png', data: pngDataUrl.replace(/^data:image\/png;base64,/, '') } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: { read: { type: 'STRING' }, matches: { type: 'BOOLEAN' } },
          required: ['read', 'matches'],
        },
      },
    }),
  })
  if (!response.ok) throw new Error(`Gemini vision ${response.status}: ${await response.text()}`)

  const data = await response.json()
  const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('الاستجابة فارغة')
  return JSON.parse(text) as HandwritingResult
}

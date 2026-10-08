// نطق واستماع حقيقيان عبر Web Speech API المدمجة في المتصفح — بلا أي تكلفة أو خدمة خارجية.
// النطق (Synthesis) مدعوم في كل المتصفحات الرئيسية. الاستماع (Recognition) مدعوم جيدًا في Chrome/Android
// (جهاز خالد الفعلي)، لكنه ضعيف أو غير مدعوم في Safari/Firefox — لذلك كل استخدام له محروس بفحص الدعم.

// قائمة الأصوات تُحمَّل بشكل غير متزامن في Chrome (تكون فارغة أول لحظة) — ننتظرها حتى ثانيتين.
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const existing = window.speechSynthesis.getVoices()
    if (existing.length > 0) {
      resolve(existing)
      return
    }
    const timeout = setTimeout(() => resolve(window.speechSynthesis.getVoices()), 2000)
    window.speechSynthesis.onvoiceschanged = () => {
      clearTimeout(timeout)
      resolve(window.speechSynthesis.getVoices())
    }
  })
}

async function findArabicVoice(): Promise<SpeechSynthesisVoice | undefined> {
  if (!('speechSynthesis' in window)) return undefined
  const voices = await loadVoices()
  return voices.find((v) => v.lang.toLowerCase().startsWith('ar'))
}

export async function hasArabicVoice(): Promise<boolean> {
  return (await findArabicVoice()) !== undefined
}

// ننطق فقط عند وجود صوت عربي فعلي — النطق بصوت إنجليزي لنص عربي أسوأ من الصمت.
export async function speak(text: string): Promise<boolean> {
  const voice = await findArabicVoice()
  if (!voice) return false
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = voice.lang
  utterance.voice = voice
  utterance.rate = 0.95
  window.speechSynthesis.speak(utterance)
  return true
}

export function stopSpeaking(): void {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}

export function isSpeechRecognitionSupported(): boolean {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
}

// نتيجة الاستماع: النص الذي فهمه المتصفح فقط — تحقق من "الكلمة الصحيحة"، لا تقييم لجودة النطق نفسه.
export function listenOnce(): Promise<string> {
  return new Promise((resolve, reject) => {
    const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition

    if (!SpeechRecognitionCtor) {
      reject(new Error('الاستماع غير مدعوم في هذا المتصفح.'))
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'ar-SA'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      resolve(event.results[0][0].transcript.trim())
    }
    recognition.onerror = (event) => {
      reject(new Error(event.error))
    }
    recognition.onnomatch = () => {
      reject(new Error('لم يُفهم أي كلام.'))
    }

    recognition.start()
  })
}

// مطابقة متساهلة: تتجاهل المسافات الزائدة وعلامات التشكيل، لا تحكم على جودة مخارج الحروف.
export function normalizeArabicForMatch(text: string): string {
  return text
    .trim()
    .replace(/[ً-ٟ]/g, '') // إزالة التشكيل
    .replace(/\s+/g, ' ')
}

export function isCloseMatch(spoken: string, target: string): boolean {
  const a = normalizeArabicForMatch(spoken)
  const b = normalizeArabicForMatch(target)
  return a === b || a.includes(b) || b.includes(a)
}

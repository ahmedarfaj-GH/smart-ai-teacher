// نطق عربي بجودة أعلى عبر نموذج مفتوح المصدر (facebook/mms-tts-ara عبر Transformers.js)
// يعمل بالكامل داخل المتصفح — بلا خادم، بلا تكلفة. راجع المرحلة 8 في plan.md.
//
// ترخيص النموذج CC-BY-NC 4.0 (غير تجاري) — مقبول لأن هذا مشروع داخلي غير تجاري (تأكد مع المستخدم).
// أول استخدام يحمّل النموذج (~ميجابايتات) ويُخزَّن بذاكرة المتصفح بعدها — الاستخدامات التالية فورية.

import { pipeline, type TextToAudioPipeline } from '@huggingface/transformers'

const MODEL_ID = 'Xenova/mms-tts-ara'

let pipelinePromise: Promise<TextToAudioPipeline> | null = null
let modelReady = false
let audioContext: AudioContext | null = null
let currentSource: AudioBufferSourceNode | null = null

function getPipeline(): Promise<TextToAudioPipeline> {
  if (!pipelinePromise) {
    pipelinePromise = (pipeline('text-to-speech', MODEL_ID, { dtype: 'fp32' }) as Promise<TextToAudioPipeline>).then(
      (p) => {
        modelReady = true
        return p
      },
    )
  }
  return pipelinePromise
}

// استدعِها مبكرًا (مثلاً عند فتح شاشة الجلسة) حتى يبدأ تحميل النموذج بالتوازي قبل أول جملة.
export function preloadVoiceModel(): Promise<TextToAudioPipeline> {
  return getPipeline()
}

// فحص متزامن: هل النموذج جاهز الآن للنطق الفوري بلا انتظار تحميل؟
export function isModelReady(): boolean {
  return modelReady
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

function playAudio(samples: ArrayLike<number>, samplingRate: number): void {
  stopModelSpeech()
  const ctx = getAudioContext()
  const buffer = ctx.createBuffer(1, samples.length, samplingRate)
  buffer.copyToChannel(Float32Array.from(samples), 0)
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  source.start()
  currentSource = source
}

// ترجع true لو نجح النطق بالنموذج، false لو فشل (حتى يستخدم المستدعي صوت المتصفح كبديل).
export async function speakWithModel(text: string): Promise<boolean> {
  try {
    const synthesizer = await getPipeline()
    const output = await synthesizer(text)
    const audio = Array.isArray(output.audio) ? output.audio[0] : output.audio
    playAudio(audio, output.sampling_rate)
    return true
  } catch (err) {
    console.error('فشل النطق بالنموذج المفتوح المصدر:', err)
    return false
  }
}

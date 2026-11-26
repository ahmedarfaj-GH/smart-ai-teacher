// تسجيل صوت الطالب من المايك وتحويله إلى WAV أحادي 16kHz (الصيغة التي يقبلها Gemini، وحجمها صغير للسطر القصير).

export interface Recording {
  stop: () => Promise<Blob>
}

const MAX_SECONDS = 15
const TARGET_RATE = 16000

export async function startRecording(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
  const recorder = new MediaRecorder(stream)
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data)
  recorder.start()

  const finished = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      resolve(new Blob(chunks, { type: recorder.mimeType }))
    }
  })
  // حد أقصى لطول التسجيل حتى لا يبقى المايك مفتوحًا إن نسي الطالب الإيقاف.
  const timer = setTimeout(() => recorder.state === 'recording' && recorder.stop(), MAX_SECONDS * 1000)

  return {
    stop: async () => {
      clearTimeout(timer)
      if (recorder.state === 'recording') recorder.stop()
      return toWav(await finished)
    },
  }
}

async function toWav(recorded: Blob): Promise<Blob> {
  const context = new AudioContext()
  const decoded = await context.decodeAudioData(await recorded.arrayBuffer())
  await context.close()

  const length = Math.ceil(decoded.duration * TARGET_RATE)
  const offline = new OfflineAudioContext(1, length, TARGET_RATE)
  const source = offline.createBufferSource()
  source.buffer = decoded
  source.connect(offline.destination)
  source.start()
  const samples = (await offline.startRendering()).getChannelData(0)

  return encodeWav(samples, TARGET_RATE)
}

export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const writeText = (offset: number, text: string) => [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)))

  writeText(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeText(8, 'WAVE')
  writeText(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeText(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  samples.forEach((s, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 0x7fff, true))

  return new Blob([buffer], { type: 'audio/wav' })
}

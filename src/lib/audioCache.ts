// ذاكرة الصوت: كل نص يُولَّد صوته مرة واحدة (بواسطة الأدمن) ويُحفظ في حاوية lesson-audio، ثم يُشغَّل للجميع من الرابط
// بلا أي استدعاء مدفوع. المفتاح بصمة SHA-256 لـ "model|voice|text" فالنص المتكرر بين الدروس يُولَّد مرة واحدة.
// الطالب لا يولّد ولا يكتب شيئًا: إن لم يوجد النص في الذاكرة يرجع التطبيق لصوت المتصفح المجاني.

import { supabase } from './supabaseClient'
import { synthesizeWavBlob, TTS_MODEL, TTS_VOICE } from './mlSpeech'

const BUCKET = 'lesson-audio'

// بصمة النص → رابط الصوت (ما نُسخ إلى الذاكرة في هذه الصفحة).
const urlByHash = new Map<string, string>()
let currentAudio: HTMLAudioElement | null = null

export async function hashText(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${TTS_MODEL}|${TTS_VOICE}|${text.trim()}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function publicUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

// يحمّل من القاعدة الصوتَ المتوفر لهذه النصوص (طلب واحد). يرجع كم نصًّا له صوت جاهز.
export async function loadAudioCache(texts: string[]): Promise<number> {
  const unique = [...new Set(texts.map((t) => t.trim()).filter(Boolean))]
  const hashes = await Promise.all(unique.map(hashText))
  if (hashes.length === 0) return 0

  const { data, error } = await supabase.from('audio_cache').select('text_hash, path').in('text_hash', hashes)
  if (error) throw error
  for (const row of data ?? []) urlByHash.set(row.text_hash as string, publicUrl(row.path as string))
  return (data ?? []).length
}

export function stopCachedAudio(): void {
  currentAudio?.pause()
  currentAudio = null
}

// ترجع true إن كان للنص صوت محفوظ وبدأ تشغيله، وإلا false ليستخدم المستدعي صوت المتصفح.
export async function playCachedAudio(text: string): Promise<boolean> {
  const url = urlByHash.get(await hashText(text))
  if (!url) return false
  stopCachedAudio()
  const audio = new Audio(url)
  currentAudio = audio
  try {
    await audio.play()
    return true
  } catch {
    return false
  }
}

export type GenerateResult = 'generated' | 'already-cached'

// للأدمن فقط (الكتابة في Storage وaudio_cache محمية بصلاحية الأدمن): يولّد الصوت إن لم يكن محفوظًا.
export async function generateAndStoreAudio(text: string): Promise<GenerateResult> {
  const trimmed = text.trim()
  const hash = await hashText(trimmed)

  const { data: existing, error: lookupError } = await supabase
    .from('audio_cache')
    .select('text_hash')
    .eq('text_hash', hash)
    .maybeSingle()
  if (lookupError) throw lookupError
  if (existing) return 'already-cached'

  const blob = await synthesizeWavBlob(trimmed)
  const path = `tts/${hash}.wav`
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'audio/wav',
    upsert: true,
  })
  if (uploadError) throw uploadError

  const { error: insertError } = await supabase
    .from('audio_cache')
    .insert({ text_hash: hash, text: trimmed, voice: TTS_VOICE, model: TTS_MODEL, path, bytes: blob.size })
  if (insertError) throw insertError
  return 'generated'
}

// كم نصًّا من القائمة له صوت محفوظ (للأدمن، لعرض التقدم).
export async function countCached(texts: string[]): Promise<number> {
  const unique = [...new Set(texts.map((t) => t.trim()).filter(Boolean))]
  const hashes = await Promise.all(unique.map(hashText))
  if (hashes.length === 0) return 0
  const { count, error } = await supabase
    .from('audio_cache')
    .select('text_hash', { count: 'exact', head: true })
    .in('text_hash', hashes)
  if (error) throw error
  return count ?? 0
}

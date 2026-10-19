// ذاكرة الصوت: كل نص يُولَّد صوته مرة واحدة (من أي مستخدم مسجّل عند أول طلب، أو بالتوليد الجماعي من الأدمن)
// ويُحفظ في حاوية lesson-audio، ثم يُشغَّل للجميع من الرابط بلا أي استدعاء مدفوع.
// المفتاح بصمة SHA-256 لـ "model|voice|text" فالنص المتكرر بين الدروس يُولَّد مرة واحدة.
// صلاحيات الإضافة في القاعدة مقيّدة بالإضافة فقط (راجع migrations/004_audio_on_demand.sql).

import { supabase } from './supabaseClient'
import { synthesizeWavBlob, TTS_MODEL, TTS_VOICE } from './tts'

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

// رقم آخر طلب نطق: أي طلب أقدم ينتهي توليده/تحميله بعد طلب أحدث يُلغى ولا يُشغَّل، فلا يتداخل صوتان أبدًا.
let playToken = 0

export function stopAudio(): void {
  playToken++
  currentAudio?.pause()
  currentAudio = null
}

// طلبات التوليد الجارية (بصمة → وعد): يمنع توليد النص نفسه مرتين من الصفحة نفسها (تشغيل + إعادة تشغيل).
const inflight = new Map<string, Promise<{ url: string; generated: boolean }>>()

// رابط صوت النص: من الذاكرة المحملة، ثم من القاعدة (قد يكون مستخدم آخر ولّده)، وإلا يُولَّد ويُحفظ للجميع.
async function ensureAudio(text: string): Promise<{ url: string; generated: boolean }> {
  const trimmed = text.trim()
  const hash = await hashText(trimmed)

  const known = urlByHash.get(hash)
  if (known) return { url: known, generated: false }

  const pending = inflight.get(hash)
  if (pending) return pending

  const work = (async () => {
    const { data: existing, error: lookupError } = await supabase
      .from('audio_cache')
      .select('path')
      .eq('text_hash', hash)
      .maybeSingle()
    if (lookupError) throw lookupError
    if (existing) {
      const url = publicUrl(existing.path as string)
      urlByHash.set(hash, url)
      return { url, generated: false }
    }

    const blob = await synthesizeWavBlob(trimmed)
    const path = `tts/${hash}.wav`
    // الحفظ للجميع إضافة فقط؛ إن سبقنا مستخدم آخر (الملف موجود) نكمل بلا خطأ.
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'audio/wav' })
    if (uploadError && !/already exists|Duplicate/i.test(uploadError.message)) throw uploadError

    const { error: insertError } = await supabase
      .from('audio_cache')
      .upsert(
        { text_hash: hash, text: trimmed, voice: TTS_VOICE, model: TTS_MODEL, path, bytes: blob.size },
        { onConflict: 'text_hash', ignoreDuplicates: true },
      )
    if (insertError) throw insertError

    const url = publicUrl(path)
    urlByHash.set(hash, url)
    return { url, generated: true }
  })()

  inflight.set(hash, work)
  try {
    return await work
  } finally {
    inflight.delete(hash)
  }
}

// ينطق النص بالصوت المحفوظ، ويولّده ويحفظه أولًا إن لم يكن موجودًا (أول طلب فقط من أي مستخدم).
// لا يوجد صوت بديل: عند الفشل ترجع false ويُظهر المستدعي زر "إعادة المحاولة".
export async function playSpeechAudio(text: string): Promise<boolean> {
  stopAudio()
  const token = playToken
  try {
    const { url } = await ensureAudio(text)
    if (token !== playToken) return true // طلب أحدث حلّ محله — لا نشغّل شيئًا
    const audio = new Audio(url)
    currentAudio = audio
    await audio.play()
    return true
  } catch (err) {
    console.error('تعذّر تشغيل الصوت:', err)
    return token !== playToken
  }
}

export type GenerateResult = 'generated' | 'already-cached'

// للتوليد الجماعي من شاشة الأدمن: يولّد الصوت إن لم يكن محفوظًا.
export async function generateAndStoreAudio(text: string): Promise<GenerateResult> {
  return (await ensureAudio(text)).generated ? 'generated' : 'already-cached'
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

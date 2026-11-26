// ذاكرة الصوت: كل نص يُولَّد صوته مرة واحدة (من أي مستخدم مسجّل عند أول طلب، أو بالتوليد الجماعي من الأدمن)
// ويُحفظ في حاوية lesson-audio، ثم يُشغَّل للجميع من الرابط بلا أي استدعاء مدفوع.
// المفتاح بصمة SHA-256 لـ "model|voice|text" فالنص المتكرر بين الدروس يُولَّد مرة واحدة.
// صلاحيات الإضافة في القاعدة مقيّدة بالإضافة فقط (راجع migrations/004_audio_on_demand.sql).

import { supabase } from './supabaseClient'
import { synthesizeWavBlob, TTS_MODEL, TTS_VOICE } from './tts'

const BUCKET = 'lesson-audio'

// بصمة النص → رابط الصوت (ما نُسخ إلى الذاكرة في هذه الصفحة).
const urlByHash = new Map<string, string>()

// مشغّل واحد فقط للصفحة كلها: تغيير مصدره يقطع ما يعمل فورًا، فيستحيل أن يعمل صوتان معًا.
let player: HTMLAudioElement | null = null
function getPlayer(): HTMLAudioElement {
  if (!player) player = new Audio()
  return player
}

// النطق المركّب (المطلوب + العنصر + دعوة الطالب) أسطر منفصلة: كل سطر مقطع صوتي قصير يُولَّد ويُحفظ وحده،
// فيبقى صوت أحمد ثابتًا ويُعاد استخدام مقاطع العناصر المحفوظة بدل توليد نص طويل جديد لكل تركيبة.
export function speechParts(text: string): string[] {
  return text.split('\n').map((t) => t.trim()).filter(Boolean)
}

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
  const unique = [...new Set(texts.flatMap(speechParts))]
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
  player?.pause()
}

// آخر سبب فشل في النطق (يُعرض للمستخدم ليُعرف سبب الفشل: مفتاح أو حصة أو نموذج...).
let lastAudioError = ''
export function getLastAudioError(): string {
  return lastAudioError
}
function rememberAudioError(err: unknown): void {
  lastAudioError = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err)
}

// تبويب آخر من الموقع بدأ نطقًا ← نوقف صوت هذا التبويب (تبويبات مفتوحة سابقًا كانت تُسمع معًا).
const tabChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ahmed-audio') : null
if (tabChannel) tabChannel.onmessage = () => stopAudio()

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
  const parts = speechParts(text)
  if (parts.length === 0) return true

  // مقطع تعذّر توليده أو تشغيله يُتخطّى ونكمل بالبقية؛ الفشل هو ألا يُشغَّل أي مقطع.
  let started: { ended: Promise<boolean> } | null = null
  let next = 0
  for (; next < parts.length && !started; next++) {
    try {
      started = await startPart(parts[next], token)
      if (!started) return true // طلب أحدث حلّ محله
    } catch (err) {
      console.error('تعذّر تشغيل مقطع صوتي:', parts[next], err)
      rememberAudioError(err)
    }
  }
  if (!started) return token !== playToken

  // بقية المقاطع تُشغَّل تباعًا في الخلفية؛ المستدعي ينتظر بدء الأول فقط.
  const first = started
  void (async () => {
    let current = first
    for (const part of parts.slice(next)) {
      if (!(await current.ended)) return
      try {
        const following = await startPart(part, token)
        if (!following) return
        current = following
      } catch (err) {
        console.error('تعذّر تشغيل مقطع صوتي:', part, err)
        rememberAudioError(err)
      }
    }
  })()
  return true
}

// يبدأ تشغيل مقطع واحد ويرجع وعدًا ينتهي عند انتهائه (true) أو عند حلول طلب أحدث محله (false). null إن سُبق قبل البدء.
async function startPart(text: string, token: number): Promise<{ ended: Promise<boolean> } | null> {
  const { url } = await ensureAudio(text)
  if (token !== playToken) return null
  const audio = getPlayer()
  audio.src = url
  tabChannel?.postMessage('playing')
  const ended = new Promise<boolean>((resolve) => {
    audio.onended = () => resolve(token === playToken)
    audio.onpause = () => resolve(token === playToken) // stopAudio يوقف المشغّل فيُفكّ الانتظار
  })
  // رفض التشغيل (منع المتصفح) يصل فورًا فيُلتقط؛ وإن تأخر وعد play() لا ننتظر انتهاء المقطع.
  const playing = audio.play()
  playing.catch(() => undefined)
  await Promise.race([playing, new Promise((resolve) => setTimeout(resolve, 300))])
  return { ended } // مغلّفًا حتى لا يُسطَّح الوعد فننتظر انتهاء المقطع
}

// تجهيز أصوات السطور القادمة في الخلفية (بالتتابع، بلا تشغيل) حتى يبدأ السطر التالي فورًا عند الضغط.
export async function prefetchAudio(texts: string[]): Promise<void> {
  for (const text of texts.flatMap(speechParts)) {
    try {
      await ensureAudio(text)
    } catch {
      return // الفشل هنا لا يهم: سيُعاد المحاولة عند النطق الفعلي ويظهر خطأ هناك إن استمر
    }
  }
}

export type GenerateResult = 'generated' | 'already-cached'

// للتوليد الجماعي من شاشة الأدمن: يولّد الصوت إن لم يكن محفوظًا.
export async function generateAndStoreAudio(text: string): Promise<GenerateResult> {
  return (await ensureAudio(text)).generated ? 'generated' : 'already-cached'
}

// كم نصًّا من القائمة له صوت محفوظ (للأدمن، لعرض التقدم).
export async function countCached(texts: string[]): Promise<number> {
  const unique = [...new Set(texts.flatMap(speechParts))]
  const hashes = await Promise.all(unique.map(hashText))
  if (hashes.length === 0) return 0
  const { count, error } = await supabase
    .from('audio_cache')
    .select('text_hash', { count: 'exact', head: true })
    .in('text_hash', hashes)
  if (error) throw error
  return count ?? 0
}

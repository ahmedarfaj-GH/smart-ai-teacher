// رفع صور صفحات الكتاب: تُرسم من ملف PDF داخل المتصفح وتُرفع (مرة واحدة) إلى حاوية book-pages بالمسار <bookId>/<رقم الصفحة>.jpg.

import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { supabase } from './supabaseClient'
import type { Id } from '../types/entities'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const BUCKET = 'book-pages'

export async function uploadBookPages(
  bookId: Id,
  file: File,
  onProgress: (done: number, total: number) => void,
): Promise<number> {
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n)
    const viewport = page.getViewport({ scale: 1.4 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvas, viewport }).promise
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8))
    if (!blob) throw new Error(`تعذّر رسم الصفحة ${n}`)
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(`${bookId}/${n}.jpg`, blob, { contentType: 'image/jpeg', upsert: true })
    if (error) throw error
    onProgress(n, pdf.numPages)
  }
  return pdf.numPages
}

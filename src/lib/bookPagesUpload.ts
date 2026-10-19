// رفع صور الكتاب (ملفات صور) إلى حاوية book-pages الخاصة بالمسار <bookId>/<اسم الملف>.
// رقم الصفحة هو أول رقم في اسم الملف (page-27.jpg ← صفحة 27)، فتظهر الصورة مع أنشطة تلك الصفحة.

import { supabase } from './supabaseClient'
import type { Id } from '../types/entities'

export async function uploadBookImages(
  bookId: Id,
  files: File[],
  onProgress: (done: number, total: number) => void,
): Promise<void> {
  let done = 0
  for (const file of files) {
    const { error } = await supabase.storage
      .from('book-pages')
      .upload(`${bookId}/${file.name}`, file, { contentType: file.type || 'image/jpeg', upsert: true })
    if (error) throw error
    onProgress(++done, files.length)
  }
}

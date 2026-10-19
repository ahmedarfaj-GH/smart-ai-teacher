// رابط موقّع لصورة صفحة الكتاب (المسار <bookId>/<رقم الصفحة>.jpg في حاوية book-pages الخاصة).

import { supabase } from './supabaseClient'
import type { Id } from '../types/entities'

export async function getBookPageUrl(bookId: Id, page: string): Promise<string | undefined> {
  const { data } = await supabase.storage.from('book-pages').createSignedUrl(`${bookId}/${page}.jpg`, 3600)
  return data?.signedUrl
}

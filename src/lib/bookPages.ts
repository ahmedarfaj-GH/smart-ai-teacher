// روابط موقّعة لصور صفحة من الكتاب (ملفات <bookId>/p27-1.jpg في حاوية book-pages الخاصة).

import { supabase } from './supabaseClient'
import type { Id } from '../types/entities'

const namesByBook = new Map<Id, Promise<string[]>>()

function listBookImages(bookId: Id): Promise<string[]> {
  if (!namesByBook.has(bookId)) {
    namesByBook.set(
      bookId,
      supabase.storage
        .from('book-pages')
        .list(bookId, { limit: 1000 })
        .then(({ data }) => (data ?? []).map((f) => f.name)),
    )
  }
  return namesByBook.get(bookId)!
}

export async function getBookPageUrls(bookId: Id, page: string): Promise<string[]> {
  const names = (await listBookImages(bookId))
    .filter((n) => Number(n.match(/\d+/)?.[0]) === Number(page))
    .sort()
  if (names.length === 0) return []
  const { data } = await supabase.storage.from('book-pages').createSignedUrls(names.map((n) => `${bookId}/${n}`), 3600)
  return (data ?? []).flatMap((d) => (d.signedUrl ? [d.signedUrl] : []))
}

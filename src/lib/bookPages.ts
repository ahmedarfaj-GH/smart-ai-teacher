// رابط موقّع لصورة صفحة الكتاب كما هي (الملف <bookId>/page-27.jpg في حاوية book-pages الخاصة).

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

export async function getBookImageUrl(bookId: Id, name: string): Promise<string | undefined> {
  const { data } = await supabase.storage.from('book-pages').createSignedUrl(`${bookId}/${name}`, 3600)
  return data?.signedUrl
}

export interface PageImage {
  name: string
  url: string
}

export async function getBookPageImages(bookId: Id, page: string): Promise<PageImage[]> {
  const names = (await listBookImages(bookId))
    .filter((n) => n.startsWith('page-') && Number(n.match(/\d+/)?.[0]) === Number(page))
    .sort()
  if (names.length === 0) return []
  const { data } = await supabase.storage.from('book-pages').createSignedUrls(names.map((n) => `${bookId}/${n}`), 3600)
  return (data ?? []).flatMap((d, i) => (d.signedUrl ? [{ name: names[i], url: d.signedUrl }] : []))
}

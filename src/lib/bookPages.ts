// صور الكتاب مخدومة من public/book-pages/<bookId>/ مع التطبيق نفسه:
// page-NN.jpg صفحة الكتاب كاملة، و item-NN-K.jpg صورة سؤال بعينه (يحددها answers.image).

import type { Id } from '../types/entities'

export function bookPageImageUrl(bookId: Id, page: string): string {
  return `/book-pages/${bookId}/page-${page.padStart(2, '0')}.jpg`
}

export function bookImageUrl(bookId: Id, name: string): string {
  return `/book-pages/${bookId}/${name}`
}

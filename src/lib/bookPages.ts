// صور الكتاب مخدومة من public/book-pages/<bookId>/ مع التطبيق نفسه:
// item-NN-K.jpg صورة سؤال بعينه (يحددها answers.image للسؤال).

import type { Id } from '../types/entities'

export function bookImageUrl(bookId: Id, name: string): string {
  return `/book-pages/${bookId}/${name}`
}

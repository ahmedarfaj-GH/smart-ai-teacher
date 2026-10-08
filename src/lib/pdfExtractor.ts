// استخراج نص حقيقي من ملف PDF بالكامل داخل المتصفح — بدون أي خدمة AI/OCR مدفوعة (راجع المرحلة 8 في plan.md).
// هذا استخراج نص خام فقط؛ تنظيم النص إلى وحدات/دروس يبقى عملاً يدويًا للأدمن (لا تصنيف ذكي تلقائي).

import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export interface ExtractionProgress {
  pageNumber: number
  totalPages: number
}

export async function extractPdfText(
  file: File,
  onProgress?: (progress: ExtractionProgress) => void,
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pageTexts: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    pageTexts.push(pageText)
    onProgress?.({ pageNumber, totalPages: pdf.numPages })
  }

  return pageTexts.join('\n\n')
}

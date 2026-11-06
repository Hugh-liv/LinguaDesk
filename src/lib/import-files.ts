import { countWords } from './text'

const MAX_FILE_BYTES = 15 * 1024 * 1024
const MAX_PDF_PAGES = 120
const MAX_CHARS = 60_000

export type ImportFileKind = 'txt' | 'pdf' | 'docx'

export interface ParsedImportFile {
  fileName: string
  kind: ImportFileKind
  text: string
}

export class ImportFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportFileError'
  }
}

function extensionOf(name: string): string {
  const match = /\.([^.]+)$/.exec(name.toLowerCase())
  return match?.[1] ?? ''
}

function cleanText(raw: string): string {
  return raw
    .split('\u0000').join('')
    .replace(/\r\n?/g, '\n')
    .replace(/ /g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/([A-Za-z])-\n([a-z])/g, '$1$2')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function validateText(text: string): string {
  const clean = cleanText(text)

  if (countWords(clean) < 30) {
    throw new ImportFileError(
      '解析出的英文内容太少。扫描版 PDF 可能需要 OCR，目前暂不支持。',
    )
  }
  if (clean.length > MAX_CHARS) {
    throw new ImportFileError('文本超过 6 万字符，请拆分后再导入。')
  }

  return clean
}

async function parsePdf(
  file: File,
  onProgress?: (message: string) => void,
): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default

  const data = new Uint8Array(await file.arrayBuffer())
  const loadingTask = pdfjs.getDocument({ data })

  try {
    const pdf = await loadingTask.promise
    if (pdf.numPages > MAX_PDF_PAGES) {
      throw new ImportFileError(
        `这份 PDF 有 ${pdf.numPages} 页，目前最多解析 ${MAX_PDF_PAGES} 页。请拆分后再导入。`,
      )
    }

    const pages: string[] = []

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      onProgress?.(`正在读取 PDF · 第 ${pageNumber} / ${pdf.numPages} 页`)
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      let pageText = ''

      for (const rawItem of content.items) {
        const item = rawItem as { str?: string; hasEOL?: boolean }
        if (typeof item.str !== 'string') continue
        pageText += item.str
        pageText += item.hasEOL ? '\n' : ' '
      }

      pages.push(pageText.trim())
      page.cleanup()
    }

    await loadingTask.destroy()
    return pages.filter(Boolean).join('\n\n')
  } catch (error) {
    if (error instanceof ImportFileError) throw error
    throw new ImportFileError(
      'PDF 解析失败。它可能受密码保护，或没有可读取的文字层。',
    )
  }
}

async function parseDocx(file: File): Promise<string> {
  const { extractRawText } = await import('mammoth')

  try {
    const result = await extractRawText({
      arrayBuffer: await file.arrayBuffer(),
    })
    return result.value
  } catch {
    throw new ImportFileError('Word 文档解析失败，请确认文件没有损坏。')
  }
}

export async function parseImportFile(
  file: File,
  onProgress?: (message: string) => void,
): Promise<ParsedImportFile> {
  if (file.size > MAX_FILE_BYTES) {
    throw new ImportFileError('文件超过 15 MB，请选一个更小的文件。')
  }

  const extension = extensionOf(file.name)
  if (extension === 'doc') {
    throw new ImportFileError(
      '暂不支持老版 .doc，请先另存为 .docx 或 PDF。',
    )
  }

  let kind: ImportFileKind
  let rawText: string

  if (extension === 'txt') {
    kind = 'txt'
    onProgress?.('正在读取 TXT…')
    try {
      rawText = await file.text()
    } catch {
      throw new ImportFileError('TXT 读取失败，请重新选择文件。')
    }
  } else if (extension === 'pdf') {
    kind = 'pdf'
    rawText = await parsePdf(file, onProgress)
  } else if (extension === 'docx') {
    kind = 'docx'
    onProgress?.('正在读取 Word 文档…')
    rawText = await parseDocx(file)
  } else {
    throw new ImportFileError(
      '目前支持 .txt、.pdf 和 .docx。老版 .doc 请先另存为 .docx。',
    )
  }

  return {
    fileName: file.name,
    kind,
    text: validateText(rawText),
  }
}

/**
 * fileParser.ts
 * Extracts plain text from uploaded lecture files.
 * Supported formats: PDF (pdfjs-dist), DOCX (mammoth), PPTX (XML), TXT
 *
 * Token budget per upload (Groq free tier: 6,000 TPM for llama-3.1-8b-instant):
 *   ~400 tokens  =  prompt instructions + JSON template
 *   ~750 tokens  =  extracted text  (3,000 chars ÷ 4 chars/token)
 *   ~800 tokens  =  AI JSON response
 *   ─────────────────────────────────────────────────────────────
 *   ~1,950 tokens total  → safely under 6,000 TPM, even with model overhead
 *
 * MAX_CHARS is set conservatively at 3,000 (down from 3,500) to give extra
 * headroom for Groq's internal token counting which can exceed the 4-char/token
 * approximation for non-ASCII content and slide bullet points.
 */
const MAX_CHARS = 2_000

// ── PDF ───────────────────────────────────────────────────────
async function extractFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist')

  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  const arrayBuffer = await file.arrayBuffer()
  const pdf         = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const parts: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text    = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    parts.push(text)
    // Stop early once we have enough text — no need to parse the whole file
    if (parts.join('\n').length >= MAX_CHARS) break
  }

  return parts.join('\n').slice(0, MAX_CHARS)
}

// ── DOCX ──────────────────────────────────────────────────────
async function extractFromDOCX(file: File): Promise<string> {
  const mammoth     = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result      = await mammoth.extractRawText({ arrayBuffer })
  return result.value.slice(0, MAX_CHARS)
}

// ── PPTX ─────────────────────────────────────────────────────
async function extractFromPPTX(file: File): Promise<string> {
  let JSZip: typeof import('jszip') | null = null
  try {
    JSZip = (await import('jszip')).default
  } catch {
    return '[PPTX extraction unavailable — jszip not installed]'
  }

  const arrayBuffer = await file.arrayBuffer()
  const zip         = await JSZip.loadAsync(arrayBuffer)
  const slideFiles  = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort()

  const parts: string[] = []

  for (const slideName of slideFiles) {
    const xml  = await zip.files[slideName].async('string')
    const matches = xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)
    const slideText: string[] = []
    for (const match of matches) {
      const text = match[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim()
      if (text) slideText.push(text)
    }
    if (slideText.length) parts.push(slideText.join(' '))
    // Stop early once we have enough text
    if (parts.join('\n').length >= MAX_CHARS) break
  }

  return parts.join('\n').slice(0, MAX_CHARS)
}

// ── TXT ───────────────────────────────────────────────────────
async function extractFromTXT(file: File): Promise<string> {
  const text = await file.text()
  return text.slice(0, MAX_CHARS)
}

// ── Public API ────────────────────────────────────────────────

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()

  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return extractFromPDF(file)
  }
  if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  ) {
    return extractFromDOCX(file)
  }
  if (
    type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    name.endsWith('.pptx')
  ) {
    return extractFromPPTX(file)
  }
  if (type.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.md')) {
    return extractFromTXT(file)
  }

  throw new Error(
    `Unsupported file type: "${file.name}". Supported formats: PDF, DOCX, PPTX, TXT.`,
  )
}

export function detectFileType(file: File): 'pdf' | 'docx' | 'pptx' | 'txt' | null {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf'))  return 'pdf'
  if (name.endsWith('.docx')) return 'docx'
  if (name.endsWith('.pptx')) return 'pptx'
  if (name.endsWith('.txt'))  return 'txt'
  return null
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024)          return `${bytes} B`
  if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

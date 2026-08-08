/**
 * fileParser.ts
 * Extracts plain text from uploaded lecture files.
 * Supported formats: PDF (pdfjs-dist), DOCX (mammoth), PPTX (XML), TXT
 *
 * All exported functions truncate output to MAX_CHARS to stay within
 * Gemini's input limits.
 */

const MAX_CHARS = 30_000

// ── PDF ───────────────────────────────────────────────────────
async function extractFromPDF(file: File): Promise<string> {
  // Dynamic import so pdfjs is only loaded when needed
  const pdfjsLib = await import('pdfjs-dist')

  // Point the worker to the bundled worker file
  // Vite copies it to /assets/ automatically via optimizeDeps
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
// PPTX files are ZIP archives. Each slide is an XML file inside ppt/slides/.
// We extract text from <a:t> elements (DrawingML text runs).
async function extractFromPPTX(file: File): Promise<string> {
  // Dynamically load JSZip — may not be installed, fall back gracefully
  let JSZip: typeof import('jszip') | null = null
  try {
    JSZip = (await import('jszip')).default
  } catch {
    return '[PPTX text extraction requires jszip. Install with: npm install jszip]'
  }

  const arrayBuffer = await file.arrayBuffer()
  const zip         = await JSZip.loadAsync(arrayBuffer)
  const slideFiles  = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort()

  const parts: string[] = []

  for (const slideName of slideFiles) {
    const xml  = await zip.files[slideName].async('string')
    // Extract text from <a:t>…</a:t> tags
    const matches = xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)
    const slideText: string[] = []
    for (const match of matches) {
      const text = match[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
      if (text) slideText.push(text)
    }
    if (slideText.length) parts.push(slideText.join(' '))
  }

  return parts.join('\n').slice(0, MAX_CHARS)
}

// ── TXT ───────────────────────────────────────────────────────
async function extractFromTXT(file: File): Promise<string> {
  const text = await file.text()
  return text.slice(0, MAX_CHARS)
}

// ── Public API ────────────────────────────────────────────────

/**
 * Extracts plain text from a file, dispatching to the correct parser
 * based on the file's MIME type or extension.
 *
 * @throws if the file type is unsupported or extraction fails.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()

  // PDF
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return extractFromPDF(file)
  }

  // DOCX
  if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  ) {
    return extractFromDOCX(file)
  }

  // PPTX
  if (
    type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    name.endsWith('.pptx')
  ) {
    return extractFromPPTX(file)
  }

  // TXT and other plain text
  if (type.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.md')) {
    return extractFromTXT(file)
  }

  throw new Error(
    `Unsupported file type: "${file.name}". Supported formats: PDF, DOCX, PPTX, TXT.`,
  )
}

/** Returns the detected file type string for DB storage */
export function detectFileType(file: File): 'pdf' | 'docx' | 'pptx' | 'txt' | null {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf'))  return 'pdf'
  if (name.endsWith('.docx')) return 'docx'
  if (name.endsWith('.pptx')) return 'pptx'
  if (name.endsWith('.txt'))  return 'txt'
  return null
}

/** Human-readable file size */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024)          return `${bytes} B`
  if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

import EpubCFI from 'epubjs/lib/epubcfi'

const MAX_CONTEXT_LEN = 240

function normalizeSpaces(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function truncateWithEllipsis(text: string, maxLen: number) {
  if (text.length <= maxLen) return text
  return `${text.slice(0, maxLen - 1).trim()}…`
}

/** 在整段文本中取包含 [matchStart, matchEnd) 的上下文句子 */
export function sentenceContextInPlainText(
  plain: string,
  matchStart: number,
  matchEnd: number,
  maxLen = MAX_CONTEXT_LEN,
): string {
  const text = normalizeSpaces(plain)
  if (!text) return ''
  const start = Math.max(0, Math.min(matchStart, text.length))
  const end = Math.max(start, Math.min(matchEnd, text.length))

  let sentStart = 0
  for (let i = start - 1; i >= 0; i--) {
    if (text[i] === '。' || text[i] === '！' || text[i] === '？' || text[i] === '…') {
      sentStart = i + 1
      break
    }
    if ((text[i] === '.' || text[i] === '!' || text[i] === '?') && (i === 0 || text[i - 1] !== '.')) {
      sentStart = i + 1
      while (sentStart < text.length && text[sentStart] === ' ') sentStart++
      break
    }
    if (start - i > 140) {
      sentStart = Math.max(0, start - 90)
      break
    }
  }

  let sentEnd = text.length
  for (let i = end; i < text.length; i++) {
    if (text[i] === '。' || text[i] === '！' || text[i] === '？' || text[i] === '…') {
      sentEnd = i + 1
      break
    }
    if (text[i] === '.' || text[i] === '!' || text[i] === '?') {
      sentEnd = i + 1
      break
    }
    if (i - end > 140) {
      sentEnd = Math.min(text.length, end + 90)
      break
    }
  }

  let snippet = text.slice(sentStart, sentEnd).trim()
  if (!snippet) snippet = text.slice(Math.max(0, start - 40), Math.min(text.length, end + 40)).trim()

  if (sentStart > 0) snippet = `…${snippet}`
  if (sentEnd < text.length) snippet = `${snippet}…`

  return truncateWithEllipsis(snippet, maxLen)
}

function rangeStartOffsetIn(root: HTMLElement, range: Range): number {
  const pre = root.ownerDocument.createRange()
  pre.selectNodeContents(root)
  pre.setEnd(range.startContainer, range.startOffset)
  return pre.toString().length
}

function cfiToRange(doc: Document, cfi: string): Range | null {
  try {
    const parsed = new EpubCFI(cfi)
    return parsed.toRange(doc) as Range | null
  } catch {
    return null
  }
}

function blockForRange(range: Range): HTMLElement | null {
  let node: Node | null = range.commonAncestorContainer
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
  if (!(node instanceof HTMLElement)) return null
  return (
    node.closest('p, li, blockquote, h1, h2, h3, h4, h5, h6, td, th, figcaption, div, section') ??
    node
  )
}

/**
 * 从章节 document + CFI 生成带上下文的摘要句（优先整句，而非单个 text node）
 */
export function buildEpubSearchContextExcerpt(
  doc: Document | null | undefined,
  cfi: string,
  query: string,
  fallbackExcerpt = '',
): string {
  const fb = normalizeSpaces(fallbackExcerpt)
  if (!doc?.body) {
    return fb.length > query.length + 8 ? fb : fallbackExcerpt || query
  }

  const range = cfiToRange(doc, cfi)
  if (!range) {
    return fb.length > query.length + 8 ? fb : fallbackExcerpt || query
  }

  const matchText = range.toString() || query
  const block = blockForRange(range)
  const blockEl = (block ?? doc.body) as HTMLElement
  const blockPlain = blockEl.textContent || ''
  const relStart = rangeStartOffsetIn(blockEl, range)
  const relEnd = relStart + matchText.length

  let snippet = sentenceContextInPlainText(blockPlain, relStart, relEnd)
  if (snippet.length <= matchText.length + 4) {
    const bodyPlain = doc.body.textContent || ''
    const absStart = rangeStartOffsetIn(doc.body, range)
    snippet = sentenceContextInPlainText(bodyPlain, absStart, absStart + matchText.length)
  }

  if (!snippet) return fb || matchText
  return normalizeSpaces(snippet)
}

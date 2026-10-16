// 沉浸式共读：本地切章与 EPUB 解析
// @author hc @date 2026-10-16

import ePub from "epubjs"
import type { CoReadChapter } from "@/types/coReading"

const CHAPTER_HEAD_RE =
  /^(第[零一二三四五六七八九十百千万\d]+[章回节卷部]|Chapter\s+\d+|CHAPTER\s+\d+)/im

export type CoReadFileFormat = "txt" | "markdown" | "epub"

export function detectCoReadFormat(fileName: string): CoReadFileFormat | "" {
  const name = String(fileName || "").toLowerCase()
  if (name.endsWith(".epub")) return "epub"
  if (
    name.endsWith(".md") ||
    name.endsWith(".markdown") ||
    name.endsWith(".mdown") ||
    name.endsWith(".mkd") ||
    name.endsWith(".txt")
  ) {
    return name.endsWith(".txt") ? "txt" : "markdown"
  }
  return ""
}

export function paragraphsFromText(text: string): string[] {
  const normalized = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
  const blocks = normalized.split(/\n\s*\n+/)
  const paragraphs: string[] = []
  for (const block of blocks) {
    const p = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n")
      .trim()
    if (p) paragraphs.push(p)
  }
  if (paragraphs.length === 0 && normalized.trim()) {
    paragraphs.push(normalized.trim())
  }
  return paragraphs
}

export function splitChapters(text: string): CoReadChapter[] {
  const normalized = String(text || "").replace(/\r\n/g, "\n").trim()
  if (!normalized) {
    return [{ index: 0, title: "Chapter 1", paragraphs: [""], charCount: 0 }]
  }

  const chunks = normalized.split(/(?=^(?:第[零一二三四五六七八九十百千万\d]+[章回节卷部]|Chapter\s+\d+|CHAPTER\s+\d+).*$)/im)
  const chapters: CoReadChapter[] = []
  let index = 0

  for (const chunk of chunks) {
    const trimmed = chunk.trim()
    if (!trimmed) continue
    const lines = trimmed.split("\n")
    let title = lines[0]?.trim() || `Chapter ${index + 1}`
    let bodyStart = 0
    if (CHAPTER_HEAD_RE.test(title)) {
      bodyStart = 1
    } else {
      title = index === 0 ? "Chapter 1" : `Chapter ${index + 1}`
      bodyStart = 0
    }
    const body = lines.slice(bodyStart).join("\n")
    const paragraphs = paragraphsFromText(body)
    const charCount = body.length
    chapters.push({
      index,
      title,
      paragraphs: paragraphs.length ? paragraphs : [""],
      charCount,
    })
    index++
  }

  if (chapters.length === 0) {
    const paragraphs = paragraphsFromText(normalized)
    return [
      {
        index: 0,
        title: "Chapter 1",
        paragraphs: paragraphs.length ? paragraphs : [normalized],
        charCount: normalized.length,
      },
    ]
  }
  return chapters
}

function normalizeTitleKey(s: string): string {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function resolveNavHref(href: string, navBasePath: string): string {
  const path = href.split("#")[0]
  if (!path) return href
  if (!navBasePath) return path
  try {
    const base = "https://invalid.local/"
    const resolved = new URL(path, base + navBasePath).href.replace(base, "")
    const hash = href.includes("#") ? `#${href.split("#").slice(1).join("#")}` : ""
    return `${resolved}${hash}`
  } catch {
    return path
  }
}

type NavItemLike = { href?: string; label?: string; subitems?: NavItemLike[] }

function buildTocHrefLabelMap(book: ReturnType<typeof ePub>): Map<string, string> {
  const map = new Map<string, string>()
  const packaging = book.packaging as { navPath?: string; ncxPath?: string }
  const navBase = packaging.navPath || packaging.ncxPath || ""
  const walk = (items: NavItemLike[]) => {
    for (const item of items) {
      const label = item.label?.replace(/\s+/g, " ").trim()
      if (item.href && label) {
        const resolved = resolveNavHref(item.href, navBase)
        const pathOnly = resolved.split("#")[0]
        for (const key of [item.href, resolved, pathOnly, pathOnly.split("/").pop()].filter(Boolean)) {
          if (key && !map.has(key)) map.set(key, label)
        }
      }
      if (item.subitems?.length) walk(item.subitems)
    }
  }
  walk((book.navigation?.toc as NavItemLike[]) || [])
  return map
}

function lookupTocLabel(map: Map<string, string>, href: string): string | undefined {
  if (!href) return undefined
  const pathOnly = href.split("#")[0]
  const base = pathOnly.split("/").pop() || pathOnly
  for (const key of [href, pathOnly, base]) {
    const label = map.get(key)
    if (label) return label
  }
  return undefined
}

function titleFromDocument(doc: Document, bookTitle: string): string {
  const bookKey = normalizeTitleKey(bookTitle)
  const selectors = ["h1", "h2", "h3", "[role='doc-subtitle']", ".chapter-title", ".title"]
  for (const sel of selectors) {
    for (const el of doc.querySelectorAll(sel)) {
      const t = el.textContent?.replace(/\s+/g, " ").trim() || ""
      if (t.length >= 2 && t.length <= 160 && normalizeTitleKey(t) !== bookKey) {
        return t
      }
    }
  }
  const bodyText = doc.body?.innerText || doc.body?.textContent || ""
  const lines = bodyText.split(/\n/).map((l) => l.trim()).filter(Boolean).slice(0, 8)
  for (const line of lines) {
    if (normalizeTitleKey(line) === bookKey) continue
    if (CHAPTER_HEAD_RE.test(line)) return line
    if (
      line.length >= 3 &&
      line.length <= 100 &&
      /^(chapter|introduction|prologue|epilogue|part\s+\d|第.+[章部篇])/i.test(line)
    ) {
      return line
    }
  }
  return ""
}

function disambiguateChapterTitles(chapters: CoReadChapter[], bookTitle: string): CoReadChapter[] {
  if (chapters.length <= 1) return chapters
  const bookKey = normalizeTitleKey(bookTitle)
  const unique = new Set(chapters.map((c) => normalizeTitleKey(c.title)))
  const allSameAsBook =
    unique.size === 1 && (unique.has(bookKey) || unique.has("") || chapters.every((c) => !c.title.trim()))
  const allIdentical = unique.size === 1 && !allSameAsBook
  if (allSameAsBook || allIdentical) {
    return chapters.map((ch, i) => ({
      ...ch,
      title: ch.title && !allSameAsBook ? `${ch.title} · ${i + 1}` : `Chapter ${i + 1}`,
    }))
  }
  const seen = new Map<string, number>()
  return chapters.map((ch) => {
    const key = normalizeTitleKey(ch.title)
    const n = seen.get(key) || 0
    seen.set(key, n + 1)
    if (n === 0) return ch
    return { ...ch, title: `${ch.title} (${n + 1})` }
  })
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === "function") {
    return file.arrayBuffer()
  }
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error || new Error("FileReader error"))
    reader.readAsArrayBuffer(file)
  })
}

async function parseEpubChapters(file: File): Promise<CoReadChapter[]> {
  const data = await readFileAsArrayBuffer(file)
  const book = ePub(data)
  await book.ready
  await book.loaded.navigation
  const bookTitle = String(book.packaging?.metadata?.title || "").trim()
  const tocLabels = buildTocHrefLabelMap(book)
  const chapters: CoReadChapter[] = []
  const spine = book.spine as {
    length?: number
    get?: (i: number) => {
      load: (fn: typeof book.load) => Promise<void>
      unload?: () => void
      document?: Document
      href?: string
      url?: string
      canonical?: string
    }
  }
  const len = spine.length ?? 0
  for (let i = 0; i < len; i++) {
    const item = spine.get?.(i)
    if (!item) continue
    try {
      await item.load(book.load.bind(book))
      const doc = item.document
      if (!doc) continue
      const text = doc.body?.textContent || ""
      const paragraphs = paragraphsFromText(text)
      if (!paragraphs.length && !text.trim()) continue

      const spineHref = item.href || item.canonical || item.url || ""
      const tocLabel = lookupTocLabel(tocLabels, spineHref)
      const docTitle = doc.title?.trim() || ""
      const fromDoc = titleFromDocument(doc, bookTitle)
      let title = ""
      if (tocLabel && normalizeTitleKey(tocLabel) !== normalizeTitleKey(bookTitle)) {
        title = tocLabel
      } else if (fromDoc) {
        title = fromDoc
      } else if (docTitle && normalizeTitleKey(docTitle) !== normalizeTitleKey(bookTitle)) {
        title = docTitle
      } else if (tocLabel) {
        title = tocLabel
      } else {
        title = `Chapter ${chapters.length + 1}`
      }

      chapters.push({
        index: chapters.length,
        title,
        paragraphs: paragraphs.length ? paragraphs : [text.trim() || ""],
        charCount: text.length,
        epubSpineIndex: i,
      })
      item.unload?.()
    } catch {
      /* skip broken spine item */
    }
  }
  try {
    book.destroy?.()
  } catch {
    /* ignore */
  }
  if (chapters.length === 0) {
    return [{ index: 0, title: "Chapter 1", paragraphs: [""], charCount: 0 }]
  }
  return disambiguateChapterTitles(chapters, bookTitle)
}

export async function sha256HexFile(file: File): Promise<string> {
  const buf = await readFileAsArrayBuffer(file)
  const hash = await crypto.subtle.digest("SHA-256", buf)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function parseCoReadFile(file: File): Promise<{
  chapters: CoReadChapter[]
  fileHash: string
  format: CoReadFileFormat
}> {
  const format = detectCoReadFormat(file.name)
  if (!format) throw new Error("CO_READ_UNSUPPORTED")
  const fileHash = await sha256HexFile(file)
  let chapters: CoReadChapter[]
  if (format === "epub") {
    chapters = await parseEpubChapters(file)
  } else {
    const text = await file.text()
    chapters = splitChapters(text)
  }
  return { chapters, fileHash, format }
}

/** API 章序为 1-based */
export function chapterApiNumber(chapterIndex: number): number {
  return chapterIndex + 1
}

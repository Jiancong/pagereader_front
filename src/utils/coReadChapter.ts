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
  const chapters: CoReadChapter[] = []
  const spine = book.spine as { length?: number; get?: (i: number) => { load: (fn: typeof book.load) => Promise<void>; document?: Document } }
  const len = spine.length ?? 0
  for (let i = 0; i < len; i++) {
    const item = spine.get?.(i)
    if (!item) continue
    try {
      await item.load(book.load.bind(book))
      const doc = item.document
      const text = doc?.body?.textContent || ""
      const paragraphs = paragraphsFromText(text)
      if (!paragraphs.length && !text.trim()) continue
      const title =
        doc?.title?.trim() ||
        doc?.querySelector("h1, h2")?.textContent?.trim() ||
        `Section ${i + 1}`
      chapters.push({
        index: chapters.length,
        title,
        paragraphs: paragraphs.length ? paragraphs : [text.trim() || ""],
        charCount: text.length,
      })
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
  return chapters
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

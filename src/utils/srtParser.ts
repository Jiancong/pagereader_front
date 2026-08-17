/** SRT 字幕解析：提取说话人、时间轴与正文（供预览与 document RAG 对齐） */

export type SrtCue = {
  index: number
  start: string
  end: string
  speaker?: string
  text: string
}

export type SrtParseResult = {
  cues: SrtCue[]
  speakers: string[]
  cueCount: number
  charCount: number
  previewText: string
}

const TIMESTAMP_RE =
  /^(\d{1,2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{3})/

/** 如 [SPEAKER_02|fp:05ef90b4] */
const SPEAKER_TAG_RE = /^\[([^\]|]+)(?:\|[^\]]+)?\]\s*/

function normalizeSrtContent(raw: string): string {
  return String(raw || "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
}

function extractSpeakerAndText(line: string): { speaker?: string; text: string } {
  const trimmed = line.trim()
  const match = trimmed.match(SPEAKER_TAG_RE)
  if (match) {
    return { speaker: match[1].trim(), text: trimmed.slice(match[0].length).trim() }
  }
  return { text: trimmed }
}

function parseCueBlock(block: string, fallbackIndex: number): SrtCue | null {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length < 2) return null

  let cursor = 0
  let index = fallbackIndex
  if (/^\d+$/.test(lines[0])) {
    index = Number(lines[0])
    cursor = 1
  }

  const timestampLine = lines[cursor]
  const tsMatch = timestampLine.match(TIMESTAMP_RE)
  if (!tsMatch) return null

  const textLines = lines.slice(cursor + 1)
  if (!textLines.length) return null

  let speaker: string | undefined
  const textParts: string[] = []

  for (const line of textLines) {
    const parsed = extractSpeakerAndText(line)
    if (parsed.speaker && !speaker) speaker = parsed.speaker
    if (parsed.text) textParts.push(parsed.text)
  }

  const text = textParts.join(" ").replace(/\s{2,}/g, " ").trim()
  if (!text) return null

  return {
    index,
    start: tsMatch[1].replace(".", ","),
    end: tsMatch[2].replace(".", ","),
    speaker,
    text,
  }
}

/** 解析 SRT 全文为结构化 cues */
export function parseSrtContent(raw: string): SrtParseResult {
  const normalized = normalizeSrtContent(raw)
  if (!normalized) {
    return { cues: [], speakers: [], cueCount: 0, charCount: 0, previewText: "" }
  }

  const blocks = normalized.split(/\n{2,}/)
  const cues: SrtCue[] = []

  blocks.forEach((block, i) => {
    const cue = parseCueBlock(block, i + 1)
    if (cue) cues.push(cue)
  })

  const speakers = [...new Set(cues.map((c) => c.speaker).filter(Boolean) as string[])]
  const plainText = formatSrtPlainText(cues)
  const previewText = plainText.length > 600 ? `${plainText.slice(0, 600)}…` : plainText

  return {
    cues,
    speakers,
    cueCount: cues.length,
    charCount: plainText.length,
    previewText,
  }
}

/** 合并为可读纯文本（保留说话人标签，便于 RAG / 预览） */
export function formatSrtPlainText(cues: SrtCue[]): string {
  return cues
    .map((cue) => {
      const label = cue.speaker ? `${cue.speaker}: ` : ""
      return `${label}${cue.text}`.trim()
    })
    .filter(Boolean)
    .join("\n")
}

export function isSrtFileName(name: string, mime = ""): boolean {
  const lower = String(name || "").toLowerCase()
  const m = String(mime || "").toLowerCase()
  return lower.endsWith(".srt") || m === "application/x-subrip" || m === "text/srt"
}

export async function readSrtFile(file: File): Promise<SrtParseResult> {
  const text = await file.text()
  return parseSrtContent(text)
}

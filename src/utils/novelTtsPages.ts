import type { TtsPageInput } from "@/api/agent"
import { TTS_VOICE_EN, TTS_VOICE_ZH } from "@/api/agent"
import type { NovelGuideSection } from "@/utils/novelGuideSections"

const CJK_CHAR_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/

function stripMarkdownForTts(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\|/g, " ")
    .replace(/^>\s?/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function resolveTtsVoice(text: string): string {
  return CJK_CHAR_RE.test(text) ? TTS_VOICE_ZH : TTS_VOICE_EN
}

/** Remove nav label duplicated as the first line of section body. */
function stripLeadingSectionLabel(body: string, label: string): string {
  const text = body.trim()
  const navLabel = label.trim()
  if (!text || !navLabel) return text

  if (text.startsWith(navLabel)) {
    return text.slice(navLabel.length).replace(/^\s*\n+/, "").trim()
  }

  const [firstLine, ...rest] = text.split(/\r?\n/)
  if (firstLine?.trim().toLowerCase() === navLabel.toLowerCase()) {
    return rest.join("\n").trim()
  }

  return text
}

export function buildTtsPagesFromNovelSections(sections: NovelGuideSection[]): TtsPageInput[] {
  return sections.map((section, index) => {
    const label = section.label.trim()
    const rawBody = stripMarkdownForTts(section.markdown)
    const body = stripLeadingSectionLabel(rawBody, label)
    const ttsText = body || label
    return {
      index: index + 1,
      ttsText,
      voice: resolveTtsVoice(ttsText),
    }
  })
}

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

export function buildTtsPagesFromNovelSections(sections: NovelGuideSection[]): TtsPageInput[] {
  return sections.map((section, index) => {
    const title = section.label.trim()
    // 只朗读右侧正文；左侧导航 label 不参与 TTS（避免先读一遍提纲标题）
    const body = stripMarkdownForTts(section.markdown)
    const text = body || title
    return {
      index: index + 1,
      title,
      text,
      voice: resolveTtsVoice(text),
    }
  })
}

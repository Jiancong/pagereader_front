// 小说导读：左侧导航 + 右侧正文的分段结构
// @author hc

import type { NovelNode } from "@/utils/novelStream"
import { demoteH2ToH3InSectionBody } from "@/utils/novelMarkdownHeadings"

export type NovelGuideSectionKind = "summary" | "characters" | "chapter" | "qa" | "outline" | "generic"

export type NovelGuideOutlineItem = {
  index?: number
  title: string
  level: "part" | "chapter" | "section"
}

export type NovelGuideSection = {
  id: string
  kind: NovelGuideSectionKind
  label: string
  markdown: string
  outlineItems?: NovelGuideOutlineItem[]
}

export type NovelGuideOutline = {
  title?: string
  sections: NovelGuideSection[]
}

function pickString(v: unknown): string {
  return typeof v === "string" ? v.trim() : ""
}

function sortNovelNodes(nodes: NovelNode[]): NovelNode[] {
  return [...nodes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
}

function truncateLabel(text: string, max = 42): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function inferSectionKind(heading: string): NovelGuideSectionKind | "chapter_group" | "qa_group" {
  const h = heading.trim()
  if (/全书摘要|book\s*summary|summary/i.test(h)) return "summary"
  if (/人物|character/i.test(h)) return "characters"
  if (/章节|chapter/i.test(h)) return "chapter_group"
  if (/问答|q\s*&\s*a|faq/i.test(h)) return "qa_group"
  return "generic"
}

function splitH3Blocks(body: string): Array<{ label: string; markdown: string }> {
  const text = body.trim()
  if (!text) return []

  const matches = [...text.matchAll(/^###\s+(.+)$/gm)]
  if (!matches.length) {
    return [{ label: "", markdown: text }]
  }

  const blocks: Array<{ label: string; markdown: string }> = []
  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i]
    const label = pickString(match[1])
    const start = match.index! + match[0].length
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length
    const chunk = text.slice(start, end).trim()
    blocks.push({
      label,
      markdown: chunk,
    })
  }
  return blocks
}

function buildQaListMarkdown(items: NovelNode["items"]): string {
  if (!Array.isArray(items) || !items.length) return ""

  const parts: string[] = []
  for (const item of items) {
    const q = pickString(item?.question)
    const a = pickString(item?.answer)
    if (!q && !a) continue
    const prefix = item?.index != null ? `${item.index}. ` : ""
    if (q) parts.push(`### ${prefix}${q}`, "")
    if (a) parts.push(a, "")
  }
  return parts.join("\n").trim()
}

function buildCharacterTableMarkdown(node: NovelNode): string {
  const table = pickString(node.table_markdown)
  if (table) return table

  if (!Array.isArray(node.characters) || !node.characters.length) return ""
  const rows = ["| 姓名 | 角色 |", "| --- | --- |"]
  for (const row of node.characters) {
    rows.push(`| ${pickString(row.name)} | ${pickString(row.role)} |`)
  }
  return rows.join("\n")
}

function normalizeOutlineTitle(title: string): string {
  return title.replace(/\.+\s*$/g, "").replace(/\s+/g, " ").trim()
}

function classifyOutlineLevel(title: string): NovelGuideOutlineItem["level"] {
  const t = normalizeOutlineTitle(title)
  if (/^(Part\s+)?[IVXLC]+\b/i.test(t) && !/^\d/.test(t)) return "part"
  if (/^\d+\s+[A-Za-z\u4e00-\u9fff]/.test(t)) return "chapter"
  return "section"
}

function shouldSkipOutlineEntry(title: string): boolean {
  const t = normalizeOutlineTitle(title)
  if (!t) return true
  if (/^Chapter\s+\d+$/i.test(t)) return true
  if (/^Part\s+(I|II|III|IV|V|VI|\d+)$/i.test(t)) return true
  return false
}

function buildOutlineTocItems(chapters: NonNullable<NovelNode["chapters"]>): NovelGuideOutlineItem[] {
  const items: NovelGuideOutlineItem[] = []
  for (const chapter of chapters) {
    const title = normalizeOutlineTitle(pickString(chapter.title))
    if (shouldSkipOutlineEntry(title)) continue
    items.push({
      index: chapter.index,
      title,
      level: classifyOutlineLevel(title),
    })
  }
  return items
}

function buildOutlineTocMarkdown(items: NovelGuideOutlineItem[]): string {
  return items.map((item) => `${item.index ?? ""}. ${item.title}`.trim()).join("\n")
}

function buildSectionsFromNovelNodes(nodes: NovelNode[]): NovelGuideSection[] {
  const sections: NovelGuideSection[] = []

  for (const node of sortNovelNodes(nodes)) {
    const nodeKey = pickString(node.node_key).toLowerCase()
    const contentType = pickString(node.content_type).toLowerCase()
    const heading = pickString(node.title)

    if (contentType === "markdown" && pickString(node.text)) {
      const isSummary = nodeKey === "book_summary" || nodeKey === "document_summary"
      sections.push({
        id: isSummary ? "summary" : slugify(heading || nodeKey || "section"),
        kind: isSummary ? "summary" : "generic",
        label: heading || (isSummary ? "全书摘要" : "内容"),
        markdown: pickString(node.text),
      })
      continue
    }

    if (contentType === "character_table" || nodeKey === "characters") {
      const table = buildCharacterTableMarkdown(node)
      if (!table) continue
      sections.push({
        id: "characters",
        kind: "characters",
        label: heading || "人物表",
        markdown: table,
      })
      continue
    }

    if (contentType === "chapter_list" || nodeKey === "chapter_guide") {
      const chapters = Array.isArray(node.chapters) ? node.chapters : []
      if (!chapters.length) continue

      // Document guide TOC: keep outline as one navigable section instead of 100+ entries.
      if (nodeKey === "outline") {
        const outlineItems = buildOutlineTocItems(chapters)
        sections.push({
          id: "outline",
          kind: "outline",
          label: heading || "目录大纲",
          markdown: buildOutlineTocMarkdown(outlineItems),
          outlineItems,
        })
        continue
      }

      chapters.forEach((chapter, index) => {
        const chapterTitle = pickString(chapter.title) || `第 ${chapter.index ?? index + 1} 章`
        const text = pickString(chapter.text)
        sections.push({
          id: `chapter-${chapter.index ?? index + 1}`,
          kind: "chapter",
          label: chapterTitle,
          markdown: text,
        })
      })
      continue
    }

    if (contentType === "qa_list" || nodeKey === "qa") {
      const markdown = buildQaListMarkdown(node.items)
      if (!markdown) continue
      sections.push({
        id: "qa",
        kind: "qa",
        label: heading || "问答",
        markdown,
      })
      continue
    }

    const fallback = pickString(node.text)
    if (fallback || heading) {
      sections.push({
        id: slugify(heading || nodeKey || `section-${sections.length}`) || `section-${sections.length}`,
        kind: "generic",
        label: heading || "内容",
        markdown: fallback,
      })
    }
  }

  return sections
}

function parseMarkdownSections(markdown: string): NovelGuideSection[] {
  const text = markdown.trim()
  if (!text) return []

  let body = text
  const titleMatch = text.match(/^#\s+(.+?)(?:\r?\n|$)/m)
  if (titleMatch) {
    body = text.slice(titleMatch.index! + titleMatch[0].length).trim()
  }

  const h2Matches = [...body.matchAll(/^##\s+(.+)$/gm)]
  if (!h2Matches.length) {
    return body
      ? [{ id: "content", kind: "generic", label: "导读", markdown: body }]
      : []
  }

  const sections: NovelGuideSection[] = []

  for (let i = 0; i < h2Matches.length; i += 1) {
    const match = h2Matches[i]
    const heading = pickString(match[1])
    const start = match.index! + match[0].length
    const end = i + 1 < h2Matches.length ? h2Matches[i + 1].index! : body.length
    const sectionBody = body.slice(start, end).trim()
    const inferred = inferSectionKind(heading)

    if (inferred === "chapter_group") {
      const blocks = splitH3Blocks(sectionBody)
      blocks.forEach((block, index) => {
        const label = block.label || `${heading} ${index + 1}`
        sections.push({
          id: `chapter-${slugify(label) || index + 1}`,
          kind: "chapter",
          label: truncateLabel(label),
          markdown: block.markdown,
        })
      })
      continue
    }

    if (inferred === "qa_group") {
      sections.push({
        id: "qa",
        kind: "qa",
        label: heading,
        markdown: sectionBody,
      })
      continue
    }

    sections.push({
      id: slugify(heading) || `section-${sections.length}`,
      kind: inferred === "generic" ? "generic" : inferred,
      label: heading,
      markdown: sectionBody,
    })
  }

  return sections
}

/** Build export markdown: ## section title, ### subsections in body. */
export function buildNovelGuideExportMarkdown(outline: NovelGuideOutline): string {
  const parts: string[] = []
  if (outline.title) parts.push(`# ${outline.title}`, "")

  for (const section of outline.sections) {
    parts.push(`## ${section.label}`, "")
    if (section.outlineItems?.length) {
      for (const item of section.outlineItems) {
        parts.push(`${item.index != null ? `${item.index}. ` : ""}${item.title}`)
      }
      parts.push("")
      continue
    }
    const body = demoteH2ToH3InSectionBody(section.markdown.trim())
    if (body) parts.push(body, "")
  }

  return parts.join("\n").trim()
}

/** 从 novel_nodes 或 Markdown 正文构建左侧导航与右侧展示分段 */
export function buildNovelGuideOutline(options: {
  markdown?: string
  novelNodes?: NovelNode[]
  title?: string
}): NovelGuideOutline {
  const title = pickString(options.title)
  const fromNodes =
    Array.isArray(options.novelNodes) && options.novelNodes.length
      ? buildSectionsFromNovelNodes(options.novelNodes)
      : []

  const sections =
    fromNodes.length > 0 ? fromNodes : parseMarkdownSections(pickString(options.markdown))

  return { title: title || undefined, sections }
}

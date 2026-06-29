// 小说导读：左侧导航 + 右侧正文的分段结构
// @author hc

import type { NovelNode } from "@/utils/novelStream"

export type NovelGuideSectionKind = "summary" | "characters" | "chapter" | "qa" | "generic"

export type NovelGuideSection = {
  id: string
  kind: NovelGuideSectionKind
  label: string
  markdown: string
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

function buildSectionsFromNovelNodes(nodes: NovelNode[]): NovelGuideSection[] {
  const sections: NovelGuideSection[] = []

  for (const node of sortNovelNodes(nodes)) {
    const nodeKey = pickString(node.node_key).toLowerCase()
    const contentType = pickString(node.content_type).toLowerCase()
    const heading = pickString(node.title)

    if (contentType === "markdown" && pickString(node.text)) {
      sections.push({
        id: nodeKey === "book_summary" ? "summary" : slugify(heading || nodeKey || "section"),
        kind: nodeKey === "book_summary" ? "summary" : "generic",
        label: heading || (nodeKey === "book_summary" ? "全书摘要" : "内容"),
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
      const items = Array.isArray(node.items) ? node.items : []
      items.forEach((item, index) => {
        const q = pickString(item.question)
        const a = pickString(item.answer)
        if (!q && !a) return
        const prefix = item.index != null ? `${item.index}. ` : ""
        const label = q ? truncateLabel(`${prefix}${q}`) : `问答 ${index + 1}`
        sections.push({
          id: `qa-${item.index ?? index + 1}`,
          kind: "qa",
          label,
          markdown: a || q,
        })
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

    if (inferred === "chapter_group" || inferred === "qa_group") {
      const kind: NovelGuideSectionKind = inferred === "chapter_group" ? "chapter" : "qa"
      const blocks = splitH3Blocks(sectionBody)
      blocks.forEach((block, index) => {
        const label = block.label || `${heading} ${index + 1}`
        sections.push({
          id: `${kind}-${slugify(label) || index + 1}`,
          kind,
          label: truncateLabel(label),
          markdown: block.markdown,
        })
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

/** Demote ## headings to ### inside a section body (e.g. 摘要 / 分析 under a chapter). */
export function demoteH2ToH3InSectionBody(body: string): string {
  return body.replace(/^##(?!#)\s+/gm, "### ")
}

/**
 * LLM 输出有时把多条无序列表挤在一行（用 " * **术语**" 连接），
 * 标准 Markdown 解析器只会生成单个 <li>。展开为逐行列表项。
 */
export function normalizeCollapsedMarkdownLists(markdown: string): string {
  const text = markdown.trim()
  if (!text) return markdown

  return text
    .replace(/(?<!\n)\s+\*\s+\*\*/g, "\n* **")
    .replace(/([。．.!?；;])\s+\*\s+(?=[\u4e00-\u9fffA-Za-z0-9(（])/g, "$1\n* ")
}

/** Novel guide section body cleanup before render or export. */
export function normalizeNovelGuideMarkdown(markdown: string): string {
  return normalizeCollapsedMarkdownLists(markdown)
}

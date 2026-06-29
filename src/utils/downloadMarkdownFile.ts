export function sanitizeDownloadBasename(title: string, fallback = "novel-guide"): string {
  const cleaned = String(title || fallback)
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .trim()
  return cleaned.slice(0, 80) || fallback
}

export function downloadMarkdownFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename.endsWith(".md") ? filename : `${filename}.md`
  anchor.click()
  URL.revokeObjectURL(url)
}

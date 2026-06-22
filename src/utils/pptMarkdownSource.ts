const MARKDOWN_KEYS = new Set([
  "markdow",
  "markdown",
  "article_markdown",
  "articleMarkdown",
  "source_markdown",
  "sourceMarkdown",
])

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function cleanMarkdown(value: unknown): string | null {
  if (typeof value !== "string") return null
  const text = value.trim()
  return text ? text : null
}

export function pickMarkdownFromPayload(payload: unknown): string | null {
  const seen = new WeakSet<object>()

  const visit = (value: unknown, depth: number): string | null => {
    if (depth > 4) return null
    const direct = cleanMarkdown(value)
    if (direct) return direct

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = visit(item, depth + 1)
        if (found) return found
      }
      return null
    }

    const obj = asRecord(value)
    if (!obj) return null
    if (seen.has(obj)) return null
    seen.add(obj)

    for (const key of MARKDOWN_KEYS) {
      const found = cleanMarkdown(obj[key])
      if (found) return found
    }

    for (const key of ["payload", "data", "metadata", "ppt_data", "pptData", "result"]) {
      const found = visit(obj[key], depth + 1)
      if (found) return found
    }

    return null
  }

  return visit(payload, 0)
}

export function pickMarkdownFromHistory(history: unknown[]): string | null {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const found = pickMarkdownFromPayload(history[i])
    if (found) return found
  }
  return null
}

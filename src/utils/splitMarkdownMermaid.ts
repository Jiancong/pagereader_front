export type ChatContentSegment =
  | { type: "markdown"; text: string }
  | { type: "mermaid"; code: string };

/**
 * 将 ```mermaid ... ``` 围栏拆成独立段，其余保留为 markdown 文本（再走 marked）。
 * 大小写不敏感；支持 Windows 换行。
 */
export function splitMarkdownWithMermaid(raw: string): ChatContentSegment[] {
  const text = raw ?? "";
  const re = /```\s*mermaid\s*\r?\n([\s\S]*?)```/gi;
  const parts: ChatContentSegment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      const before = text.slice(last, m.index);
      parts.push({ type: "markdown", text: before });
    }
    const code = (m[1] ?? "").replace(/\r\n/g, "\n").trim();
    if (code.length > 0) {
      parts.push({ type: "mermaid", code });
    }
    last = re.lastIndex;
  }
  if (last < text.length) {
    parts.push({ type: "markdown", text: text.slice(last) });
  }
  if (parts.length === 0 && text.length > 0) {
    parts.push({ type: "markdown", text });
  }
  return parts;
}

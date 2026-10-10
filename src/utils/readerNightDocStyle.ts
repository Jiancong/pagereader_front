// 注入 foliate / 内嵌 iframe 文档的夜间样式
// @author hc

const STYLE_ID = "page2top-reader-night-style"

const NIGHT_CSS = `
html, body {
  background: #0a0a0a !important;
  color: #e5e5e5 !important;
}
body, p, div, span, li, td, th, h1, h2, h3, h4, h5, h6 {
  color: #e5e5e5 !important;
}
a { color: #93c5fd !important; }
`

export function applyReaderDocColorTheme(doc: Document, theme: "light" | "dark"): void {
  const existing = doc.getElementById(STYLE_ID)
  if (theme === "dark") {
    if (existing) return
    const style = doc.createElement("style")
    style.id = STYLE_ID
    style.textContent = NIGHT_CSS
    doc.head?.appendChild(style)
  } else if (existing) {
    existing.remove()
  }
}

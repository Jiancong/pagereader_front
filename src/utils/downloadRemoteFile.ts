/** 拉取远程 URL 为 Blob 并触发浏览器下载（避免 cross-origin 链接触发站内预览） */
export async function downloadFileFromUrl(url: string, filename: string): Promise<void> {
  const res = await fetch(url, { mode: "cors", credentials: "omit" })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement("a")
    anchor.href = objectUrl
    anchor.download = filename
    anchor.rel = "noopener"
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

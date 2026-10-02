/**
 * 专家封面预设：图片放在 public/book-expert/avatars/，清单见 manifest.json。
 * 后端 spec：docs/book_expert_avatar_presets_spec.md
 */
export interface BookExpertAvatarPreset {
  id: string
  fileName: string
  url: string
}

export function bookExpertAvatarPublicBase(): string {
  const base = import.meta.env.BASE_URL || "/"
  const normalized = base.endsWith("/") ? base : `${base}/`
  return `${normalized}book-expert/avatars/`
}

export function bookExpertAvatarPublicUrl(fileName: string): string {
  const name = String(fileName || "").trim()
  return `${bookExpertAvatarPublicBase()}${encodeURIComponent(name)}`
}

interface AvatarManifest {
  files?: string[]
}

/** 从 public/book-expert/avatars/manifest.json 读取可选封面列表 */
export async function loadBookExpertAvatarPresets(): Promise<BookExpertAvatarPreset[]> {
  const manifestUrl = `${bookExpertAvatarPublicBase()}manifest.json`
  try {
    const res = await fetch(manifestUrl, { cache: "no-cache" })
    if (!res.ok) return []
    const data = (await res.json()) as AvatarManifest
    const files = (data.files ?? []).map((f) => String(f).trim()).filter(Boolean)
    return files.map((fileName) => ({
      id: fileName,
      fileName,
      url: bookExpertAvatarPublicUrl(fileName),
    }))
  } catch {
    return []
  }
}

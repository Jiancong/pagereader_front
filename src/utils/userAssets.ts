import type { UserAssetItem, UserAssetsPage } from "@/api/types"

type RawAsset = Record<string, unknown>

function asRecord(value: unknown): RawAsset | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RawAsset) : null
}

export function formatBytes(bytes?: number | null): string {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n < 0) return "—"
  if (n < 1024) return `${Math.round(n)} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function isImageAsset(name: string, url = "", contentType = ""): boolean {
  const ct = contentType.toLowerCase()
  if (ct.startsWith("image/")) return true
  const probe = `${name} ${url}`.toLowerCase()
  return /\.(png|jpe?g|gif|webp|bmp|svg|avif)(\?|$)/i.test(probe)
}

export function isPdfAsset(name: string, url = "", contentType = ""): boolean {
  const ct = contentType.toLowerCase()
  if (ct === "application/pdf") return true
  const probe = `${name} ${url}`.toLowerCase()
  return /\.pdf(\?|$)/i.test(probe)
}

export function isVideoAsset(name: string, url = "", contentType = ""): boolean {
  const ct = contentType.toLowerCase()
  if (ct.startsWith("video/")) return true
  const probe = `${name} ${url}`.toLowerCase()
  return /\.(mp4|webm|mov|m4v|avi|mkv)(\?|$)/i.test(probe)
}

/** 是否为可当作网格缩略图展示的图片地址（含 _cover.png / ppt-cover） */
export function looksLikeImagePreviewUrl(url: string): boolean {
  const u = String(url || "").trim().toLowerCase()
  if (!u) return false
  if (/\.pdf(\?|$)/i.test(u)) return false
  return (
    /_cover\.(png|jpe?g|webp|gif)/i.test(u) ||
    /ppt-cover\.(png|jpe?g|webp)/i.test(u) ||
    /\.(png|jpe?g|gif|webp|bmp|svg|avif)(\?|$)/i.test(u)
  )
}

export function buildAssetThumbUrl(url: string): string {
  if (!url) return url
  if (url.includes("x-oss-process=")) return url
  const sep = url.includes("?") ? "&" : "?"
  return `${url}${sep}x-oss-process=image/resize,m_lfit,w_480,h_480/quality,q_20`
}

export function normalizeUserAssetItem(raw: unknown): UserAssetItem | null {
  const item = asRecord(raw)
  if (!item) return null

  const fileKey = String(item.fileKey ?? item.key ?? item.ossKey ?? "").trim()
  const name = String(
    item.originalName ?? item.fileName ?? item.name ?? item.filename ?? fileKey.split("/").pop() ?? "",
  ).trim()
  const url = String(item.fileUrl ?? item.fileLink ?? item.url ?? item.ossUrl ?? item.link ?? "").trim()
  if (!fileKey && !url) return null

  const previewUrl = String(item.previewUrl ?? "").trim() || undefined
  const thumbnailUrl = String(item.thumbnailUrl ?? item.thumbUrl ?? item.coverUrl ?? "").trim() || undefined

  const sizeRaw = item.fileSize ?? item.size ?? item.bytes
  const size = Number(sizeRaw)
  const contentType = String(item.contentType ?? item.mimeType ?? item.type ?? "").trim() || undefined
  const lastModified = String(item.lastModified ?? item.updateTime ?? item.createTime ?? "").trim() || undefined

  return {
    fileKey: fileKey || url,
    name: name || "file",
    url,
    thumbnailUrl,
    previewUrl,
    size: Number.isFinite(size) && size >= 0 ? size : undefined,
    contentType,
    lastModified,
  }
}

/**
 * 临时缩略图策略（后端未统一 thumbnailUrl 前）：
 * - 图片/视频：优先 previewUrl，其次 thumbnailUrl，图片可回退 fileUrl + OSS resize
 * - PDF：仅当 previewUrl/thumbnailUrl 为 _cover.png 等图片地址时展示；否则 null → 占位图标
 */
export function resolveAssetPreviewUrl(asset: UserAssetItem): string | null {
  const preview = String(asset.previewUrl || "").trim()
  const thumb = String(asset.thumbnailUrl || "").trim()
  const { name, url, contentType } = asset

  const pickImageCandidate = (...candidates: string[]) => {
    for (const c of candidates) {
      if (c && looksLikeImagePreviewUrl(c)) return buildAssetThumbUrl(c)
    }
    return null
  }

  if (isPdfAsset(name, url, contentType)) {
    return pickImageCandidate(thumb, preview)
  }

  if (isVideoAsset(name, url, contentType)) {
    return pickImageCandidate(preview, thumb)
  }

  if (isImageAsset(name, url, contentType)) {
    return pickImageCandidate(preview, thumb) ?? buildAssetThumbUrl(url)
  }

  return pickImageCandidate(preview, thumb)
}

export function normalizeUserAssetsPage(data: unknown): UserAssetsPage {
  if (Array.isArray(data)) {
    const items = data.map(normalizeUserAssetItem).filter(Boolean) as UserAssetItem[]
    return { items, hasMore: false, nextMarker: null }
  }

  const page = asRecord(data)
  if (!page) return { items: [], hasMore: false, nextMarker: null }

  const rawItems = (page.files ??
    page.assets ??
    page.items ??
    page.content ??
    page.list ??
    page.records ??
    []) as unknown[]

  const items = rawItems.map(normalizeUserAssetItem).filter(Boolean) as UserAssetItem[]
  const nextMarker = String(page.nextMarker ?? page.marker ?? page.nextPageToken ?? "").trim() || null
  const hasMore = Boolean(page.hasMore ?? page.hasNext ?? (nextMarker && items.length > 0))

  return { items, nextMarker, hasMore }
}

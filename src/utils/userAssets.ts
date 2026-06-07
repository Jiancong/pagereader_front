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

  const sizeRaw = item.fileSize ?? item.size ?? item.bytes
  const size = Number(sizeRaw)
  const contentType = String(item.contentType ?? item.mimeType ?? item.type ?? "").trim() || undefined
  const lastModified = String(item.lastModified ?? item.updateTime ?? item.createTime ?? "").trim() || undefined

  return {
    fileKey: fileKey || url,
    name: name || "file",
    url,
    size: Number.isFinite(size) && size >= 0 ? size : undefined,
    contentType,
    lastModified,
  }
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

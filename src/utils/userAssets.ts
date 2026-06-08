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

function isAliyunOssUrl(url: string): boolean {
  return /aliyuncs\.com/i.test(url)
}

function splitUrlPathQuery(url: string): { originPath: string; query: string } {
  const idx = url.indexOf("?")
  if (idx < 0) return { originPath: url, query: "" }
  return { originPath: url.slice(0, idx), query: url.slice(idx) }
}

/** 按项目约定从 PDF 地址推断封面图（如 1025043812_xxx.pdf → 1025043812_cover.png） */
export function inferPdfCoverUrls(pdfUrl: string): string[] {
  const raw = String(pdfUrl || "").trim()
  if (!raw) return []

  try {
    const { originPath, query } = splitUrlPathQuery(raw)
    const match = originPath.match(/^(https?:\/\/[^/]+)(\/.*)$/i)
    if (!match) return []

    const origin = match[1]
    const pathname = match[2]
    const slash = pathname.lastIndexOf("/")
    const dir = slash >= 0 ? pathname.slice(0, slash + 1) : "/"
    const filename = decodeURIComponent(slash >= 0 ? pathname.slice(slash + 1) : pathname)
    const candidates: string[] = []

    const tsMatch = filename.match(/^(\d+)_/i)
    if (tsMatch) {
      candidates.push(`${origin}${dir}${tsMatch[1]}_cover.png${query}`)
      candidates.push(`${origin}${dir}${tsMatch[1]}_ppt-cover.png${query}`)
    }

    if (/\.pdf$/i.test(filename)) {
      const stem = filename.replace(/\.pdf$/i, "")
      candidates.push(`${origin}${dir}${stem}_cover.png${query}`)
      if (tsMatch) {
        const rest = stem.replace(/^\d+_/, "")
        if (rest) candidates.push(`${origin}${dir}${tsMatch[1]}_${rest}_cover.png${query}`)
      }
    }

    return [...new Set(candidates)]
  } catch {
    return []
  }
}

/** OSS 文档预览：将 PDF 第 1 页转为 PNG（需 bucket 开通 doc/preview） */
export function buildOssDocPreviewUrl(fileUrl: string): string | null {
  const url = String(fileUrl || "").trim()
  if (!url || !isAliyunOssUrl(url)) return null
  if (/x-oss-process=/i.test(url)) return null
  const sep = url.includes("?") ? "&" : "?"
  return `${url}${sep}x-oss-process=doc/preview,export_1,format_png`
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

function pushUnique(target: string[], value: string | null | undefined) {
  const v = String(value || "").trim()
  if (!v || target.includes(v)) return
  target.push(v)
}

function pushImageCandidates(target: string[], ...candidates: string[]) {
  for (const c of candidates) {
    if (c && looksLikeImagePreviewUrl(c)) pushUnique(target, buildAssetThumbUrl(c))
  }
}

/**
 * 按优先级返回全部可尝试的预览 URL（用于加载失败时依次回退）。
 */
export function resolveAssetPreviewCandidates(asset: UserAssetItem): string[] {
  const preview = String(asset.previewUrl || "").trim()
  const thumb = String(asset.thumbnailUrl || "").trim()
  const { name, url, contentType } = asset
  const results: string[] = []

  if (isPdfAsset(name, url, contentType)) {
    pushImageCandidates(results, thumb, preview)
    for (const inferred of inferPdfCoverUrls(url)) {
      pushUnique(results, buildAssetThumbUrl(inferred))
    }
    pushUnique(results, buildOssDocPreviewUrl(url))
    return results
  }

  if (isVideoAsset(name, url, contentType)) {
    pushImageCandidates(results, preview, thumb)
    return results
  }

  if (isImageAsset(name, url, contentType)) {
    pushImageCandidates(results, preview, thumb)
    pushUnique(results, buildAssetThumbUrl(url))
    return results
  }

  pushImageCandidates(results, preview, thumb)
  return results
}

/**
 * 缩略图策略：
 * - 图片/视频：previewUrl → thumbnailUrl → fileUrl + OSS resize
 * - PDF：显式封面 → 按命名推断 _cover.png → OSS doc/preview 首页图
 */
export function resolveAssetPreviewUrl(asset: UserAssetItem): string | null {
  const candidates = resolveAssetPreviewCandidates(asset)
  return candidates[0] ?? null
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

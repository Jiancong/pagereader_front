// 从 SSE complete / ppt_complete 载荷解析 PptData（含 OSS 拉取）
// @author hc @date 2026-06-04

import { enrichPptDataChapterImages } from "./pptChapterImages"

export type PptStreamCompleteResult = {
  pptData: Record<string, unknown>
  projectId?: string
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function hasSlides(data: Record<string, unknown>): boolean {
  return Array.isArray(data.slides) && data.slides.length > 0
}

function pickArtifactUrl(payload: Record<string, unknown>): string | null {
  const nested = asRecord(payload.pptData) ?? asRecord(payload.ppt_data)
  const candidates = [
    payload.ppt_data_url,
    payload.remote_url,
    payload._artifact_url,
    nested?._artifact_url,
    nested?.remote_url,
  ]
  for (const c of candidates) {
    const s = String(c ?? "").trim()
    if (s) return s
  }
  return null
}

async function fetchPptJson(url: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(url, { credentials: "omit" })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  return asRecord(json)
}

/** 将 complete 顶层元数据合并进 deck（chapter_images 等） */
function finalizePptData(
  deck: Record<string, unknown>,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const enriched = enrichPptDataChapterImages(deck, payload) ?? deck
  if (!enriched.search_cards && Array.isArray(payload.search_cards)) {
    enriched.search_cards = payload.search_cards
  }
  if (!enriched.image_results && Array.isArray(payload.image_results)) {
    enriched.image_results = payload.image_results
  }
  return enriched
}

/**
 * 解析流式 complete 载荷为 PptViewer 可用的 pptData。
 * 支持：内联 slides、嵌套 ppt_data、OSS ppt_data_url / remote_url。
 */
export async function resolvePptDataFromStreamComplete(
  payload: unknown,
): Promise<PptStreamCompleteResult | null> {
  const root = asRecord(payload)
  if (!root) return null

  const projectId =
    root.projectId != null
      ? String(root.projectId)
      : root.project_id != null
        ? String(root.project_id)
        : undefined

  if (hasSlides(root)) {
    return { pptData: finalizePptData(root, root), projectId }
  }

  const nested = asRecord(root.pptData) ?? asRecord(root.ppt_data)
  if (nested) {
    if (hasSlides(nested)) {
      return { pptData: finalizePptData(nested, root), projectId }
    }
    const nestedUrl = pickArtifactUrl({ ppt_data: nested })
    if (nestedUrl) {
      const fetched = await fetchPptJson(nestedUrl)
      if (fetched && hasSlides(fetched)) {
        return { pptData: finalizePptData(fetched, root), projectId }
      }
    }
  }

  const url = pickArtifactUrl(root)
  if (url) {
    const fetched = await fetchPptJson(url)
    if (fetched && hasSlides(fetched)) {
      return { pptData: finalizePptData(fetched, root), projectId }
    }
  }

  return null
}

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

/** 与原版 normalizePptPayloadFromArtifact：slides 可能在根或 ppt_data 内 */
function normalizeDeckFromArtifact(obj: Record<string, unknown>): Record<string, unknown> | null {
  if (hasSlides(obj)) return obj
  const inner = asRecord(obj.ppt_data) ?? asRecord(obj.pptData)
  if (inner && hasSlides(inner)) return inner
  return null
}

function pickArtifactUrl(payload: Record<string, unknown>): string | null {
  const nested = asRecord(payload.pptData) ?? asRecord(payload.ppt_data)
  const artifact = asRecord(payload.ppt_data_artifact)
  const candidates = [
    payload.ppt_data_url,
    payload.remote_url,
    payload._artifact_url,
    artifact?.url,
    nested?._artifact_url,
    nested?.remote_url,
    nested?.ppt_data_url,
  ]
  for (const c of candidates) {
    const s = String(c ?? "").trim()
    if (s) return s
  }
  return null
}

/** OSS 产物为 artifact envelope，真正 ppt_data 在 envelope.payload */
function unwrapArtifactEnvelope(obj: Record<string, unknown>): Record<string, unknown> {
  const payload = asRecord(obj.payload)
  const isEnvelope =
    payload != null &&
    (obj.artifact_kind != null || obj.schema_version != null || obj.sha256 != null)
  return isEnvelope ? (payload as Record<string, unknown>) : obj
}

async function fetchPptJson(url: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(url, { credentials: "omit" })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  const obj = asRecord(json)
  if (!obj) return null
  const unwrapped = unwrapArtifactEnvelope(obj)
  return normalizeDeckFromArtifact(unwrapped)
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
 * 同步解析「已经拿到的 JSON」为可用 deck（不发起网络请求）。
 * 兼容：OSS envelope（含 payload）、根 slides、嵌套 ppt_data.slides。
 * 调试粘贴 / 已缓存数据场景使用。
 */
export function resolveLocalPptDeck(payload: unknown): Record<string, unknown> | null {
  const root = asRecord(payload)
  if (!root) return null
  const unwrapped = unwrapArtifactEnvelope(root)
  const direct = normalizeDeckFromArtifact(unwrapped)
  if (direct) return finalizePptData(direct, root)
  const nested = asRecord(unwrapped.pptData) ?? asRecord(unwrapped.ppt_data)
  if (nested) {
    const inner = asRecord(nested.payload) ? unwrapArtifactEnvelope(nested) : nested
    const deck = normalizeDeckFromArtifact(inner)
    if (deck) return finalizePptData(deck, root)
  }
  return null
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

  const nested = asRecord(root.pptData) ?? asRecord(root.ppt_data)
  const projectId =
    root.projectId != null
      ? String(root.projectId)
      : root.project_id != null
        ? String(root.project_id)
        : nested?.projectId != null
          ? String(nested.projectId)
          : undefined

  const inlineDeck = normalizeDeckFromArtifact(root)
  if (inlineDeck) {
    return { pptData: finalizePptData(inlineDeck, root), projectId }
  }

  if (nested) {
    const nestedDeck = normalizeDeckFromArtifact(nested)
    if (nestedDeck) {
      return { pptData: finalizePptData(nestedDeck, root), projectId }
    }
    const nestedUrl = pickArtifactUrl({ ppt_data: nested, ppt_data_artifact: root.ppt_data_artifact })
    if (nestedUrl) {
      const fetched = await fetchPptJson(nestedUrl)
      if (fetched) {
        return { pptData: finalizePptData(fetched, root), projectId }
      }
    }
  }

  const url = pickArtifactUrl(root)
  if (url) {
    const fetched = await fetchPptJson(url)
    if (fetched) {
      return { pptData: finalizePptData(fetched, root), projectId }
    }
  }

  return null
}

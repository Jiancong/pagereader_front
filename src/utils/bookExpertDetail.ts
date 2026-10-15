// 公开专家详情：兼容 BFF / Python 多种 JSON 信封与 visibility 字段
// @author hc

import type { BookExpertSummary } from "@/api/types"

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

/** 从 GET /book-experts/{id} 响应中提取 expert 对象 */
export function extractExpertFromDetailPayload(parsed: unknown): BookExpertSummary | null {
  const root = asRecord(parsed)
  if (!root) return null

  const direct = asRecord(root.expert)
  if (direct?.expert_id || direct?.expertId) {
    return direct as unknown as BookExpertSummary
  }

  const data = asRecord(root.data)
  if (data) {
    const nested = asRecord(data.expert)
    if (nested?.expert_id || nested?.expertId) {
      return nested as unknown as BookExpertSummary
    }
    // 少数 BFF 把字段平铺在 data 上
    if (data.expert_id || data.expertId) {
      return data as unknown as BookExpertSummary
    }
  }

  if (root.expert_id || root.expertId) {
    return root as unknown as BookExpertSummary
  }

  return null
}

/** 匿名公开页：仅当明确 private 时拒绝；缺省 visibility 视为可展示 */
export function isBookExpertPubliclyViewable(expert: BookExpertSummary | null | undefined): boolean {
  if (!expert) return false
  const v = String(expert.visibility ?? "").trim().toLowerCase()
  if (v === "private") return false
  if (v === "public") return true
  return true
}

import type { FeedStreamItemDto } from "@/api/types"

/** Explore Feed 条目打开方式（见 FRONTEND_INTEGRATION.md §7） */
export type FeedOpenTarget =
  | { kind: "community"; projectId: string }
  | { kind: "project"; projectId: string }
  | { kind: "fork"; prompt: string }

/** 有 projectId 才走 /project/{id}；manifest 数字 id 不得误当 projectId */
export function resolveFeedOpenTarget(item: FeedStreamItemDto): FeedOpenTarget | null {
  const projectId = String(item.projectId ?? "").trim()
  if (projectId && item.sourceType === "USER_PROJECT") {
    return { kind: "community", projectId }
  }
  if (projectId) return { kind: "project", projectId }

  const name = String(item.name || item.nameEn || "").trim()
  if (name) return { kind: "fork", prompt: name }
  return null
}

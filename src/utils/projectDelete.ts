import type { FeedStreamItemDto } from "@/api/types"

/** 探索流中仅本人分享的 USER_PROJECT 可删；官方 manifest 等不可删 */
export function canDeleteFeedItem(
  item: FeedStreamItemDto,
  userId: string | number | null | undefined,
): boolean {
  if (userId == null || userId === "") return false
  if (item.sourceType !== "USER_PROJECT") return false
  const projectId = String(item.projectId ?? "").trim()
  if (!projectId) return false
  if (item.isOwner === true) return true
  if (item.ownerUserId != null && String(item.ownerUserId) === String(userId)) return true
  return false
}

export function feedItemDeleteProjectId(item: FeedStreamItemDto): string | null {
  const id = String(item.projectId ?? "").trim()
  return id || null
}

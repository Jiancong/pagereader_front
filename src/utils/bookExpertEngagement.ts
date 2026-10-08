import { bookExpertApi } from "@/api"
import type { BookExpertSummary } from "@/api/types"

/** 打开/进入专家次数（广场卡片、公开页、工作区会话） */
export function bookExpertOpenCount(expert: BookExpertSummary | null | undefined): number {
  if (!expert) return 0
  const raw =
    expert.open_count ??
    expert.openCount ??
    expert.view_count ??
    expert.viewCount ??
    0
  const n = Number(raw)
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
}

export function bookExpertLikeCount(expert: BookExpertSummary | null | undefined): number {
  if (!expert) return 0
  const raw =
    expert.like_count ??
    expert.likeCount ??
    expert.favorite_count ??
    expert.favoriteCount ??
    0
  const n = Number(raw)
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
}

export function bookExpertLikedByMe(expert: BookExpertSummary | null | undefined): boolean {
  if (!expert) return false
  return Boolean(expert.liked_by_me ?? expert.likedByMe)
}

export function applyBookExpertLikeResult(
  expert: BookExpertSummary,
  res: { likeCount?: number; favoriteCount?: number; likedByMe?: boolean },
): void {
  const count = res.likeCount ?? res.favoriteCount
  if (count != null) {
    expert.like_count = count
    expert.likeCount = count
    expert.favorite_count = count
    expert.favoriteCount = count
  }
  if (res.likedByMe != null) {
    expert.liked_by_me = res.likedByMe
    expert.likedByMe = res.likedByMe
  }
}

export function applyBookExpertOpenCount(expert: BookExpertSummary, openCount: number): void {
  const n = Math.max(0, Math.floor(Number(openCount) || 0))
  expert.open_count = n
  expert.openCount = n
  expert.view_count = n
  expert.viewCount = n
}

/** 进入专家时上报打开数；404/501 静默 */
export function recordBookExpertOpen(
  expert: BookExpertSummary | null | undefined,
  userId?: string | null,
): void {
  const id = expert?.expert_id
  if (!id || !expert) return
  void bookExpertApi
    .incrementExpertOpen(id, userId ?? undefined)
    .then((n) => {
      if (n >= 0) applyBookExpertOpenCount(expert, n)
    })
    .catch(() => {})
}

// 读书 / 探索 Feed 模块
// @author hc @date 2026-06-03

import { get, postJson } from "./client"
import type {
  FeedStreamRequest,
  FeedStreamPageDto,
  FeedStreamItemDto,
  FeedFavoriteAction,
  FeedFavoriteResponseDto,
  FeedManifestItemDto,
  Page,
  ProjectVo,
  ConversationHistoryVo,
  ProjectPromptHistoryVo,
} from "./types"

// Feed 流分页（匿名可访问，登录后返回 likedByMe）
export async function getFeedStream(req: FeedStreamRequest): Promise<FeedStreamPageDto> {
  return postJson<FeedStreamPageDto>("/www/model/feed/stream", req)
}

// Feed 单条详情
export async function getFeedItem(id: string): Promise<FeedStreamItemDto> {
  return get<FeedStreamItemDto>(`/www/model/feed/item/${encodeURIComponent(id)}`)
}

// 点赞 / 取消赞（需登录）
export async function favoriteFeedItem(
  id: string,
  action: FeedFavoriteAction,
): Promise<FeedFavoriteResponseDto> {
  return postJson<FeedFavoriteResponseDto>(
    `/www/model/feed/item/${encodeURIComponent(id)}/favorite`,
    { action },
  )
}

// Manifest 按标签分页查询
export async function getManifestByTags(
  page: number,
  size: number,
  tagIds: number[],
  matchAll = false,
): Promise<Page<FeedManifestItemDto>> {
  return get<Page<FeedManifestItemDto>>(
    `/feed/manifest/items/page/${page}/size/${size}`,
    { query: { tagIds, matchAll } },
  )
}

// ===== 项目分享 =====
export async function getProject(id: string): Promise<ProjectVo> {
  return get<ProjectVo>(`/project/${encodeURIComponent(id)}`)
}

export async function getProjectConversationHistory(
  id: string,
): Promise<ConversationHistoryVo[]> {
  return get<ConversationHistoryVo[]>(
    `/project/${encodeURIComponent(id)}/conversation/history`,
  )
}

// 需登录且为 owner
export async function getProjectPromptHistory(
  id: string,
): Promise<ProjectPromptHistoryVo[]> {
  return get<ProjectPromptHistoryVo[]>(
    `/project/${encodeURIComponent(id)}/prompt/history`,
  )
}

// 浏览 +1，返回最新 viewCount
export async function incrementProjectView(id: string): Promise<number> {
  return postJson<number>(`/project/${encodeURIComponent(id)}/view/increment`)
}

// 我的项目列表（需登录）；page 为 0 基，按 updateTime 倒序
export async function getMyProjects(
  page = 0,
  size = 30,
): Promise<Page<ProjectVo>> {
  return get<Page<ProjectVo>>(`/project/user/list`, { query: { page, size } })
}

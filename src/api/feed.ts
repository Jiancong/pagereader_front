// 读书 / 探索 Feed 模块
// @author hc @date 2026-06-03

import { ApiError, del, get, postForm, postJson, put } from "./client"
import type {
  FeedStreamRequest,
  FeedStreamPageDto,
  FeedStreamItemDto,
  FeedTopicCategoryDto,
  FeedFavoriteAction,
  FeedFavoriteResponseDto,
  FeedManifestItemDto,
  Page,
  ProjectVo,
  ConversationHistoryVo,
  ProjectConversationHistoryBundleVo,
  ProjectCoverUploadResult,
  ProjectPromptHistoryVo,
  ShareToCommunityResult,
  UpdateProjectCategoryResult,
  ProjectCommentVo,
  CommentRating,
  RatingFilter,
  CreateProjectCommentDto,
  CommentLikeAction,
  CommentLikeResultVo,
  ReportReadingProgressDto,
  ProjectReadingStatsVo,
  ProjectCommunityStatsVo,
  ProjectRelatedResult,
} from "./types"

// Feed 流分页（匿名可访问，登录后返回 likedByMe）
export const DEFAULT_FEED_STREAM_PAGE_SIZE = 24

/** 与 workspace ExploreGrid 一致的 feed/stream 查询参数 */
export function buildFeedStreamRequest(
  page: number,
  pageSize = DEFAULT_FEED_STREAM_PAGE_SIZE,
  opts?: { categoryId?: string },
): FeedStreamRequest {
  const req: FeedStreamRequest = {
    page,
    pageSize,
    sort: 1,
    includeUserProjects: true,
  }
  if (opts?.categoryId) req.categoryId = opts.categoryId
  return req
}

export async function getFeedStream(req: FeedStreamRequest): Promise<FeedStreamPageDto> {
  return postJson<FeedStreamPageDto>("/www/model/feed/stream", req)
}

/** 探索主题分类列表（匿名可访问；失败时前端 fallback 内置分类） */
export async function getFeedTopicCategories(): Promise<FeedTopicCategoryDto[]> {
  return get<FeedTopicCategoryDto[]>("/www/model/feed/categories")
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

export function normalizeProjectConversationHistory(
  data: ConversationHistoryVo[] | ProjectConversationHistoryBundleVo | unknown,
): ConversationHistoryVo[] {
  if (Array.isArray(data)) return data.map(normalizeConversationHistoryRow)
  if (data && typeof data === "object") {
    const bundle = data as ProjectConversationHistoryBundleVo
    if (Array.isArray(bundle.messages)) {
      return bundle.messages.map(normalizeConversationHistoryRow)
    }
  }
  return []
}

/** 后端 history 的 metadata 常为 JSON 字符串，统一解析为对象 */
export function normalizeConversationHistoryRow(
  row: ConversationHistoryVo,
): ConversationHistoryVo {
  const metadata = row.metadata
  if (typeof metadata !== "string") return row
  try {
    return { ...row, metadata: JSON.parse(metadata) as unknown }
  } catch {
    return row
  }
}

function serializeConversationMessageForApi(
  projectId: string,
  message: Omit<ConversationHistoryVo, "id" | "projectId">,
): Record<string, unknown> {
  const metadata = message.metadata
  return {
    projectId,
    sessionId: projectId,
    role: message.role,
    content: message.content,
    imageUrls: message.imageUrls,
    markdown: message.markdown,
    markdow: message.markdown,
    metadata:
      metadata == null
        ? undefined
        : typeof metadata === "string"
          ? metadata
          : JSON.stringify(metadata),
  }
}

export async function getProjectConversationHistory(
  id: string,
): Promise<ConversationHistoryVo[]> {
  const data = await get<ConversationHistoryVo[] | ProjectConversationHistoryBundleVo>(
    `/project/${encodeURIComponent(id)}/conversation/history`,
  )
  return normalizeProjectConversationHistory(data)
}

const CONVERSATION_APPEND_PATHS = [
  (projectId: string) => `/project/${encodeURIComponent(projectId)}/conversation/history`,
  (projectId: string) => `/project/${encodeURIComponent(projectId)}/conversation/history/append`,
  (projectId: string) => `/project/${encodeURIComponent(projectId)}/conversation/messages`,
] as const

/** 追加一条对话记录（novel_complete 等产物落库；依次尝试后端可能的路径） */
export async function appendProjectConversationMessage(
  projectId: string,
  message: Omit<ConversationHistoryVo, "id" | "projectId">,
): Promise<void> {
  const body = serializeConversationMessageForApi(projectId, message)
  let lastError: unknown

  for (const buildPath of CONVERSATION_APPEND_PATHS) {
    try {
      await postJson<unknown>(buildPath(projectId), body)
      return
    } catch (error) {
      lastError = error
      const code = error instanceof ApiError ? error.code : 0
      if (code !== 404 && code !== 405) throw error
    }
  }

  throw lastError instanceof Error ? lastError : new Error("conversation append failed")
}

/** 上传项目封面（需登录且为 owner） */
export async function uploadProjectCover(
  projectId: string,
  file: File,
): Promise<ProjectCoverUploadResult> {
  const form = new FormData()
  form.append("file", file)
  return postForm<ProjectCoverUploadResult>(
    `/project/${encodeURIComponent(projectId)}/cover`,
    form,
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

// 删除项目（需登录且为 owner）；已分享项目同时从探索流移除
export async function deleteProject(id: string): Promise<void> {
  await del<unknown>(`/project/${encodeURIComponent(id)}`)
}

// 分享到社区（需登录且为 owner）
export async function shareToCommunity(
  id: string,
  body: Record<string, unknown> = {},
): Promise<ShareToCommunityResult> {
  return postJson<ShareToCommunityResult>(
    `/project/${encodeURIComponent(id)}/share-to-community`,
    body,
  )
}

// 更新探索主题分类（需登录且为 owner；已分享至社区时同步 Feed 索引）
export async function updateProjectCategory(
  id: string,
  categoryId: string,
): Promise<UpdateProjectCategoryResult> {
  return put<UpdateProjectCategoryResult>(
    `/project/${encodeURIComponent(id)}/category`,
    { categoryId },
  )
}

// Fork 社区/本人项目到自己的 workspace（克隆 PPT + 历史，默认私有）；需登录
export async function forkProject(
  id: string,
  body: { name?: string; extraConversations?: unknown[] } = {},
): Promise<ProjectVo> {
  return postJson<ProjectVo>(`/project/${encodeURIComponent(id)}/fork`, body)
}

// 留言列表（树形结构）；rating 留空或 ALL 走原行为（向后兼容）
export async function listComments(
  id: string,
  rating: RatingFilter = "ALL",
): Promise<ProjectCommentVo[]> {
  const query = rating && rating !== "ALL" ? { rating } : undefined
  return get<ProjectCommentVo[]>(`/project/${encodeURIComponent(id)}/comments`, { query })
}

// 发表/回复留言（需登录）；根评论需传 rating，回复不传
export async function postComment(
  id: string,
  content: string,
  parentId?: number | null,
  rating?: CommentRating | null,
): Promise<ProjectCommentVo> {
  const body: CreateProjectCommentDto = {
    content,
    parentId: parentId ?? null,
    rating: rating ?? null,
  }
  return postJson<ProjectCommentVo>(`/project/${encodeURIComponent(id)}/comments`, body)
}

// 评论点赞 / 取消点赞（幂等）
export async function toggleCommentLike(
  id: string,
  commentId: number,
  action: CommentLikeAction,
): Promise<CommentLikeResultVo> {
  return postJson<CommentLikeResultVo>(
    `/project/${encodeURIComponent(id)}/comments/${encodeURIComponent(commentId)}/like`,
    { action },
  )
}

// 上报阅读进度（需登录或匿名带 deviceId）
export async function reportReadingProgress(
  id: string,
  payload: ReportReadingProgressDto,
): Promise<ProjectReadingStatsVo> {
  return postJson<ProjectReadingStatsVo>(
    `/project/${encodeURIComponent(id)}/reading/progress`,
    payload,
  )
}

// 阅读统计（readerCount / finishedCount / viewCount / likeCount + myReading*）
export async function getReadingStats(id: string): Promise<ProjectReadingStatsVo> {
  return get<ProjectReadingStatsVo>(`/project/${encodeURIComponent(id)}/reading/stats`)
}

// 社区页聚合接口：一次拿齐 reading + book + recommend
export async function getCommunityStats(
  id: string,
): Promise<ProjectCommunityStatsVo> {
  return get<ProjectCommunityStatsVo>(
    `/project/${encodeURIComponent(id)}/community-stats`,
  )
}

// 关联推荐：同分类 + 高关联推荐（无同书/同作者/同分类时不返回 RECOMMENDED section）
export async function getRelatedProjects(
  id: string,
  limit = 8,
): Promise<ProjectRelatedResult> {
  return get<ProjectRelatedResult>(
    `/project/${encodeURIComponent(id)}/related`,
    { query: { limit } },
  )
}

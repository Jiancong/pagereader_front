// PageReader 接口类型定义
// @author hc @date 2026-06-03

// 统一响应结构
export interface R<T> {
  code: number
  message: string
  data: T
}

// Spring Data 分页结构
export interface Page<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
  first: boolean
  last: boolean
}

// ===== 认证 / 用户 =====
export interface PasswordLoginReq {
  username: string
  password: string
}

export interface EmailLoginReq {
  email: string
  emailCode: string
}

export interface GoogleLoginReq {
  googleEmail: string
}

export interface UserSignUpDto {
  email: string
  password: string
  nickName?: string
  code?: string
  referralCode?: string
  ref?: string
  shareProjectId?: string
  sourceProjectId?: string
}

export interface ChangePwdReq {
  oldPwd: string
  newPwd: string
}

export interface ChangeEmailReq {
  email: string
  emailCode: string
}

// 图形验证码
export interface VerifyVO {
  uuid: string
  img: string
}

export interface UserDetail {
  id?: string | number
  email?: string
  nickName?: string
  avatar?: string
  [key: string]: unknown
}

// 邮箱验证码类型
export type EmailCodeType = "register" | "resetPwd"

// ===== Feed =====
export interface FeedStreamRequest {
  page?: number
  pageSize?: number
  categoryId?: string
  tagIds?: number[]
  models?: number[]
  sort?: number
  isTemplate?: string
  includeUserProjects?: boolean
}

export interface FeedStreamItemDto {
  id: string
  sourceType?: string
  projectId?: string
  name?: string
  nameEn?: string
  imageUrl?: string
  imageUrls?: string[]
  images?: unknown[]
  tagsV2?: unknown[]
  authorNickname?: string
  favoriteCount?: number
  viewCount?: number
  categoryId?: string
  createdAt?: string
  updatedAt?: string
  likedByMe?: boolean
  [key: string]: unknown
}

export interface FeedStreamPageDto {
  page: number
  total: number
  pageSize: number
  data: FeedStreamItemDto[]
}

export type FeedFavoriteAction = "click" | "unclick"

export interface FeedFavoriteActionRequest {
  action: FeedFavoriteAction
}

export interface FeedFavoriteResponseDto {
  id: string
  favoriteCount: number
  likedByMe: boolean
}

export interface FeedManifestItemDto {
  id: string | number
  [key: string]: unknown
}

// ===== 项目分享 =====
export interface ProjectVo {
  id: string
  name?: string
  title?: string
  description?: string
  tags?: string[]
  lifecycleStatus?: string
  thumbnailUrl?: string
  categoryId?: string
  isPrivate?: boolean
  viewCount?: number
  likeCount?: number
  shareCount?: number
  createTime?: string
  updateTime?: string
  [key: string]: unknown
}

export interface ConversationHistoryVo {
  id: string
  projectId: string
  sessionId?: string
  role: "user" | "assistant"
  content: string
  imageUrls?: string[]
  sequenceNumber?: number
  createTime?: string
  metadata?: unknown
}

export interface ProjectPromptHistoryVo {
  promptText: string
  copyText: string
  source: "AGENT" | "GOOGLE_IMAGE"
  createTime?: string
}

// ===== 文件 =====
export interface UserStorageQuota {
  used?: number
  total?: number
  [key: string]: unknown
}

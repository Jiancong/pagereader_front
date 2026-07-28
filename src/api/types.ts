// PageReader 接口类型定义
// @author hc @date 2026-06-03

// 统一响应结构
export interface R<T> {
  code: number
  message?: string
  msg?: string
  success?: boolean
  data: T
}

/** 积分不足（chat-stream / 计费） */
export const CREDITS_INSUFFICIENT = "CREDITS_INSUFFICIENT"

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
  /** USER_PROJECT 时标识作者，供前端判断是否可删除 */
  ownerUserId?: number | string
  /** 登录用户对当前 feed 项是否为 owner（后端可选返回） */
  isOwner?: boolean
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
  /** complete 后 PPT deck JSON 的 OSS 地址 */
  configFilePath?: string | null
  categoryId?: string
  sourceBookTitle?: string | null
  sourceBookAuthor?: string | null
  /** true = 已公开且推荐到社区 */
  sharedToCommunity?: boolean
  isPrivate?: boolean | number
  isRecommended?: boolean | number
  viewCount?: number
  likeCount?: number
  shareCount?: number
  createTime?: string
  updateTime?: string
  // ===== P1 书籍元数据（V22） =====
  wordCount?: number | null
  sourceBookPublishDate?: string | null
  copyrightHolder?: string | null
  copyrightType?: CopyrightType | null
  slideCount?: number | null
  contentLanguage?: string | null
  [key: string]: unknown
}

// ===== 社区 P0/P1/P2 枚举 =====
export type CopyrightType = "PUBLISHER" | "AUTHOR" | "COMMUNITY"
export type CommentRating = "RECOMMEND" | "AVERAGE" | "POOR"
export type RatingFilter = "ALL" | CommentRating
export type ReadingStatus = "NONE" | "READING" | "FINISHED"
export type CommentLikeAction = "click" | "unclick"

export interface ShareToCommunityResult {
  projectId: string
  isPrivate: number
  isRecommended: number
  sourceBookTitle?: string
  sourceBookAuthor?: string
  thumbnailUrl?: string
  categoryId?: string
  visibleInFeed?: boolean
}

export interface ProjectCommentVo {
  id: number
  projectId: string
  userId: number
  userNickname?: string
  userAvatarUrl?: string
  parentId?: number | null
  rootId?: number | null
  content: string
  createTime: string
  // ===== P0 评论评分 / 点赞（V23/V24） =====
  rating?: CommentRating | null
  likeCount?: number
  likedByMe?: boolean
  replies: ProjectCommentVo[]
}

/** POST /project/{id}/comments/{commentId}/like 返回 */
export interface CommentLikeResultVo {
  commentId: number
  likeCount: number
  likedByMe: boolean
}

/** POST /project/{id}/comments body（支持 rating） */
export interface CreateProjectCommentDto {
  content: string
  parentId?: number | null
  rating?: CommentRating | null
}

/** POST /project/{id}/comments/{commentId}/like body */
export interface CommentLikeActionDto {
  action: CommentLikeAction
}

/** POST /project/{id}/reading/progress body */
export interface ReportReadingProgressDto {
  progressPercent: number
  status?: ReadingStatus
  addMinutes?: number
  deviceId?: string
}

/** GET /project/{id}/reading/stats 返回 */
export interface ProjectReadingStatsVo {
  projectId: string
  readerCount: number
  finishedCount: number
  viewCount: number
  likeCount: number
  myReadingStatus: ReadingStatus
  myReadingMinutes: number
  myProgressPercent?: number | null
  myFirstReadTime?: string | null
  myFinishedAt?: string | null
}

/** GET /project/{id}/community-stats → recommend 块 */
export interface ProjectRecommendStatsVo {
  projectId: string
  recommendScore: number | null
  recommendCount: number
  averageCount: number
  poorCount: number
  recommendPercent: number
  averagePercent: number
  poorPercent: number
  totalReviewCount: number
}

/** GET /project/{id}/community-stats → book 块 */
export interface ProjectBookMetaVo {
  projectId: string
  wordCount?: number | null
  sourceBookPublishDate?: string | null
  copyrightHolder?: string | null
  copyrightType?: CopyrightType | null
  slideCount?: number | null
  sourceBookTitle?: string | null
  sourceBookAuthor?: string | null
  contentLanguage?: string | null
}

/** GET /project/{id}/community-stats 聚合响应 */
export interface ProjectCommunityStatsVo {
  projectId: string
  reading: ProjectReadingStatsVo
  book: ProjectBookMetaVo
  recommend: ProjectRecommendStatsVo
}

/** GET /project/{id}/related → 单个推荐分组 */
export interface ProjectRelatedSection {
  /** 分组标识：SAME_CATEGORY / RECOMMENDED（后端可扩展） */
  key: string
  /** 分组展示标题（后端可返回，前端也保留 i18n 兜底） */
  title?: string
  /** 该组推荐项（结构复用 FeedStreamItemDto） */
  items: FeedStreamItemDto[]
}

/** GET /project/{id}/related 聚合响应 */
export interface ProjectRelatedResult {
  projectId: string
  sections: ProjectRelatedSection[]
}

export interface ConversationHistoryVo {
  id: string | number
  projectId: string
  sessionId?: string
  role: "user" | "assistant"
  content: string
  markdow?: string
  markdown?: string
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

/** conversation/history 新结构：消息列表在 messages 内 */
export interface ProjectConversationHistoryBundleVo {
  projectId?: string
  sessionId?: string
  thumbnailUrl?: string
  coverImageUrl?: string
  messages?: ConversationHistoryVo[]
}

export interface ProjectCoverUploadResult {
  projectId: string
  sessionId?: string
  thumbnailUrl?: string
  coverImageUrl?: string
}

// ===== 文件 =====
export interface UserStorageQuota {
  planType?: string
  usedBytes?: number
  usedFormatted?: string
  limitBytes?: number
  limitGb?: number
  limitFormatted?: string
  remainingBytes?: number
  remainingFormatted?: string
  exceeded?: boolean
  wouldExceed?: boolean
  usagePercentage?: number
  totalCount?: number
  used?: number
  total?: number
  [key: string]: unknown
}

export type UserPrivateAssetType = "ALL" | "IMAGE" | "VIDEO"
export type UserPrivateAssetSort = "NEWEST" | "OLDEST" | "SIZE_DESC" | "SIZE_ASC"

export interface UserImage {
  id: number | string
  fileLink: string
  originalName?: string
  createTime?: string
  projectId?: string
  taskId?: string | number
  taskName?: string
  [key: string]: unknown
}

export interface UserAssetItem {
  fileKey: string
  name: string
  url: string
  /** 后端 thumbnailUrl / thumbUrl / coverUrl */
  thumbnailUrl?: string
  /** 临时：列表项 previewUrl，图片/视频可作缩略图；PDF 需为 _cover.png 才展示 */
  previewUrl?: string
  size?: number
  contentType?: string
  lastModified?: string
}

export interface UserAssetsPage {
  items: UserAssetItem[]
  nextMarker?: string | null
  hasMore: boolean
}

export interface UserFilesStats {
  totalCount?: number
  totalBytes?: number
  totalSizeFormatted?: string
  [key: string]: unknown
}

// OSS 直传：申请上传凭证
export interface DirectUploadTokenReq {
  originalName: string
  contentType: string
  fileSize: number
}

export interface DirectUploadTokenVo {
  uploadUrl: string
  uploadHeaders?: Record<string, string>
  fileUrl?: string
  fileKey: string
  [key: string]: unknown
}

// OSS 直传：上传完成回执
export interface DirectUploadCompleteReq {
  fileKey: string
  originalName: string
  contentType: string
  fileSize: number
}

export interface DirectUploadCompleteVo {
  fileLink?: string
  [key: string]: unknown
}

// 传给 Agent 的已上传文档
export interface UploadedDocument {
  url: string
  name: string
  type: string
}

// ===== Agent 对话流 =====
export type PptQueue = "CARD" | "DOCUMENT" | "NOVEL" | "OUTLINE"

export type GenerationMode = "card" | "document" | "markdown" | "novel" | "outline"

export interface ChatStreamReq {
  message: string
  userId: string
  projectId?: string
  sessionId?: string
  isAgent?: boolean
  uploaded_documents?: UploadedDocument[]
  /** 显式项目标题；上传 PDF 时建议传去后缀书名 */
  projectName?: string
  /** CARD 60 credits/run (daily free first); DOCUMENT/NOVEL/OUTLINE 30 credits/run (package only) */
  queue?: PptQueue
  /** 后端 generation mode：novel / document / card / markdown（与 queue 二选一或同时传） */
  mode?: string
  generationMode?: string
  generation_mode?: string
  outputMode?: string
  output_mode?: string
  /** 一句话生成：是否启用联网搜索；上传文档时不传 */
  enable_search?: boolean
  stream_request_id?: string
  streamRequestId?: string
  locale?: string
}

/** BFF YouTube PPT：/api2/agent/ppt/youtube-stream | youtube-transcript */
export interface YoutubePptStreamReq {
  youtube_url: string
  project_id: string
  message?: string
  /** DOCUMENT / CARD / NOVEL / OUTLINE（后端不再接受 FAST/SLOW） */
  queue?: PptQueue
  stream_request_id?: string
  locale?: string
  languages?: string[]
}

export interface YoutubeTranscriptReq {
  youtube_url: string
  project_id: string
  languages?: string[]
  locale?: string
}

export interface YoutubeTranscriptResult {
  success: boolean
  video_id?: string
  title?: string
  language?: string
  char_count?: number
  section_count?: number
  content_hash?: string
  script_preview?: string
  error?: string
}

export interface ChatStreamCancelReq {
  project_id: string
  stream_request_id: string
}

// ===== Pricing / subscription =====
export interface PricingPlanMonthly {
  /** PayPal 等：美元月费 */
  recurringMonth?: number
  /** 微信扫码：港币月费（元） */
  recurringMonthHkd?: number
}

export interface PricingPlanCredits {
  monthlyFastCredits?: number
  dailyFreeCredits?: number
  maxConcurrentTasks?: number
  maxRollover?: number
  description?: string
}

export interface PricingPlanStorage {
  limitMb?: number
  description?: string
}

export interface PricingPlan {
  planType: string
  planName?: string
  displayName: string
  tagline?: string | null
  recommended?: boolean
  visible?: boolean
  monthly?: PricingPlanMonthly
  credits?: PricingPlanCredits
  storage?: PricingPlanStorage
  highlights?: string[]
  paypalPlanIds?: string[]
  paypalProductId?: string
}

export interface PricingBillingMeta {
  model?: string
  autoRenew?: boolean
  description?: string
}

export interface PricingConfig {
  plans?: PricingPlan[]
  wechatBilling?: PricingBillingMeta
  paypalBilling?: PricingBillingMeta
  oneTimePasses?: unknown[]
}

export interface CreateUserSubscriptionReq {
  userId: number | string
  planId: string
  subscriptionId: string
  orderId?: string
}

export interface SubscribeMyStatusCredits {
  monthlyFastCredits?: number
  dailyFreeCredits?: number
  currentPlanCredits?: number
  currentDailyCredits?: number
  totalCredits?: number
  creditsExpireAt?: string | null
}

export interface SubscribeMyStatusPlanInfo {
  planId?: string | null
  planType?: string
  planName?: string
  billingCycle?: string
  productId?: string | null
}

/** GET /subscribe/my/status 原始 data 结构 */
export interface SubscribeMyStatusRaw {
  hasActiveSubscription?: boolean
  subscriptionStatus?: string
  subscriptionType?: string
  planInfo?: SubscribeMyStatusPlanInfo
  credits?: SubscribeMyStatusCredits
  limits?: Record<string, unknown>
  billing?: Record<string, unknown> | null
  subscription?: Record<string, unknown> | null
}

/** GET /credits/account 原始 data 结构。
 *  后端真相：totalCredits = dailyFreeCredits + planCredits（仅两列）。
 *  - dailyFreeCredits：每日免费积分剩余（UTC 0 点重置，不累积）
 *  - planCredits：套餐/付费积分剩余（订阅、加购 pass、退款回滚全部合并写入）
 *  - monthlyFastCredits：套餐每月发放额度（仅展示用，不是剩余！）
 */
export interface CreditsAccountRaw {
  /** 每日免费剩余（后端主字段，/credits/account 返回） */
  dailyFreeCredits?: number
  /** 每日免费剩余（/subscribe/my/status 历史别名） */
  dailyFreeCreditsRemaining?: number
  /** 每日免费剩余（/subscribe/my/status 别名；与下面额度字段同名但语义不同） */
  currentDailyCredits?: number
  /** 套餐剩余（/credits/account 主字段，后端真相） */
  planCredits?: number
  /** 套餐剩余（/subscribe/my/status 历史别名，等价于 planCredits） */
  currentPlanCredits?: number
  /** 套餐每月发放额度（不是剩余！仅展示参考） */
  monthlyFastCredits?: number
  /** 历史别名，等价 planCredits；保留兼容 */
  packageCredits?: number
  packageCreditsRemaining?: number
  /** 合计 = dailyFreeCredits + planCredits */
  totalCredits?: number
  credits?: SubscribeMyStatusCredits
}

/** 供 UI 使用的扁平化积分账户（余额字段与 SubscribeMyStatus 对齐） */
export type CreditsAccount = Pick<
  SubscribeMyStatus,
  | "dailyFreeCredits"
  | "dailyFreeCreditsRemaining"
  | "packageCredits"
  | "monthlyCredits"
  | "monthlyCreditsRemaining"
  | "packageCreditsRemaining"
  | "planCredits"
  | "totalCredits"
>

/** 供 UI 使用的扁平化订阅/积分状态 */
export interface SubscribeMyStatus {
  planType?: string
  displayName?: string
  /** 外层订阅状态：NONE=免费用户 / 视到期=微信 / ACTIVE 等=PayPal */
  subscriptionStatus?: string
  /** PayPal 订阅实时状态：null=免费或微信用户；ACTIVE / CANCELLED / SUSPENDED / EXPIRED=PayPal */
  paypalStatus?: string
  /** PayPal plan_id，取消订阅时使用 */
  paypalPlanId?: string
  planId?: string
  subscriptionActive?: boolean
  canCancel?: boolean
  dailyFreeCredits?: number
  dailyFreeCreditsRemaining?: number
  /** 每日免费剩余（/subscribe/my/status 历史字段，normalize 后已并入 dailyFreeCreditsRemaining） */
  currentDailyCredits?: number
  packageCredits?: number
  monthlyCredits?: number
  monthlyCreditsRemaining?: number
  /** 套餐剩余（后端唯一真相字段） */
  planCredits?: number
  /** 套餐剩余（/subscribe/my/status 别名，normalize 后已并入 planCredits） */
  currentPlanCredits?: number
  totalCredits?: number
  [key: string]: unknown
}

// ===== Novel 划线 / 想法 =====
/** 单条划线 + 想法记录 */
export interface ProjectAnnotation {
  id: string
  projectId?: string
  userId?: string
  /** 社区展示：用户昵称 / 头像（公开列表接口返回） */
  userNickname?: string
  userAvatarUrl?: string
  /** 章节 id，对应 buildNovelGuideOutline 生成的 section.id */
  sectionId: string
  /** 章节标题（公开列表接口可选返回，便于社区页展示） */
  sectionLabel?: string
  /** 选区在章节纯文本中的起始字符偏移 */
  startOffset: number
  /** 选区结束偏移（不含） */
  endOffset: number
  /** 划线原文，用于校验与重排后的容错匹配 */
  selectedText: string
  /** 想法内容，可空（仅划线无想法） */
  note?: string
  /** 高亮色（预留） */
  color?: string
  createTime?: string
  updateTime?: string
}

export type CreateProjectAnnotation = Pick<
  ProjectAnnotation,
  "sectionId" | "startOffset" | "endOffset" | "selectedText" | "note" | "color"
>

/** 仅允许编辑 note / color；offset 不允许变更 */
export type UpdateProjectAnnotation = Partial<
  Pick<ProjectAnnotation, "note" | "color">
>

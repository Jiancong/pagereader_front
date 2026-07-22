import type {
  CopyrightType,
  ProjectCommunityStatsVo,
  ProjectBookMetaVo,
  ProjectReadingStatsVo,
  ProjectRecommendStatsVo,
  ProjectVo,
} from "@/api/types"
import type { BookSeoContent } from "@/utils/bookSeo"

interface DeckSlideLike {
  title?: string
  subtitle?: string
  content?: string[]
  left_title?: string
  left_content?: string[]
  right_title?: string
  right_content?: string[]
  key_insight?: string
  quote?: string
}

interface DeckLike {
  subtitle?: string
  slides?: DeckSlideLike[]
}

/** 中文数量缩写：316000 → 31.6万 */
export function formatCompactCount(n: number): string {
  const v = Math.max(0, Math.floor(n))
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1).replace(/\.0$/, "")}亿`
  if (v >= 10_000) return `${(v / 10_000).toFixed(1).replace(/\.0$/, "")}万`
  return String(v)
}

/** 字数：按字符计，≥1 万显示为「X.X 万字」 */
export function formatWordCount(chars: number): string {
  const v = Math.max(0, Math.floor(chars))
  if (v >= 10_000) return `${(v / 10_000).toFixed(1).replace(/\.0$/, "")}万字`
  return `${v}字`
}

/** 从 deck 文本估算字数（中文按字、英文按词）——仅在后端未提供 wordCount 时兜底 */
export function estimateDeckWordCount(deck: DeckLike | null | undefined): number {
  const chunks: string[] = []
  if (deck?.subtitle) chunks.push(deck.subtitle)
  for (const slide of deck?.slides ?? []) {
    chunks.push(
      slide.title ?? "",
      slide.subtitle ?? "",
      slide.left_title ?? "",
      slide.right_title ?? "",
      slide.key_insight ?? "",
      slide.quote ?? "",
      ...(slide.content ?? []),
      ...(slide.left_content ?? []),
      ...(slide.right_content ?? []),
    )
  }
  const text = chunks.join(" ").trim()
  if (!text) return 0
  const cjk = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) ?? []).length
  const latin = text
    .replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, " ")
    .split(/\s+/)
    .filter((w) => /[a-zA-Z]/.test(w)).length
  return cjk + latin
}

export function formatPublishDate(iso: string | null | undefined): string {
  if (!iso) return ""
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ""
    return `${d.getFullYear()}年${d.getMonth() + 1}月`
  } catch {
    return ""
  }
}

export interface RecommendDistribution {
  score: number | null
  badgeKey: "rave" | "worth" | "mixed" | "pending"
  recommendPct: number
  averagePct: number
  poorPct: number
}

/** 推荐值 badge：依赖后端 recommendScore */
export function recommendBadgeKey(
  score: number | null,
): RecommendDistribution["badgeKey"] {
  if (score == null) return "pending"
  if (score >= 85) return "rave"
  if (score >= 72) return "worth"
  return "mixed"
}

/** 由后端 ProjectRecommendStatsVo 渲染分布；totalReviewCount=0 显示 pending */
export function buildRecommendDistribution(
  rec: ProjectRecommendStatsVo,
): RecommendDistribution {
  const score = rec.recommendScore
  return {
    score,
    badgeKey: recommendBadgeKey(score),
    recommendPct: rec.recommendPercent,
    averagePct: rec.averagePercent,
    poorPct: rec.poorPercent,
  }
}

export type CopyrightKind = "publisher" | "author" | "community"

/** CopyrightType → 前端展示分类 */
export function normalizeCopyrightKind(
  type: CopyrightType | null | undefined,
  hasAuthor: boolean,
): CopyrightKind {
  if (type === "PUBLISHER") return "publisher"
  if (type === "AUTHOR") return "author"
  if (type === "COMMUNITY") return "community"
  return hasAuthor ? "author" : "community"
}

export interface BookCommunityStats {
  // reading
  readerCount: number
  finishedReadCount: number
  viewCount: number
  likeCount: number
  // book meta
  wordCount: number | null
  totalSlides: number
  publishLabel: string
  copyrightHolder: string
  copyrightKind: CopyrightKind
  // recommend
  recommend: RecommendDistribution
}

interface BuildOptions {
  /** 后端聚合接口（主数据源） */
  stats?: ProjectCommunityStatsVo | null | undefined
  /** 后端项目数据（兜底 viewCount / likeCount / createTime） */
  project?: ProjectVo | null | undefined
  /** SEO 内容（兜底 slides / author） */
  seo?: BookSeoContent | null | undefined
  /** deck JSON（仅用于兜底字数估算） */
  deck?: DeckLike | null | undefined
}

/**
 * 以 community-stats 接口为主，缺字段时优雅降级到 project / seo / deck。
 * - readerCount / finishedReadCount：后端为权威；接口缺失时降级到 viewCount 启发式
 * - wordCount：后端 null 时降级到 deck 估算，再为 0 时返回 null（UI 显示「—」）
 * - publishLabel：后端 sourceBookPublishDate 为权威（语义为出版日期），
 *                 缺失时才降级到 project.createTime（保持旧行为）
 * - recommend：后端为权威；缺数据时为 pending
 */
export function buildBookCommunityStats(opts: BuildOptions): BookCommunityStats {
  const { stats, project, seo, deck } = opts
  const reading: ProjectReadingStatsVo | undefined = stats?.reading
  const book: ProjectBookMetaVo | undefined = stats?.book
  const rec: ProjectRecommendStatsVo | undefined = stats?.recommend

  const viewCount = Math.max(0, Number(reading?.viewCount ?? project?.viewCount ?? 0))
  const likeCount = Math.max(0, Number(reading?.likeCount ?? project?.likeCount ?? 0))

  // readerCount / finishedCount：后端 UV 权威，缺失时启发式降级
  const readerCount =
    reading != null
      ? Math.max(0, Number(reading.readerCount ?? 0))
      : estimateReaderCount(viewCount, likeCount)
  const finishedReadCount = Math.max(0, Number(reading?.finishedCount ?? 0))

  // 字数：后端 null → deck 估算 → 仍为 0 则 null（UI 显示「—」）
  const fallbackWordCount = estimateDeckWordCount(deck)
  const wordCount =
    book?.wordCount != null ? Number(book.wordCount) : fallbackWordCount > 0 ? fallbackWordCount : null

  // 演示页数：后端 slideCount > seo.totalSlides > 0
  const totalSlides =
    (book?.slideCount != null && Number(book.slideCount) > 0
      ? Number(book.slideCount)
      : 0) || seo?.totalSlides || 0

  // 出版日期：后端 sourceBookPublishDate 为权威
  const publishLabel =
    formatPublishDate(book?.sourceBookPublishDate) ||
    formatPublishDate(project?.createTime)

  // 版权：后端 copyrightHolder 为权威；缺失时降级到 seo.author / Page2Top
  const author = String(seo?.author ?? "").trim()
  const copyrightHolder =
    String(book?.copyrightHolder ?? "").trim() || author || "Page2Top"
  const copyrightKind = normalizeCopyrightKind(book?.copyrightType, Boolean(author))

  // recommend：后端权威
  const recommend: RecommendDistribution = rec
    ? buildRecommendDistribution(rec)
    : {
        score: null,
        badgeKey: "pending",
        recommendPct: 0,
        averagePct: 0,
        poorPct: 0,
      }

  return {
    readerCount,
    finishedReadCount,
    viewCount,
    likeCount,
    wordCount,
    totalSlides,
    publishLabel,
    copyrightHolder,
    copyrightKind,
    recommend,
  }
}

/** 启发式：仅在 community-stats 不可用时用作 readerCount 兜底（PV - 点赞*2 - 留言*1.5） */
function estimateReaderCount(viewCount: number, likeCount: number): number {
  const v = Math.max(0, viewCount)
  if (v === 0) return 0
  const l = Math.max(0, likeCount)
  return Math.max(l, Math.round(v * 0.62 - l * 0.3))
}

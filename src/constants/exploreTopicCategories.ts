// 探索作品：主题领域分类（AI / 小说 / 教育 / 财经 / 创业）
// 与生成模式（document/card/novel）无关，走 Feed categoryId 筛选。
// @author hc @date 2026-08-06

import type { FeedStreamItemDto } from "@/api/types"

/** 探索 Tab 筛选用；all 仅前端使用，不传后端 */
export type ExploreTopicCategory = "all" | "ai" | "fiction" | "education" | "finance" | "startup"

export interface ExploreTopicOption {
  id: ExploreTopicCategory
  i18nKey: string
}

/** 固定主题分类（后端 categoryId 与此 slug 对齐） */
export const EXPLORE_TOPIC_OPTIONS: ExploreTopicOption[] = [
  { id: "all", i18nKey: "workspace.exploreTopicAll" },
  { id: "ai", i18nKey: "workspace.exploreTopicAi" },
  { id: "fiction", i18nKey: "workspace.exploreTopicFiction" },
  { id: "education", i18nKey: "workspace.exploreTopicEducation" },
  { id: "finance", i18nKey: "workspace.exploreTopicFinance" },
  { id: "startup", i18nKey: "workspace.exploreTopicStartup" },
]

/** 项目分类选择（不含「全部」） */
export const EXPLORE_TOPIC_SELECTABLE_OPTIONS = EXPLORE_TOPIC_OPTIONS.filter(
  (o): o is ExploreTopicOption & { id: Exclude<ExploreTopicCategory, "all"> } =>
    o.id !== "all",
)

const TOPIC_I18N: Record<Exclude<ExploreTopicCategory, "all">, string> = {
  ai: "workspace.exploreTopicAi",
  fiction: "workspace.exploreTopicFiction",
  education: "workspace.exploreTopicEducation",
  finance: "workspace.exploreTopicFinance",
  startup: "workspace.exploreTopicStartup",
}

const KNOWN_TOPIC_IDS = new Set<string>(Object.keys(TOPIC_I18N))

/** 生成模式占用 categoryId 时的取值，不能当作探索主题 */
const GENERATION_MODE_CATEGORY_IDS = new Set([
  "novel",
  "document",
  "card",
  "outline",
  "ppt",
])

const TOPIC_LABEL_ALIASES: Record<Exclude<ExploreTopicCategory, "all">, readonly string[]> = {
  ai: ["ai"],
  fiction: ["fiction", "小说"],
  education: ["education", "教育"],
  finance: ["finance", "财经"],
  startup: ["startup", "创业"],
}

/** 后端 categoryName / 英文名反查 slug */
export function resolveExploreTopicIdByLabel(
  label: string | null | undefined,
): Exclude<ExploreTopicCategory, "all"> | null {
  const normalized = String(label ?? "").trim().toLowerCase()
  if (!normalized) return null

  for (const [id, aliases] of Object.entries(TOPIC_LABEL_ALIASES) as Array<
    [Exclude<ExploreTopicCategory, "all">, readonly string[]]
  >) {
    if (aliases.some((alias) => alias.toLowerCase() === normalized)) return id
  }

  return null
}

type ProjectTopicSource = {
  categoryId?: string | null
  categoryName?: string | null
  topicCategoryId?: string | null
  feedCategoryId?: string | null
  exploreCategoryId?: string | null
  [key: string]: unknown
}

/** 从项目详情解析探索主题 categoryId，忽略生成模式占用的 categoryId */
export function pickProjectExploreTopicCategoryId(
  project: ProjectTopicSource | null | undefined,
): Exclude<ExploreTopicCategory, "all"> | "" {
  if (!project) return ""

  for (const key of ["topicCategoryId", "feedCategoryId", "exploreCategoryId"] as const) {
    const id = String(project[key] ?? "").trim().toLowerCase()
    if (isKnownExploreTopicId(id)) return id
  }

  const rawCategoryId = String(project.categoryId ?? "").trim().toLowerCase()
  if (isKnownExploreTopicId(rawCategoryId)) return rawCategoryId
  if (rawCategoryId && !GENERATION_MODE_CATEGORY_IDS.has(rawCategoryId)) {
    const fromUnknownId = resolveExploreTopicIdByLabel(rawCategoryId)
    if (fromUnknownId) return fromUnknownId
  }

  const fromName = resolveExploreTopicIdByLabel(project.categoryName)
  if (fromName) return fromName

  return ""
}

/** 后端 Feed 筛选用：all 时不传 categoryId */
export function toFeedTopicCategoryFilter(
  category: ExploreTopicCategory,
): string | undefined {
  return category === "all" ? undefined : category
}

export function isKnownExploreTopicId(id: string): id is Exclude<ExploreTopicCategory, "all"> {
  return KNOWN_TOPIC_IDS.has(id)
}

/** 卡片角标：优先按 categoryId 映射 i18n，未知 id 时回退后端 categoryName */
export function resolveExploreTopicLabel(
  item: FeedStreamItemDto,
  translate: (key: string) => string,
): string | null {
  const fromId = resolveExploreTopicLabelById(item.categoryId, translate)
  if (fromId) return fromId

  const name = String(item.categoryName ?? "").trim()
  if (name) return name

  return null
}

/** 按 categoryId 映射 i18n 展示名 */
export function resolveExploreTopicLabelById(
  categoryId: string | null | undefined,
  translate: (key: string) => string,
): string | null {
  const id = String(categoryId ?? "").trim().toLowerCase()
  if (!id || !isKnownExploreTopicId(id)) return null
  return translate(TOPIC_I18N[id])
}

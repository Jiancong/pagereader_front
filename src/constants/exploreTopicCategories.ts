// 探索作品：主题领域分类（AI / 小说 / 教育 / 财经 / 创业）
// 与生成模式（document/card/novel）无关，走 Feed categoryId 筛选。
// 分类列表优先来自 GET /www/model/feed/categories，失败时使用 FALLBACK。
// @author hc @date 2026-08-06

import { shallowRef } from "vue"
import type { FeedStreamItemDto, FeedTopicCategoryDto } from "@/api/types"

/** 探索 Tab 筛选用；all 仅前端使用，不传后端 */
export type ExploreTopicCategory = "all" | string

export interface ExploreTopicOption {
  id: ExploreTopicCategory
  label: string
  count?: number
}

/** 接口不可用时的内置分类（与后端 slug 对齐） */
export const FALLBACK_TOPIC_CATEGORIES: FeedTopicCategoryDto[] = [
  { id: "ai", name: "AI", nameEn: "AI", sort: 1 },
  { id: "fiction", name: "小说", nameEn: "Fiction", sort: 2 },
  { id: "education", name: "教育", nameEn: "Education", sort: 3 },
  { id: "finance", name: "财经", nameEn: "Finance", sort: 4 },
  { id: "startup", name: "创业", nameEn: "Startup", sort: 5 },
]

const topicCategoriesRef = shallowRef<FeedTopicCategoryDto[]>([...FALLBACK_TOPIC_CATEGORIES])

export function getExploreTopicCategoriesRef() {
  return topicCategoriesRef
}

export function setExploreTopicCategories(categories: FeedTopicCategoryDto[]) {
  topicCategoriesRef.value = sortTopicCategories(
    categories.length ? categories : FALLBACK_TOPIC_CATEGORIES,
  )
}

export function sortTopicCategories(list: FeedTopicCategoryDto[]): FeedTopicCategoryDto[] {
  return [...list].sort((a, b) => (a.sort ?? 999) - (b.sort ?? 999))
}

export function pickTopicCategoryLabel(
  cat: Pick<FeedTopicCategoryDto, "name" | "nameEn">,
  locale: string,
): string {
  const isEn = locale === "en" || locale.startsWith("en")
  if (isEn) return String(cat.nameEn ?? cat.name).trim()
  return String(cat.name).trim()
}

function getKnownTopicIdSet(): Set<string> {
  return new Set(topicCategoriesRef.value.map((c) => c.id.toLowerCase()))
}

/** 生成模式占用 categoryId 时的取值，不能当作探索主题 */
const GENERATION_MODE_CATEGORY_IDS = new Set([
  "novel",
  "document",
  "card",
  "outline",
  "ppt",
])

/** 后端 categoryName / 英文名反查 slug */
export function resolveExploreTopicIdByLabel(
  label: string | null | undefined,
): string | null {
  const normalized = String(label ?? "").trim().toLowerCase()
  if (!normalized) return null

  for (const cat of topicCategoriesRef.value) {
    const id = cat.id.toLowerCase()
    if (id === normalized) return id
    if (cat.name.toLowerCase() === normalized) return id
    if (String(cat.nameEn ?? "").toLowerCase() === normalized) return id
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
): string {
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

export function isKnownExploreTopicId(id: string): boolean {
  const normalized = String(id ?? "").trim().toLowerCase()
  return normalized.length > 0 && getKnownTopicIdSet().has(normalized)
}

/** 卡片角标：优先按 categoryId 查分类列表，未知 id 时回退后端 categoryName */
export function resolveExploreTopicLabel(
  item: FeedStreamItemDto,
  locale: string,
): string | null {
  const fromId = resolveExploreTopicLabelById(item.categoryId, locale)
  if (fromId) return fromId

  const name = String(item.categoryName ?? "").trim()
  if (name) return name

  return null
}

/** 按 categoryId 映射展示名 */
export function resolveExploreTopicLabelById(
  categoryId: string | null | undefined,
  locale: string,
): string | null {
  const id = String(categoryId ?? "").trim().toLowerCase()
  if (!id) return null

  const cat = topicCategoriesRef.value.find((c) => c.id.toLowerCase() === id)
  if (cat) return pickTopicCategoryLabel(cat, locale)

  return null
}

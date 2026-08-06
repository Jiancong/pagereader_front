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

const TOPIC_I18N: Record<Exclude<ExploreTopicCategory, "all">, string> = {
  ai: "workspace.exploreTopicAi",
  fiction: "workspace.exploreTopicFiction",
  education: "workspace.exploreTopicEducation",
  finance: "workspace.exploreTopicFinance",
  startup: "workspace.exploreTopicStartup",
}

const KNOWN_TOPIC_IDS = new Set<string>(Object.keys(TOPIC_I18N))

/** 后端 Feed 筛选用：all 时不传 categoryId */
export function toFeedTopicCategoryFilter(
  category: ExploreTopicCategory,
): string | undefined {
  return category === "all" ? undefined : category
}

export function isKnownExploreTopicId(id: string): id is Exclude<ExploreTopicCategory, "all"> {
  return KNOWN_TOPIC_IDS.has(id)
}

/** 卡片角标：优先后端 categoryName，否则按 categoryId 映射 i18n */
export function resolveExploreTopicLabel(
  item: FeedStreamItemDto,
  translate: (key: string) => string,
): string | null {
  const name = String(item.categoryName ?? "").trim()
  if (name) return name

  const id = String(item.categoryId ?? "").trim().toLowerCase()
  if (!id || !isKnownExploreTopicId(id)) return null
  return translate(TOPIC_I18N[id])
}

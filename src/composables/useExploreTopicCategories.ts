// 探索主题分类：从 GET /www/model/feed/categories 加载，全局单例缓存
// @author hc @date 2026-08-07

import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { feedApi } from "@/api"
import {
  FALLBACK_TOPIC_CATEGORIES,
  getExploreTopicCategoriesRef,
  pickTopicCategoryLabel,
  setExploreTopicCategories,
  sortTopicCategories,
  type ExploreTopicOption,
} from "@/constants/exploreTopicCategories"

let loadPromise: Promise<void> | null = null

async function fetchExploreTopicCategories(): Promise<void> {
  try {
    const list = await feedApi.getFeedTopicCategories()
    if (Array.isArray(list) && list.length) {
      setExploreTopicCategories(sortTopicCategories(list))
      return
    }
  } catch {
    /* 接口未实现或网络错误：保留 fallback */
  }
  setExploreTopicCategories(FALLBACK_TOPIC_CATEGORIES)
}

/** 确保分类已从后端加载（多次调用共享同一 Promise） */
export function ensureExploreTopicCategoriesLoaded(): Promise<void> {
  if (!loadPromise) loadPromise = fetchExploreTopicCategories()
  return loadPromise
}

export function useExploreTopicCategories() {
  const { t, locale } = useI18n()
  const loading = ref(!loadPromise)

  void ensureExploreTopicCategoriesLoaded().finally(() => {
    loading.value = false
  })

  const categories = computed(() => getExploreTopicCategoriesRef().value)

  const tabOptions = computed((): ExploreTopicOption[] => [
    { id: "all", label: t("workspace.exploreTopicAll") },
    ...categories.value.map((cat) => ({
      id: cat.id,
      label: pickTopicCategoryLabel(cat, locale.value),
      count: cat.count,
    })),
  ])

  const selectableOptions = computed(() =>
    tabOptions.value.filter((o) => o.id !== "all"),
  )

  function resolveLabelById(categoryId: string | null | undefined): string | null {
    const id = String(categoryId ?? "").trim().toLowerCase()
    if (!id) return null
    const cat = categories.value.find((c) => c.id.toLowerCase() === id)
    if (cat) return pickTopicCategoryLabel(cat, locale.value)
    return null
  }

  return {
    loading,
    categories,
    tabOptions,
    selectableOptions,
    resolveLabelById,
    ensureLoaded: ensureExploreTopicCategoriesLoaded,
  }
}

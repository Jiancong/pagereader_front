import { ref, computed } from "vue"
import { feedApi, fileApi } from "@/api"
import type { GeneratedAssetItem } from "@/types/generatedAsset"
import {
  mapImageToAsset,
  mapProjectToAsset,
  shouldIncludeProjectAsAsset,
} from "@/types/generatedAsset"

export type GeneratedAssetFilter = "all" | "ppt" | "novel" | "image"

export function useGeneratedAssets() {
  const items = ref<GeneratedAssetItem[]>([])
  const loading = ref(false)
  const error = ref("")
  const filter = ref<GeneratedAssetFilter>("all")

  async function refresh() {
    loading.value = true
    error.value = ""
    try {
      const [projectPage, imagePage] = await Promise.all([
        feedApi.getMyProjects(0, 50),
        fileApi.getUserGeneratedImages(0, 50),
      ])
      const projects = (projectPage.content ?? [])
        .filter(shouldIncludeProjectAsAsset)
        .map(mapProjectToAsset)
      const images = (imagePage.content ?? []).map(mapImageToAsset)
      items.value = [...projects, ...images].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
    } catch (e) {
      items.value = []
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  const filteredItems = computed(() => {
    if (filter.value === "all") return items.value
    return items.value.filter((i) => i.kind === filter.value)
  })

  return { items, filteredItems, loading, error, filter, refresh }
}

import { ref, computed } from "vue"
import { feedApi, fileApi } from "@/api"
import type { GeneratedAssetItem } from "@/types/generatedAsset"
import {
  mapImageToAsset,
  mapProjectToAsset,
  shouldIncludeProjectAsAsset,
} from "@/types/generatedAsset"

export type GeneratedAssetFilter = "all" | "ppt" | "novel" | "image"

const PAGE_SIZE = 50

function sortByUpdatedAtDesc(list: GeneratedAssetItem[]): GeneratedAssetItem[] {
  return [...list].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

export function useGeneratedAssets() {
  const items = ref<GeneratedAssetItem[]>([])
  const loading = ref(false)
  const loadingMore = ref(false)
  const error = ref("")
  const filter = ref<GeneratedAssetFilter>("all")

  const projectPage = ref(0)
  const imagePage = ref(0)
  const projectHasMore = ref(false)
  const imageHasMore = ref(false)

  const hasMore = computed(() => projectHasMore.value || imageHasMore.value)

  async function refresh() {
    loading.value = true
    error.value = ""
    try {
      const [projectResp, imageResp] = await Promise.all([
        feedApi.getMyProjects(0, PAGE_SIZE),
        fileApi.getUserGeneratedImages(0, PAGE_SIZE),
      ])
      const projects = (projectResp.content ?? [])
        .filter(shouldIncludeProjectAsAsset)
        .map(mapProjectToAsset)
      const images = (imageResp.content ?? []).map(mapImageToAsset)

      projectPage.value = 0
      imagePage.value = 0
      projectHasMore.value = projectResp.last === false
      imageHasMore.value = imageResp.last === false

      items.value = sortByUpdatedAtDesc([...projects, ...images])
    } catch (e) {
      items.value = []
      projectHasMore.value = false
      imageHasMore.value = false
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  /** 加载下一页并追加到列表末尾（新批次内部按时间倒序） */
  async function loadMore() {
    if (loading.value || loadingMore.value || !hasMore.value) return
    loadingMore.value = true
    try {
      const nextItems: GeneratedAssetItem[] = []

      if (projectHasMore.value) {
        const resp = await feedApi.getMyProjects(projectPage.value + 1, PAGE_SIZE)
        projectPage.value += 1
        projectHasMore.value = resp.last === false
        nextItems.push(
          ...(resp.content ?? []).filter(shouldIncludeProjectAsAsset).map(mapProjectToAsset),
        )
      }

      if (imageHasMore.value) {
        const resp = await fileApi.getUserGeneratedImages(imagePage.value + 1, PAGE_SIZE)
        imagePage.value += 1
        imageHasMore.value = resp.last === false
        nextItems.push(...(resp.content ?? []).map(mapImageToAsset))
      }

      if (nextItems.length) {
        const seen = new Set(items.value.map((i) => `${i.kind}-${i.id}`))
        items.value = [
          ...items.value,
          ...sortByUpdatedAtDesc(nextItems).filter((i) => !seen.has(`${i.kind}-${i.id}`)),
        ]
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loadingMore.value = false
    }
  }

  const filteredItems = computed(() => {
    if (filter.value === "all") return items.value
    return items.value.filter((i) => i.kind === filter.value)
  })

  return { items, filteredItems, loading, loadingMore, hasMore, error, filter, refresh, loadMore }
}

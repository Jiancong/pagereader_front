import { ref, type MaybeRefOrGetter, toValue } from "vue"
import { useI18n } from "vue-i18n"
import { ElMessage } from "element-plus"
import { bookExpertApi, isLoggedIn } from "@/api"
import type { BookExpertSummary } from "@/api/types"
import {
  applyBookExpertLikeResult,
  bookExpertLikedByMe,
} from "@/utils/bookExpertEngagement"

export function useBookExpertLikeToggle(userId: MaybeRefOrGetter<string | null | undefined>) {
  const favoritingId = ref<string | null>(null)
  const { t } = useI18n()

  async function toggleLike(expert: BookExpertSummary) {
    const uid = String(toValue(userId) ?? "").trim()
    if (!expert?.expert_id || favoritingId.value) return
    if (!uid || !isLoggedIn()) {
      ElMessage.warning(t("bookExpert.likeNeedsLogin"))
      return
    }
    favoritingId.value = expert.expert_id
    try {
      const action = bookExpertLikedByMe(expert) ? "unclick" : "click"
      const res = await bookExpertApi.favoriteExpert(expert.expert_id, action, uid)
      applyBookExpertLikeResult(expert, res)
    } catch (e: unknown) {
      ElMessage.error(e instanceof Error ? e.message : t("common.actionFailed"))
    } finally {
      favoritingId.value = null
    }
  }

  return { favoritingId, toggleLike }
}

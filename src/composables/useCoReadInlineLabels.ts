import { computed } from "vue"
import { useI18n } from "vue-i18n"
import type { CoReadInlineLabels } from "@/utils/coReadInlineAnnotations"

export function useCoReadInlineLabels() {
  const { t } = useI18n()
  return computed(
    (): CoReadInlineLabels => ({
      kind: (k) => {
        const key = `coRead.kind.${k}` as const
        const translated = t(key)
        return translated !== key ? translated : t("coRead.annotationTitle")
      },
      streaming: t("coRead.streaming"),
      myReply: t("coRead.myReplyLabel"),
      replyPlaceholder: t("coRead.myReplyPlaceholder"),
      replySent: t("coRead.replySent"),
      annotationTitle: t("coRead.annotationTitle"),
      loading: t("coRead.loadingAnnotations"),
      generationFailed: t("coRead.generationFailed"),
      retryPage: t("coRead.retryPage"),
      saveReply: t("coRead.saveReply"),
      savedReply: t("coRead.savedReply"),
      chatAbout: t("coRead.chatAbout"),
      editReply: t("coRead.editReply"),
      deleteReply: t("coRead.deleteReply"),
      closePanel:
        t("coRead.closeCard") !== "coRead.closeCard" ? t("coRead.closeCard") : "Close",
    }),
  )
}

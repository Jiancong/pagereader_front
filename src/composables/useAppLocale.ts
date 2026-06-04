// 应用语言切换与 localStorage 持久化
// @author hc @date 2026-06-04

import { watch } from "vue"
import { useI18n } from "vue-i18n"

export const LOCALE_STORAGE_KEY = "pr_locale"
export type AppLocale = "zh-cn" | "en"

export function normalizeLocale(raw: string | null | undefined): AppLocale {
  return raw === "en" ? "en" : "zh-cn"
}

export function getSavedLocale(): AppLocale {
  if (typeof window === "undefined") return "zh-cn"
  return normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY))
}

export function applyDocumentLang(locale: AppLocale) {
  if (typeof document === "undefined") return
  document.documentElement.lang = locale === "zh-cn" ? "zh-CN" : "en"
}

export function useAppLocale() {
  const { locale } = useI18n()

  const setLocale = (code: AppLocale) => {
    locale.value = code
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, code)
    }
    applyDocumentLang(code)
  }

  return {
    locale,
    setLocale,
    options: [
      { code: "zh-cn" as const, labelKey: "common.langZh" },
      { code: "en" as const, labelKey: "common.langEn" },
    ],
  }
}

/** 在 App 根组件挂载：同步 html lang 与 locale 变化 */
export function useLocaleDocumentSync() {
  const { locale } = useI18n()
  applyDocumentLang(normalizeLocale(locale.value))
  watch(locale, (v) => applyDocumentLang(normalizeLocale(v)))
}

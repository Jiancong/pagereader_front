// 应用语言切换与 localStorage 持久化
// @author hc @date 2026-06-04

import { watch } from "vue"
import { useI18n } from "vue-i18n"
import { DOCUMENT_META } from "@/documentMeta"

export const LOCALE_STORAGE_KEY = "pr_locale"
export type AppLocale = "zh-cn" | "en"

export function normalizeLocale(raw: string | null | undefined): AppLocale {
  return raw === "en" ? "en" : "zh-cn"
}

export function getSavedLocale(): AppLocale {
  if (typeof window === "undefined") return "zh-cn"
  return normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY))
}

function setMetaDescription(content: string) {
  if (typeof document === "undefined") return
  let el = document.querySelector('meta[name="description"]')
  if (!el) {
    el = document.createElement("meta")
    el.setAttribute("name", "description")
    document.head.appendChild(el)
  }
  el.setAttribute("content", content)
}

/** 同步 html lang、document.title 与 meta description */
export function applyDocumentI18n(locale: AppLocale) {
  if (typeof document === "undefined") return
  const meta = DOCUMENT_META[locale]
  document.documentElement.lang = meta.htmlLang
  document.title = meta.title
  setMetaDescription(meta.description)
}

/** @deprecated 使用 applyDocumentI18n */
export function applyDocumentLang(locale: AppLocale) {
  applyDocumentI18n(locale)
}

export function useAppLocale() {
  const { locale } = useI18n()

  const setLocale = (code: AppLocale) => {
    locale.value = code
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, code)
    }
    applyDocumentI18n(code)
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

/** 在 App 根组件挂载：同步 document 元数据与 locale 变化 */
export function useLocaleDocumentSync() {
  const { locale } = useI18n()
  applyDocumentI18n(normalizeLocale(locale.value))
  watch(locale, (v) => applyDocumentI18n(normalizeLocale(v)))
}

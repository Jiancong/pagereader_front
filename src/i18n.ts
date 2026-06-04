// vue-i18n 配置
// @author hc @date 2026-06-04

import { createI18n } from "vue-i18n"
import zhCN from "./locales/zh-CN"
import en from "./locales/en"
import { getSavedLocale } from "./composables/useAppLocale"

function humanize(key: string): string {
  const last = key.split(".").pop() || key
  return last.replace(/^ppt/, "").replace(/([A-Z])/g, " $1").trim() || key
}

export const i18n = createI18n({
  legacy: false,
  locale: getSavedLocale(),
  fallbackLocale: "zh-cn",
  missingWarn: false,
  fallbackWarn: false,
  messages: {
    "zh-cn": zhCN,
    en,
  },
  missing: (_locale, key) => humanize(key),
})

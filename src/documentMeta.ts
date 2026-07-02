import zhCN from "./locales/zh-CN"
import en from "./locales/en"
import type { AppLocale } from "./composables/useAppLocale"

type LocaleMessages = {
  app: {
    brand: string
    documentTitle: string
    documentDescription: string
  }
}

function buildMeta(locale: AppLocale, messages: LocaleMessages) {
  const { brand, documentTitle, documentDescription } = messages.app
  return {
    htmlLang: locale === "en" ? "en" : "zh-CN",
    title: documentTitle.replace("{brand}", brand),
    description: documentDescription,
  }
}

/** 页面级 document 元数据（index.html title / description / html lang） */
export const DOCUMENT_META = {
  "zh-cn": buildMeta("zh-cn", zhCN),
  en: buildMeta("en", en),
} as const

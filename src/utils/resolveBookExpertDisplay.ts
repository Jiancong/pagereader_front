import { translateTextsInChunks } from "@/api/translation"
import type { BookExpertSummary } from "@/api/types"
import { resolveExploreTopicLabelById, pickExpertTopicCategoryId } from "@/constants/exploreTopicCategories"

const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/

const translationCache = new Map<string, string>()

function cacheKey(text: string, targetLang: string): string {
  return `${targetLang}\0${text}`
}

export function containsCjk(text: string | null | undefined): boolean {
  return CJK_RE.test(String(text ?? ""))
}

export function isEnglishUiLocale(locale: string | null | undefined): boolean {
  const raw = String(locale ?? "").trim().toLowerCase()
  return raw === "en" || raw.startsWith("en-")
}

export function isChineseUiLocale(locale: string | null | undefined): boolean {
  const raw = String(locale ?? "").trim().toLowerCase()
  return raw === "zh" || raw.startsWith("zh-")
}

function pickLocalizedField(
  primary: string | undefined,
  enVariant: string | undefined,
  zhVariant: string | undefined,
  locale: string,
): string {
  const base = String(primary ?? "").trim()
  const en = String(enVariant ?? "").trim()
  const zh = String(zhVariant ?? "").trim()
  if (isEnglishUiLocale(locale)) {
    if (en) return en
    if (base && !containsCjk(base)) return base
  }
  if (isChineseUiLocale(locale)) {
    if (zh) return zh
    if (base && containsCjk(base)) return base
  }
  return base
}

function needsClientTranslation(value: string, locale: string): boolean {
  const v = String(value ?? "").trim()
  if (!v) return false
  if (isEnglishUiLocale(locale)) return containsCjk(v)
  if (isChineseUiLocale(locale)) return !containsCjk(v)
  return false
}

function translationTargetLang(locale: string): string {
  return isEnglishUiLocale(locale) ? "en" : "zh-CN"
}

/** 合并 API 可能返回的英文字段（camelCase / snake_case） */
export function withBookExpertDisplayFields(
  expert: BookExpertSummary,
  locale: string,
): BookExpertSummary {
  const raw = expert as BookExpertSummary & {
    expert_name_en?: string
    expertNameEn?: string
    expert_name_zh?: string
    expertNameZh?: string
    book_title_en?: string
    bookTitleEn?: string
    book_title_zh?: string
    bookTitleZh?: string
  }
  return {
    ...expert,
    expert_name: pickLocalizedField(
      expert.expert_name,
      raw.expert_name_en ?? raw.expertNameEn,
      raw.expert_name_zh ?? raw.expertNameZh,
      locale,
    ),
    book_title: pickLocalizedField(
      expert.book_title,
      raw.book_title_en ?? raw.bookTitleEn,
      raw.book_title_zh ?? raw.bookTitleZh,
      locale,
    ),
  }
}

/**
 * 英文 UI：对仍含 CJK 的标题/书名走批量翻译；失败则保留原文。
 * 未登录时翻译接口可能 401，此时仅使用 API 英文字段与拉丁书名。
 */
export async function localizeBookExpertSummaries(
  experts: BookExpertSummary[],
  locale: string,
): Promise<BookExpertSummary[]> {
  if (!experts.length) return []
  const base = experts.map((e) => withBookExpertDisplayFields(e, locale))
  if (!isEnglishUiLocale(locale) && !isChineseUiLocale(locale)) return base

  const targetLang = translationTargetLang(locale)
  const texts: string[] = []
  const slots: { index: number; field: "expert_name" | "book_title" }[] = []

  base.forEach((expert, index) => {
    for (const field of ["expert_name", "book_title"] as const) {
      const value = String(expert[field] ?? "").trim()
      if (!value || !needsClientTranslation(value, locale)) continue
      const cached = translationCache.get(cacheKey(value, targetLang))
      if (cached) {
        expert[field] = cached
        continue
      }
      slots.push({ index, field })
      texts.push(value)
    }
  })

  if (!texts.length) return base

  try {
    const translations = await translateTextsInChunks(texts, targetLang)
    const out = base.map((e) => ({ ...e }))
    slots.forEach((slot, i) => {
      const translated = String(translations[i] ?? "").trim()
      if (!translated) return
      translationCache.set(cacheKey(texts[i], targetLang), translated)
      out[slot.index][slot.field] = translated
    })
    return out
  } catch {
    if (!isEnglishUiLocale(locale)) return base
    return base.map((expert, index) => {
      const categoryId = pickExpertTopicCategoryId(experts[index])
      const categoryLabel = resolveExploreTopicLabelById(categoryId, locale)
      const name = String(expert.expert_name ?? "").trim()
      if (containsCjk(name) && categoryLabel) {
        return {
          ...expert,
          expert_name: `${categoryLabel} · Book expert`,
        }
      }
      return expert
    })
  }
}

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

function pickLocalizedField(
  primary: string | undefined,
  enVariant: string | undefined,
  locale: string,
): string {
  const base = String(primary ?? "").trim()
  const en = String(enVariant ?? "").trim()
  if (isEnglishUiLocale(locale)) {
    if (en) return en
    if (base && !containsCjk(base)) return base
  }
  return base
}

/** 合并 API 可能返回的英文字段（camelCase / snake_case） */
export function withBookExpertDisplayFields(
  expert: BookExpertSummary,
  locale: string,
): BookExpertSummary {
  const raw = expert as BookExpertSummary & {
    expert_name_en?: string
    expertNameEn?: string
    book_title_en?: string
    bookTitleEn?: string
  }
  return {
    ...expert,
    expert_name: pickLocalizedField(
      expert.expert_name,
      raw.expert_name_en ?? raw.expertNameEn,
      locale,
    ),
    book_title: pickLocalizedField(
      expert.book_title,
      raw.book_title_en ?? raw.bookTitleEn,
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
  if (!isEnglishUiLocale(locale)) {
    return experts.map((e) => withBookExpertDisplayFields(e, locale))
  }

  const base = experts.map((e) => withBookExpertDisplayFields(e, locale))
  const texts: string[] = []
  const slots: { index: number; field: "expert_name" | "book_title" }[] = []

  base.forEach((expert, index) => {
    for (const field of ["expert_name", "book_title"] as const) {
      const value = String(expert[field] ?? "").trim()
      if (!value || !containsCjk(value)) continue
      const cached = translationCache.get(cacheKey(value, "en"))
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
    const translations = await translateTextsInChunks(texts, "en")
    const out = base.map((e) => ({ ...e }))
    slots.forEach((slot, i) => {
      const translated = String(translations[i] ?? "").trim()
      if (!translated) return
      translationCache.set(cacheKey(texts[i], "en"), translated)
      out[slot.index][slot.field] = translated
    })
    return out
  } catch {
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

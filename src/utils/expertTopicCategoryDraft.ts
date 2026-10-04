const DRAFT_PREFIX = "book-expert-topic-category:"

export function expertCategoryDraftKey(expertId: string): string {
  return `${DRAFT_PREFIX}${String(expertId || "").trim()}`
}

export function readExpertCategoryDraft(expertId: string): string {
  if (!expertId || typeof sessionStorage === "undefined") return ""
  try {
    return String(sessionStorage.getItem(expertCategoryDraftKey(expertId)) || "").trim()
  } catch {
    return ""
  }
}

export function writeExpertCategoryDraft(expertId: string, categoryId: string): void {
  if (!expertId || typeof sessionStorage === "undefined") return
  try {
    const id = String(categoryId || "").trim()
    if (id) sessionStorage.setItem(expertCategoryDraftKey(expertId), id)
    else sessionStorage.removeItem(expertCategoryDraftKey(expertId))
  } catch {
    /* ignore */
  }
}

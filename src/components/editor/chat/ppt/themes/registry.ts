import type { PptSlide } from "../types";

export const MODERN_LITERARY_TEMPLATE_ID = "modern-literary-minimal";
export const EDITORIAL_BRUTALIST_TEMPLATE_ID = "editorial-brutalist-modern";

export function shouldUseModernLiterarySlide(
  slide: PptSlide | null | undefined,
  isModernLiterary: boolean
): boolean {
  if (!isModernLiterary || !slide) return false;
  return ["cover", "section", "quote", "content", "two_column"].includes(slide.layout);
}

export function shouldUseEditorialBrutalistSlide(
  slide: PptSlide | null | undefined,
  isEditorialBrutalist: boolean
): boolean {
  if (!isEditorialBrutalist || !slide) return false;
  return ["cover", "section", "end", "quote", "content", "two_column", "toc", "data"].includes(
    slide.layout
  );
}

export function shouldUseClassicSlide(
  slide: PptSlide | null | undefined,
  isEditorialBrutalist: boolean,
  isModernLiterary: boolean,
): boolean {
  if (!slide) return false;
  if (shouldUseEditorialBrutalistSlide(slide, isEditorialBrutalist)) return false;
  if (shouldUseModernLiterarySlide(slide, isModernLiterary)) return false;
  return true;
}

import type { PptSlide } from "../../types";
import {
  isPredominantlyLatin,
  modernLiteraryCleanText,
  parseContentBody,
  pickDisplayString,
} from "../../shared/contentHelpers";
import { slideEmphasisLayout } from "../../shared/slideLayoutHelpers";

export interface ModernLiteraryContext {
  currentSlideIndex: number;
}

export type ModernLiteraryRightItem = NonNullable<PptSlide["right_items"]>[number];

function isModernLiteraryQuotedFragment(item: unknown): boolean {
  const text = modernLiteraryCleanText(item);
  if (!text || !/\[\d+\]/.test(text)) return false;
  return (
    /[“”"「」『』《》]/.test(text) ||
    /(^|\s)(\.{3}|…)/.test(text) ||
    text.includes("...")
  );
}

export function modernLiteraryQuoteText(slide: PptSlide): string {
  return modernLiteraryCleanText(
    slide.quote || slide.content?.[0] || slide.key_insight || slide.title || "",
  );
}

export function modernLiteraryQuoteTextClass(slide: PptSlide): Record<string, boolean> {
  const text = modernLiteraryQuoteText(slide);
  const len = text.length;
  let scale: "short" | "medium" | "long" = "short";
  if (isPredominantlyLatin(text)) {
    if (len > 140) scale = "long";
    else if (len > 70) scale = "medium";
  } else {
    if (len > 90) scale = "long";
    else if (len > 45) scale = "medium";
  }
  const latin = isPredominantlyLatin(text);
  return {
    "ppt-modern-quote-text--medium": scale === "medium",
    "ppt-modern-quote-text--long": scale === "long",
    "ppt-modern-quote-text--latin": latin,
  };
}

export function modernLiteraryQuoteCardClass(slide: PptSlide): Record<string, boolean> {
  const text = modernLiteraryQuoteText(slide);
  const len = text.length;
  const scale = isPredominantlyLatin(text)
    ? len > 140
      ? "long"
      : len > 70
        ? "medium"
        : "short"
    : len > 90
      ? "long"
      : len > 45
        ? "medium"
        : "short";
  return {
    "ppt-modern-quote-card--compact": scale !== "short",
  };
}

export function modernLiteraryQuoteItems(slide: PptSlide): string[] {
  return (slide.content || []).filter(isModernLiteraryQuotedFragment).slice(0, 2);
}

export function modernLiteraryBodyItems(slide: PptSlide): string[] {
  const all = slide.content || [];
  const usedInQuotes = new Set(
    modernLiteraryQuoteItems(slide).map((t) => modernLiteraryCleanText(t)).filter(Boolean),
  );
  const available = all.filter((item) => !usedInQuotes.has(modernLiteraryCleanText(item)));
  const nonQuoted = available.filter((item) => !isModernLiteraryQuotedFragment(item));
  return (nonQuoted.length ? nonQuoted : available).slice(0, 4);
}

export function modernLiteraryPlainItems(slide: PptSlide): string[] {
  return (slide.content || []).filter((item) => !isModernLiteraryQuotedFragment(item));
}

export function modernLiteraryMultiItems(slide: PptSlide): string[] {
  const items = modernLiteraryPlainItems(slide);
  return items.length > 3 ? items.slice(0, 4) : [];
}

export function isModernLiteraryMultiContent(slide: PptSlide): boolean {
  return slide.layout === "content" && modernLiteraryMultiItems(slide).length > 3;
}

export function modernLiteraryQuadItems(slide: PptSlide): string[] {
  return (slide.content || []).filter((t) => !!modernLiteraryCleanText(t)).slice(0, 4);
}

export function isModernLiteraryQuadContent(slide: PptSlide): boolean {
  return slide.layout === "content" && modernLiteraryQuadItems(slide).length >= 4;
}

export function modernLiteraryQuadVariant(
  slide: PptSlide,
  ctx: ModernLiteraryContext,
): "numbered" | "panel" | "grid" {
  const hinted = slideEmphasisLayout(slide);
  if (hinted.includes("number")) return "numbered";
  if (hinted.includes("panel") || hinted.includes("card")) return "panel";
  if (hinted.includes("grid")) return "grid";
  const variants = ["numbered", "panel", "grid"] as const;
  const n = Number(slide.index || ctx.currentSlideIndex + 1);
  return variants[Math.abs(n - 1) % variants.length];
}

export function isModernLiteraryRightItemsContent(slide: PptSlide): boolean {
  return (
    slide.layout === "content" &&
    (slide.right_items?.length ?? 0) > 0 &&
    modernLiteraryPlainItems(slide).length === 0
  );
}

function modernLiterarySplitTitle(title: string): { kicker: string; hero: string } {
  const trimmed = (title ?? "").trim();
  for (const sep of [" — ", " – ", " - ", ": "]) {
    const idx = trimmed.indexOf(sep);
    if (idx > 0) {
      return {
        kicker: trimmed.slice(0, idx).trim(),
        hero: trimmed.slice(idx + sep.length).trim(),
      };
    }
  }
  return { kicker: "", hero: trimmed };
}

export function modernLiteraryPortraitKicker(slide: PptSlide): string {
  const { kicker } = modernLiterarySplitTitle(slide.title || "");
  return kicker || (slide.subtitle || "").trim();
}

export function modernLiteraryPortraitHeroTitle(slide: PptSlide): string {
  const { hero, kicker } = modernLiterarySplitTitle(slide.title || "");
  return hero || kicker || slide.title || "";
}

export function modernLiteraryPortraitHeroBody(slide: PptSlide): string {
  return (slide.speaker_notes || slide.subtitle || "").trim();
}

export function modernLiteraryRightItemTitleAccentClass(
  ri: ModernLiteraryRightItem,
  idx: number,
): boolean {
  if (ri.highlight === true || ri.emphasis === true) return true;
  return idx === 1;
}

export function modernLiteraryRightItemTitleAccentStyle(
  ri: ModernLiteraryRightItem,
  idx: number,
): Record<string, string> | undefined {
  if (!modernLiteraryRightItemTitleAccentClass(ri, idx)) return undefined;
  const accent = (ri.accent_color || "").trim();
  if (accent) return { color: accent };
  return { color: "var(--modern-accent)" };
}

export function modernLiteraryDoubleItems(slide: PptSlide): string[] {
  const items = (slide.content || []).filter((t) => !!modernLiteraryCleanText(t));
  return items.length === 2 ? items : [];
}

export function isModernLiteraryDoubleContent(slide: PptSlide): boolean {
  return slide.layout === "content" && modernLiteraryDoubleItems(slide).length === 2;
}

export function modernLiteraryDoubleVariant(
  slide: PptSlide,
  ctx: ModernLiteraryContext,
): "contrast" | "split" | "stacked" | "numbered" {
  const hinted = slideEmphasisLayout(slide);
  if (hinted.includes("split") || hinted.includes("hero")) return "split";
  if (hinted.includes("stack") || hinted.includes("quote")) return "stacked";
  if (hinted.includes("number") || hinted.includes("list")) return "numbered";
  if (hinted.includes("contrast") || hinted.includes("compare")) return "contrast";
  const variants = ["contrast", "split", "stacked", "numbered"] as const;
  const n = Number(slide.index || ctx.currentSlideIndex + 1);
  return variants[Math.abs(n - 1) % variants.length];
}

export function modernLiteraryTripleItems(slide: PptSlide): string[] {
  const items = (slide.content || []).filter((t) => !!modernLiteraryCleanText(t));
  return items.length === 3 ? items : [];
}

export function isModernLiteraryTripleContent(slide: PptSlide): boolean {
  return slide.layout === "content" && modernLiteraryTripleItems(slide).length === 3;
}

export function modernLiteraryInlineKeyInsight(slide: PptSlide): boolean {
  if (isModernLiteraryRightItemsContent(slide)) return true;
  if (isModernLiteraryDoubleContent(slide)) return true;
  if (isModernLiteraryQuadContent(slide)) return true;
  if (isModernLiteraryTripleContent(slide)) return true;
  return false;
}

function modernLiteraryTriplePrefersCards(slide: PptSlide): boolean {
  const items = modernLiteraryTripleItems(slide);
  if (!items.length) return false;
  const bodyLengths = items.map((item) => parseContentBody(item).replace(/\s+/g, "").length);
  const maxLen = Math.max(...bodyLengths);
  const avgLen = bodyLengths.reduce((sum, len) => sum + len, 0) / bodyLengths.length;
  return maxLen > 56 || avgLen > 40;
}

export function modernLiteraryTripleDarkIndex(slide: PptSlide, ctx: ModernLiteraryContext): number {
  const n = Number(slide.index || ctx.currentSlideIndex + 1);
  return Math.abs(n - 1) % 3;
}

export function modernLiteraryTripleVariant(slide: PptSlide): "portrait" | "orbit" | "cards" {
  const hinted = slideEmphasisLayout(slide);
  const prefersCards = modernLiteraryTriplePrefersCards(slide);
  if (prefersCards) return "cards";
  if (hinted.includes("orbit") || hinted.includes("circle")) return "orbit";
  if (hinted.includes("card")) return "cards";
  if (hinted.includes("portrait") || hinted.includes("split")) return "portrait";
  const variants = ["portrait", "orbit", "cards"] as const;
  const n = Number(slide.index || 1);
  return variants[Math.abs(n - 1) % variants.length];
}

function rightItemTitle(ri: { title?: unknown }): string {
  return pickDisplayString(ri.title);
}

function rightItemDescription(ri: { description?: unknown }): string {
  return pickDisplayString(ri.description);
}

export function modernLiteraryRightItems(slide: PptSlide): string[] {
  if (slide.right_items?.length) {
    return slide.right_items
      .map((item) => {
        const title = rightItemTitle(item);
        const desc = rightItemDescription(item);
        return modernLiteraryCleanText(title && desc ? `${title} — ${desc}` : title || desc);
      })
      .filter(Boolean)
      .slice(0, 3);
  }
  return (slide.right_content || []).map(modernLiteraryCleanText).filter(Boolean).slice(0, 3);
}

export function modernLiteraryTwoColumnFooter(slide: PptSlide): string {
  const used = new Set(
    [...(slide.left_content || []), ...(slide.right_content || [])]
      .map((t) => modernLiteraryCleanText(t))
      .filter(Boolean),
  );
  const candidates = [slide.key_insight || "", modernLiteraryQuoteItems(slide)[0] || ""];
  for (const candidate of candidates) {
    const clean = modernLiteraryCleanText(candidate);
    if (clean && !used.has(clean)) return candidate;
  }
  return "";
}

export function modernLiteraryCompareTitleDuplicatesSlide(
  columnTitle?: string,
  slideTitle?: string,
): boolean {
  const col = (columnTitle ?? "").trim();
  const title = (slideTitle ?? "").trim();
  return Boolean(col && title && col === title);
}

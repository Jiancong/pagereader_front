import type { Composer } from "vue-i18n";
import { resolveSectionSubtitle } from "@/utils/pptChapterImages";
import type { ChartDataItem, PptChart, PptData, PptSlide } from "../../types";
import {
  chartHasPlottableValues,
  formatChartDataValue,
  isGroupedBarChart,
  isMultiSeriesLineChart,
} from "../../shared/chartHelpers";
import {
  contentPointTitle,
  displayText,
  hasContentPointBody,
  isPredominantlyLatin,
  parseContentBody,
  resolveSlideBulletItems,
} from "../../shared/contentHelpers";
import {
  documentFigureColumnStyle,
  documentFigureLeftItems,
  getTocEntries,
  hasDocumentFigurePage,
  isHeroLeftSlide,
  isLikelyUrl,
  tocDensityLevel,
} from "../../shared/slideLayoutHelpers";

export type EditorialBrutalistLayout = "hero" | "split" | "grid" | "asymmetric" | "quote";

export interface EditorialBrutalistCard {
  index: string;
  title: string;
  body: string;
}

export interface EditorialBrutalistContext {
  pptSource: PptData;
  currentSlideIndex: number;
  sectionChapterNum: number;
  t: Composer["t"];
}

export function editorialBrutalistLayout(slide: PptSlide): EditorialBrutalistLayout {
  if (["cover", "section", "end"].includes(slide.layout)) return "hero";
  if (slide.layout === "two_column") return "split";
  if (slide.layout === "quote") return "quote";
  if (slide.layout === "toc" || slide.layout === "data") return "grid";
  return (slide.content?.length ?? 0) >= 3 ? "grid" : "asymmetric";
}

export function editorialBrutalistKicker(slide: PptSlide, ctx: EditorialBrutalistContext): string {
  if (slide.layout === "cover") {
    const candidates = [slide.organization, slide.author, ctx.pptSource.organization, ctx.pptSource.author]
      .map((value) => String(value || "").trim())
      .filter((value) => value && !isLikelyUrl(value));
    return candidates[0] || ctx.t("agent.pptDefaultOrg");
  }
  if (slide.layout === "section") {
    return ctx.t("agent.pptChapterLabel", {
      number: slide.chapter_number || String(ctx.sectionChapterNum).padStart(2, "0"),
    });
  }
  if (slide.layout === "toc") return "Table of Contents";
  if (slide.layout === "data") return "Evidence / Data";
  return (
    slide.subtitle ||
    slide.subtitle_en ||
    `Slide ${String(slide.index || ctx.currentSlideIndex + 1).padStart(2, "0")}`
  );
}

/** Hero 主标题：section 只用页内 title，不 fallback 到 deck title（避免误显示 Part 1 等） */
export function editorialBrutalistHeroTitle(
  slide: PptSlide,
  ctx: EditorialBrutalistContext,
): string {
  const pageTitle = String(slide.title ?? "").trim();
  if (pageTitle) return pageTitle;
  if (slide.layout === "section") return "";
  return String(ctx.pptSource.title ?? "").trim();
}

export function editorialBrutalistHeroBody(slide: PptSlide, ctx: EditorialBrutalistContext): string {
  if (slide.layout === "section") {
    return resolveSectionSubtitle(slide);
  }
  return (
    slide.subtitle ||
    resolveSectionSubtitle(slide) ||
    ctx.pptSource.subtitle ||
    slide.key_insight ||
    ""
  );
}

export function editorialBrutalistHeroDate(slide: PptSlide, ctx: EditorialBrutalistContext): string {
  return String(slide.date || ctx.pptSource.date || "").trim();
}

export function editorialBrutalistDisplayUnits(text: string): number {
  const cjk = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g) ?? []).length;
  const latinWords = text
    .replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return cjk + latinWords;
}

export function editorialBrutalistDisplayClass(
  slide: PptSlide,
  ctx: EditorialBrutalistContext,
): Record<string, boolean> {
  const text = editorialBrutalistHeroTitle(slide, ctx);
  const units = editorialBrutalistDisplayUnits(text);
  const latin = isPredominantlyLatin(text);
  const latinWords = text.split(/\s+/).filter(Boolean).length;

  if (latin) {
    return {
      "ppt-brutalist-display--latin": true,
      "ppt-brutalist-display--medium": latinWords >= 3 && latinWords < 6,
      "ppt-brutalist-display--long": latinWords >= 6 || text.length > 24,
    };
  }

  return {
    "ppt-brutalist-display--cjk": true,
    "ppt-brutalist-display--medium": units >= 4 && units < 10 && text.length <= 28,
    "ppt-brutalist-display--long": units >= 10 || text.length > 28,
  };
}

export function shouldShowEditorialBrutalistVerticalWatermark(slide: PptSlide): boolean {
  return slide.layout === "section";
}

export function editorialBrutalistWatermark(
  slide: PptSlide,
  ctx: EditorialBrutalistContext,
): string {
  if (slide.layout === "section") {
    return slide.chapter_number || String(ctx.sectionChapterNum).padStart(2, "0");
  }
  return String(slide.index || ctx.currentSlideIndex + 1).padStart(2, "0");
}

export function editorialBrutalistContentCards(slide: PptSlide): EditorialBrutalistCard[] {
  if (slide.layout === "toc") {
    return getTocEntries(slide).map((entry, i) => ({
      index: entry.number || String(i + 1).padStart(2, "0"),
      title: entry.title,
      body: entry.description,
    }));
  }

  if (isHeroLeftSlide(slide)) return [];
  if (editorialBrutalistIsContentSplit(slide)) return [];

  const contentItems = (slide.content || []).filter((item) => !!displayText(item).trim());
  if (slide.layout === "content" && contentItems.length >= 3) {
    return contentItems.map((item, i) => ({
      index: String(i + 1).padStart(2, "0"),
      title: contentPointTitle(item),
      body: hasContentPointBody(item) ? parseContentBody(item) : displayText(item),
    }));
  }

  if (slide.metric_cards?.length) {
    return slide.metric_cards.slice(0, 4).map((card, i) => ({
      index: String(i + 1).padStart(2, "0"),
      title: card.value || card.label || "",
      body: [card.label && card.value ? card.label : "", card.detail].filter(Boolean).join(" — "),
    }));
  }

  if (slide.right_items?.length) {
    return slide.right_items.slice(0, 4).map((item, i) => ({
      index: item.index || String(i + 1).padStart(2, "0"),
      title: item.title || "",
      body: item.description || "",
    }));
  }

  return (slide.content || []).slice(0, 4).map((item, i) => ({
    index: String(i + 1).padStart(2, "0"),
    title: contentPointTitle(item),
    body: hasContentPointBody(item) ? parseContentBody(item) : "",
  }));
}

export function editorialBrutalistCardGridDensity(
  slide: PptSlide,
): "default" | "medium" | "compact" {
  if (slide.layout === "toc") return tocDensityLevel(slide);
  const cards = editorialBrutalistContentCards(slide);
  const count = Math.max(cards.length, resolveSlideBulletItems(slide).length);
  const maxBodyLen = cards.reduce(
    (max, card) => Math.max(max, (card.body || card.title || "").length),
    0,
  );
  if (count >= 6 || maxBodyLen >= 120) return "compact";
  if (count >= 4 || maxBodyLen >= 50) return "medium";
  if (count >= 3 || maxBodyLen >= 30) return "medium";
  return "default";
}

export function editorialBrutalistChartCards(slide: PptSlide): EditorialBrutalistCard[] {
  const chart = slide.chart;
  if (!chart?.data?.length) return [];
  if (isMultiSeriesLineChart(chart)) return [];
  if (isGroupedBarChart(chart)) return [];
  const rows = chart.data;
  if (rows.some((item) => Array.isArray(item.values) && item.values.length)) return [];
  return rows.slice(0, 4).map((item, i) => ({
    index: String(i + 1).padStart(2, "0"),
    title: item.label || item.stage || item.name || item.title || `Item ${i + 1}`,
    body: [formatChartDataValue(item.value), item.description || item.desc || item.text]
      .filter(Boolean)
      .join(" / "),
  }));
}

export function editorialBrutalistIsDataSlide(slide: PptSlide): boolean {
  const hasVisual = !!(slide.chart || slide.table?.rows?.length);
  const hasBullets = resolveSlideBulletItems(slide).length > 0;

  if (slide.layout === "data") {
    return hasVisual || hasBullets;
  }

  if (slide.layout === "content" && hasVisual) {
    return true;
  }

  return false;
}

export function editorialBrutalistShowDataTable(slide: PptSlide): boolean {
  if (!slide.table?.rows?.length) return false;
  if (!slide.chart) return true;
  return !chartHasPlottableValues(slide.chart);
}

export function editorialBrutalistIsContentSplit(slide: PptSlide): boolean {
  if (slide.layout !== "content") return false;
  if (isHeroLeftSlide(slide)) return false;
  if (slide.chart || slide.table) return false;
  const bullets = resolveSlideBulletItems(slide);
  return bullets.length > 0 && (slide.right_items?.length ?? 0) > 0;
}

/** Many plain content bullets — card grid truncates; use scrollable point list. */
export function editorialBrutalistPreferBulletList(slide: PptSlide): boolean {
  if (slide.layout !== "content") return false;
  if (isHeroLeftSlide(slide) || editorialBrutalistIsContentSplit(slide)) return false;
  if (editorialBrutalistIsDataSlide(slide)) return false;
  const count = (slide.content || []).filter((item) => !!displayText(item).trim()).length;
  return count >= 6;
}

export function editorialBrutalistQuoteText(slide: PptSlide): string {
  return slide.quote || slide.content?.[0] || slide.key_insight || slide.title || "";
}

export function editorialBrutalistQuoteItems(slide: PptSlide): string[] {
  if (String(slide.quote || "").trim()) return [];
  return (slide.content || []).filter((item) => !!displayText(item).trim());
}

export function editorialBrutalistIsMultiQuote(slide: PptSlide): boolean {
  return slide.layout === "quote" && editorialBrutalistQuoteItems(slide).length > 1;
}

type EditorialBrutalistQuoteTextScale = "short" | "medium" | "long";

function editorialBrutalistQuoteTextScale(slide: PptSlide): EditorialBrutalistQuoteTextScale {
  const text = editorialBrutalistQuoteText(slide);
  const len = text.length;
  if (isPredominantlyLatin(text)) {
    if (len > 140) return "long";
    if (len > 70) return "medium";
    return "short";
  }
  if (len > 90) return "long";
  if (len > 45) return "medium";
  return "short";
}

export function editorialBrutalistQuoteTextClass(slide: PptSlide): Record<string, boolean> {
  const scale = editorialBrutalistQuoteTextScale(slide);
  const latin = isPredominantlyLatin(editorialBrutalistQuoteText(slide));
  return {
    "ppt-brutalist-quote-text--medium": scale === "medium",
    "ppt-brutalist-quote-text--long": scale === "long",
    "ppt-brutalist-quote-text--latin": latin,
  };
}

export function editorialBrutalistQuoteCardClass(slide: PptSlide): Record<string, boolean> {
  return {
    "ppt-brutalist-quote--compact": editorialBrutalistQuoteTextScale(slide) !== "short",
  };
}

export function editorialBrutalistQuoteListClass(slide: PptSlide): Record<string, boolean> {
  const items = editorialBrutalistQuoteItems(slide);
  const count = items.length;
  const totalLen = items.reduce((sum, item) => sum + displayText(item).length, 0);
  return {
    "ppt-brutalist-point-list--dense": count >= 4,
    "ppt-brutalist-point-list--ultra": count >= 6,
    "ppt-brutalist-point-list--many": count >= 5,
    "ppt-brutalist-quote-list--longtext": totalLen >= 600,
    "ppt-brutalist-point-list--quote-fill": count >= 3,
  };
}

export function editorialBrutalistSplitLeft(slide: PptSlide): string[] {
  if (hasDocumentFigurePage(slide)) {
    return documentFigureLeftItems(slide);
  }
  if (slide.left_content?.length) return slide.left_content;
  return (slide.content || []).slice(0, 4);
}

export function editorialBrutalistSplitRight(slide: PptSlide): string[] {
  if (hasDocumentFigurePage(slide)) return [];
  if (slide.right_content?.length) return slide.right_content;
  if (slide.right_items?.length) {
    return slide.right_items.map((item) =>
      [item.title, item.description].filter(Boolean).join("："),
    );
  }
  return (slide.content || []).slice(4, 8);
}

export function editorialBrutalistSplitStyle(slide: PptSlide): Record<string, string> | undefined {
  return documentFigureColumnStyle(slide);
}

export function editorialBrutalistSplitListClass(slide: PptSlide): Record<string, boolean> {
  const count = Math.max(
    editorialBrutalistSplitLeft(slide).length,
    resolveSlideBulletItems(slide).length,
  );
  const docFigure = hasDocumentFigurePage(slide);
  const canFill = count >= 4 && count <= 5;
  return {
    "ppt-brutalist-point-list--dense": count >= 5,
    "ppt-brutalist-point-list--ultra": count >= 6 && !docFigure,
    "ppt-brutalist-point-list--many": count >= 6,
    "ppt-brutalist-point-list--fill":
      canFill && (docFigure || !editorialBrutalistIsContentSplit(slide)),
    "ppt-brutalist-point-list--scroll": count >= 6 || editorialBrutalistIsContentSplit(slide),
  };
}

export function editorialBrutalistInsightInline(slide: PptSlide): boolean {
  return (
    ["two_column", "content", "toc", "data"].includes(slide.layout) &&
    !isHeroLeftSlide(slide) &&
    !editorialBrutalistIsContentSplit(slide)
  );
}

export type { ChartDataItem, PptChart };

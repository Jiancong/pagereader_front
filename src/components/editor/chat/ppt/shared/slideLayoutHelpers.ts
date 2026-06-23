import {
  hasDocumentFigurePage,
  normalizeDocumentFigure,
  parseColumnSplit,
  resolveSectionSubtitle,
  type DocumentFigure,
} from "@/utils/pptChapterImages";
import type { PptSlide, PptTocEntry } from "../types";
import { parseTocDesc, parseTocTitle, resolveSlideBulletItems } from "./contentHelpers";

export { hasDocumentFigurePage, normalizeDocumentFigure, resolveSectionSubtitle };

export function documentFigureImgStyle(fig: DocumentFigure): Record<string, string> {
  const style: Record<string, string> = {};
  if (fig.width && fig.height) {
    style.aspectRatio = `${fig.width} / ${fig.height}`;
  }
  return style;
}

export function isLikelyUrl(text: string): boolean {
  const value = text.trim();
  return /^https?:\/\//i.test(value) || /^www\./i.test(value);
}

export function slideEmphasisLayout(slide: PptSlide | undefined): string {
  return String(slide?.emphasis_layout ?? "").trim().toLowerCase();
}

export function isMetricCardsChartSplitSlide(slide: PptSlide | undefined): boolean {
  if (!slide || slide.layout !== "data") return false;
  const cards = slide.metric_cards?.length ?? 0;
  if (!cards || (!slide.chart && !slide.table)) return false;
  if (slideEmphasisLayout(slide) === "metric_cards_row") return false;
  if (
    ["metric_cards_column", "metric_cards_split", "metric_cards_left", "kpi_chart"].includes(
      slideEmphasisLayout(slide),
    )
  ) {
    return true;
  }
  return !resolveSlideBulletItems(slide).length;
}

export function isContentMetricChartSlide(slide: PptSlide | undefined): boolean {
  if (!slide || slide.layout !== "data") return false;
  if (!slide.chart) return false;
  if ((slide.metric_cards?.length ?? 0) < 1) return false;
  if (slideEmphasisLayout(slide) === "metric_cards_row") return false;
  if (isMetricCardsChartSplitSlide(slide)) return false;
  return resolveSlideBulletItems(slide).length > 0;
}

export function isHeroLeftSlide(slide: PptSlide | undefined): boolean {
  if (isContentMetricChartSlide(slide)) return false;
  return slideEmphasisLayout(slide) === "hero_left" && Boolean(slide?.hero_metric);
}

export function getTocEntries(slide: PptSlide | undefined): PptTocEntry[] {
  if (!slide) return [];
  const structured = slide.toc_items;
  if (Array.isArray(structured) && structured.length) {
    return structured
      .map((item, i) => ({
        number: item.number?.trim() || String(i + 1).padStart(2, "0"),
        title: item.title?.trim() || "",
        description: item.description?.trim() || "",
        icon: item.icon?.trim() || undefined,
      }))
      .filter((e) => e.title || e.description);
  }
  return (slide.content || []).map((item, i) => ({
    number: String(i + 1).padStart(2, "0"),
    title: parseTocTitle(item),
    description: parseTocDesc(item),
    raw: item,
  }));
}

export function tocDensityLevel(slide: PptSlide | undefined): "default" | "medium" | "compact" {
  const n = getTocEntries(slide).length;
  if (n >= 6) return "compact";
  if (n >= 4) return "medium";
  return "default";
}

export function documentFigureLeftItems(s: PptSlide): string[] {
  if (s.left_content?.length) return s.left_content as string[];
  const items = s.content ?? [];
  if (!items.length) return [];
  if (typeof s.column_split === "number" && s.column_split > 0) {
    return items.slice(0, Math.min(s.column_split, items.length));
  }
  return items;
}

export function documentFigureColumnStyle(s: PptSlide): Record<string, string> | undefined {
  if (!hasDocumentFigurePage(s)) return undefined;
  const [leftPct, rightPct] = parseColumnSplit(s.column_split);
  return { display: "grid", gridTemplateColumns: `${leftPct}fr ${rightPct}fr` };
}

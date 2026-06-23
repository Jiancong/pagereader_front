import fs from "fs";
import path from "path";

const viewer = fs
  .readFileSync("src/components/editor/chat/PptViewer.vue", "utf8")
  .split(/\r?\n/);

function slice(a, b) {
  return viewer.slice(a - 1, b).join("\n");
}

const contentBody = slice(12631, 12649)
  + "\n"
  + slice(12719, 12797)
  + "\n"
  + slice(13494, 13632)
  + "\n"
  + slice(13167, 13172);

const contentHelpers = `import type { PptSlide } from "../types";

function isMetricCardsContentItem(item: unknown): boolean {
  if (!item || typeof item !== "object") return false;
  const o = item as Record<string, unknown>;
  const type = String(o.type ?? o.layout ?? o.block ?? "").trim().toLowerCase();
  if (type === "metric_cards" || type === "metric_cards_row") return true;
  return Array.isArray(o.metric_cards) && !pickDisplayString(o.title ?? o.text);
}

function isSummaryItem(item: unknown): boolean {
  const text = coerceContentItemText(item);
  return /^(总结|结论|核心洞察|核心观点|小结|Summary|Conclusion|Key Insights|Key Takeaways)[：:]/i.test(
    text,
  );
}

${contentBody
  .replace(/^function /gm, "export function ")
  .replace(/^const CONTENT_LIST_KEYS/m, "export const CONTENT_LIST_KEYS")
  .replace(/^const CONTENT_TITLE_SEP_RE/m, "export const CONTENT_TITLE_SEP_RE")}
`;

fs.writeFileSync("src/components/editor/chat/ppt/shared/contentHelpers.ts", contentHelpers);

const slideLayout = `import {
  hasDocumentFigurePage,
  parseColumnSplit,
  resolveSectionSubtitle,
} from "@/utils/pptChapterImages";
import type { PptSlide, PptTocEntry } from "../types";
import { parseTocDesc, parseTocTitle, resolveSlideBulletItems } from "./contentHelpers";

export { hasDocumentFigurePage, resolveSectionSubtitle };

export function isLikelyUrl(text: string): boolean {
  const value = text.trim();
  return /^https?:\\/\\//i.test(value) || /^www\\./i.test(value);
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
  return { display: "grid", gridTemplateColumns: \`\${leftPct}fr \${rightPct}fr\` };
}
`;

fs.writeFileSync("src/components/editor/chat/ppt/shared/slideLayoutHelpers.ts", slideLayout);

const chartHelpers = `import type { ChartDataItem, PptChart } from "../types";

export function formatChartDataValue(v: number): string {
  if (!Number.isFinite(v)) return "0";
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(v);
}

export function getLineChartSeriesRows(chart: PptChart | undefined): ChartDataItem[] {
  if (!chart || (chart.type !== "line" && chart.type !== "area")) return [];
  return (chart.data ?? []).filter((d) => Array.isArray(d.values) && d.values.length > 0);
}

export function isMultiSeriesLineChart(chart: PptChart | undefined): boolean {
  if (!chart || (chart.type !== "line" && chart.type !== "area")) return false;
  const rows = chart.data ?? [];
  const seriesRows = getLineChartSeriesRows(chart);
  if (seriesRows.length <= 1) return false;
  const simpleRows = rows.filter(
    (d) =>
      d.label != null &&
      d.value != null &&
      Number.isFinite(Number(d.value)) &&
      !(Array.isArray(d.values) && d.values.length),
  );
  if (simpleRows.length === rows.length) return false;
  const cats = chart.categories ?? chart.labels ?? [];
  return cats.length > 0 && seriesRows.length > 1;
}

export function getGroupedBarSeriesRows(chart: PptChart | undefined): ChartDataItem[] {
  if (!chart || chart.type !== "bar") return [];
  return (chart.data ?? []).filter((d) => Array.isArray(d.values) && d.values.length > 0);
}

export function isGroupedBarChart(chart: PptChart | undefined): boolean {
  if (!chart || chart.type !== "bar") return false;
  const rows = chart.data ?? [];
  const seriesRows = getGroupedBarSeriesRows(chart);
  if (seriesRows.length <= 1) return false;
  const simpleRows = rows.filter(
    (d) =>
      d.label != null &&
      d.value != null &&
      Number.isFinite(Number(d.value)) &&
      !(Array.isArray(d.values) && d.values.length),
  );
  if (simpleRows.length === rows.length) return false;
  const cats = chart.categories ?? chart.labels ?? [];
  return cats.length > 0 && seriesRows.length > 1;
}

export function chartHasPlottableValues(chart: PptChart | undefined): boolean {
  if (!chart?.data?.length) return false;
  for (const item of chart.data) {
    if (Array.isArray(item.values) && item.values.length) {
      for (const raw of item.values) {
        const n = typeof raw === "number" ? raw : Number(raw);
        if (Number.isFinite(n) && n !== 0) return true;
      }
    } else if (item.value != null) {
      const n = typeof item.value === "number" ? item.value : Number(item.value);
      if (Number.isFinite(n) && n !== 0) return true;
    }
  }
  return false;
}
`;

fs.writeFileSync("src/components/editor/chat/ppt/shared/chartHelpers.ts", chartHelpers);

console.log("Wrote shared helpers");

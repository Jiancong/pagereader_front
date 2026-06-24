import fs from "fs";
import path from "path";

const viewerPath = path.resolve("src/components/editor/chat/PptViewer.vue");
const lines = fs.readFileSync(viewerPath, "utf8").split(/\r?\n/);
const slice = (a, b) => lines.slice(a - 1, b).join("\n");

const exportFns = (code) =>
  code.replace(/^function (\w+)/gm, "export function $1");

const pptShared = path.resolve("src/components/editor/chat/ppt/shared");

// ── paletteHelpers.ts ──
fs.writeFileSync(
  path.join(pptShared, "paletteHelpers.ts"),
  `import type { PptPalette } from "../types";

${exportFns(slice(1527, 1705))}
`,
);

// ── normalizeChart.ts ──
let chartBody = exportFns(slice(1975, 2838) + "\n\n" + slice(3166, 3227));
chartBody = chartBody.replace(
  'primary_data_label = t("agent.pptComboPrimaryDefaultLabel");',
  "primary_data_label = comboPrimaryDefaultLabel;",
);
chartBody = chartBody.replace(
  "export function normalizeChart(chart: PptChart | undefined): PptChart | undefined {",
  `export type NormalizeChartOptions = { comboPrimaryDefaultLabel?: string };

export function normalizeChart(
  chart: PptChart | undefined,
  options: NormalizeChartOptions = {},
): PptChart | undefined {
  const comboPrimaryDefaultLabel = options.comboPrimaryDefaultLabel ?? "Primary";`,
);

fs.writeFileSync(
  path.join(pptShared, "normalizeChart.ts"),
  `import type { ChartDataItem, PptChart, SecondaryDataItem } from "../types";
import { normalizeAccentColor } from "./paletteHelpers";

${chartBody}
`,
);

// ── normalizePptSlide.ts ──
const slideBody = exportFns(slice(3421, 3452))
  + "\n\n"
  + exportFns(slice(3671, 3796));

fs.writeFileSync(
  path.join(pptShared, "normalizePptSlide.ts"),
  `import type { PptTable } from "@/components/editor/chat/PptTableBlock.vue";
import type { NormalizeChartOptions } from "./normalizeChart";
import type { PptData, PptSlide } from "../types";
import {
  coerceContentItemText,
  pickDisplayString,
  resolveSlideBulletItemsRaw,
} from "./contentHelpers";
import { normalizeAccentColor } from "./paletteHelpers";
import { normalizeChart } from "./normalizeChart";

function isMetricCardsContentItem(item: unknown): boolean {
  if (!item || typeof item !== "object") return false;
  const o = item as Record<string, unknown>;
  const type = String(o.type ?? o.layout ?? o.block ?? "")
    .trim()
    .toLowerCase();
  if (type === "metric_cards" || type === "metric_cards_row") return true;
  return Array.isArray(o.metric_cards) && !pickDisplayString(o.title ?? o.text);
}

${exportFns(slice(2840, 2916))}

${slideBody.replace(
  "export function normalizeSlideData(input: PptSlide | null): PptSlide | null {",
  "export function normalizeSlideData(\n  input: PptSlide | null,\n  normalizeChartOptions?: NormalizeChartOptions,\n): PptSlide | null {",
).replace(
  "let chart = withNotes.chart ? normalizeChart(withNotes.chart) : undefined;",
  "let chart = withNotes.chart\n    ? normalizeChart(withNotes.chart, normalizeChartOptions)\n    : undefined;",
)}

export function normalizePptData(
  data: PptData,
  normalizeChartOptions?: NormalizeChartOptions,
): PptData {
  return {
    ...data,
    slides: data.slides.map(
      (s) => normalizeSlideData(s, normalizeChartOptions) ?? enrichSlideSpeakerNotes(s),
    ),
  };
}
`,
);

console.log("Done: paletteHelpers.ts, normalizeChart.ts, normalizePptSlide.ts");

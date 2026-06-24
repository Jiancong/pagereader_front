/**
 * Remove extracted blocks from PptViewer.vue and wire imports from ppt/shared/.
 */
import fs from "fs";
import path from "path";

const viewerPath = path.resolve("src/components/editor/chat/PptViewer.vue");
let lines = fs.readFileSync(viewerPath, "utf8").split(/\r?\n/);

function del(start, end) {
  lines.splice(start - 1, end - start + 1);
}

const ranges = [
  [3632, 3803],
  [3321, 3622],
  [3233, 3251],
  [3166, 3227],
  [2840, 2916],
  [1975, 2838],
  [1527, 1754],
  [588, 830],
];

for (const [a, b] of ranges) del(a, b);

const importBlock = `import type {
  ChartDataItem,
  PptChart,
  PptData,
  PptPalette,
  PptSlide,
  PptTocEntry,
  SecondaryDataItem,
} from "@/components/editor/chat/ppt/types";
import {
  coerceContentItemText,
  contentPointTitle,
  displayText,
  getContentItems,
  getSummaryItem,
  hasContentPointBody,
  parseContentBody,
  parseTocDesc,
  parseTocTitle,
  pickDisplayString,
  resolveSlideBulletItems,
  resolveSlideBulletItemsRaw,
  rightItemDescription,
  rightItemTitle,
} from "@/components/editor/chat/ppt/shared/contentHelpers";
import {
  accentColorAt,
  ceilToNiceAxisMax,
  colorRelativeLuminance,
  DEFAULT_ACCENT,
  DEFAULT_HERO_GOLD,
  ensureReadablePaletteVars,
  expandMonochromeAccentPalette,
  normalizeAccentColor,
  padChartColorList,
  parseCssColorToRgb,
  PIE_COLORS,
  resolveChartColorList,
  resolveDeckAccentColors,
  resolveMetricCardAccent,
} from "@/components/editor/chat/ppt/shared/paletteHelpers";
import {
  chartSecondarySeries,
  coerceToUnknownArray,
  getStackedBarRowValues,
  normalizeChart,
  normalizeChartItem,
  normalizeStackedBarChartItem,
  toNumericSeries,
} from "@/components/editor/chat/ppt/shared/normalizeChart";
import {
  enrichSlideSpeakerNotes,
  normalizePptData,
  normalizeSlideData,
} from "@/components/editor/chat/ppt/shared/normalizePptSlide";
`;

const themeTokensImportIdx = lines.findIndex((l) =>
  l.includes('from "@/utils/pptThemeTokens"'),
);
if (themeTokensImportIdx >= 0) {
  lines.splice(themeTokensImportIdx + 1, 0, "", importBlock.trimEnd());
}

const chartOptionsExpr = '{ comboPrimaryDefaultLabel: t("agent.pptComboPrimaryDefaultLabel") }';

// Replace normalizePptData calls with locale-aware wrapper
lines = lines.map((line) => {
  if (line.includes("normalizePptData(JSON.parse")) {
    return line.replace(
      "normalizePptData(JSON.parse",
      `normalizePptData(JSON.parse`,
    ).replace(/\)$/, `, ${chartOptionsExpr})`);
  }
  return line;
});

// Fix editableData init and watch - need multiline replace
const editableInitIdx = lines.findIndex((l) =>
  l.includes("const editableData = ref<PptData>("),
);
if (editableInitIdx >= 0) {
  const closeIdx = lines.findIndex(
    (l, i) => i > editableInitIdx && l.trim() === ");",
  );
  if (closeIdx >= 0) {
    lines.splice(
      editableInitIdx,
      closeIdx - editableInitIdx + 1,
      "const editableData = ref<PptData>(",
      "  normalizePptData(JSON.parse(JSON.stringify(props.pptData)), {",
      '    comboPrimaryDefaultLabel: t("agent.pptComboPrimaryDefaultLabel"),',
      "  }),",
      ");",
    );
  }
}

const watchPptIdx = lines.findIndex((l) =>
  l.includes("editableData.value = normalizePptData(JSON.parse"),
);
if (watchPptIdx >= 0) {
  lines[watchPptIdx] =
    '      editableData.value = normalizePptData(JSON.parse(JSON.stringify(newVal)), { comboPrimaryDefaultLabel: t("agent.pptComboPrimaryDefaultLabel") });';
}

// Replace pptSource computed block
const pptSourceIdx = lines.findIndex((l) => l.includes("const pptSource = computed<PptData>"));
if (pptSourceIdx >= 0) {
  const slideIdx = lines.findIndex((l, i) =>
    i > pptSourceIdx && l.includes("const slide = computed(() => slideForExport.value)"),
  );
  if (slideIdx >= 0) {
    lines.splice(
      pptSourceIdx,
      slideIdx - pptSourceIdx + 1,
      "/** 当前数据源：编辑/查看均规范化 content、chart 等，避免对象形态 content 无法解析 */",
      "const pptSource = computed<PptData>(() => {",
      "  const base = isEditing.value ? editableData.value : props.pptData;",
      "  return normalizePptData(base, {",
      '    comboPrimaryDefaultLabel: t("agent.pptComboPrimaryDefaultLabel"),',
      "  });",
      "});",
      "",
      "// 当前幻灯片（导出时可能被 overrideContent 覆盖；须在字体 watch immediate 之前定义）",
      "const slideForExport = computed<PptSlide | null>(() => {",
      "  const source = pptSource.value;",
      "  const s = source.slides[currentSlide.value] ?? null;",
      "  if (!s) return null;",
      "  const base =",
      "    overrideContent.value === null ? s : { ...s, content: overrideContent.value };",
      "  return normalizeSlideData(base, {",
      '    comboPrimaryDefaultLabel: t("agent.pptComboPrimaryDefaultLabel"),',
      "  });",
      "});",
      "",
      "const slide = computed(() => slideForExport.value);",
    );
  }
}

// Ensure topicGridFillStyle exists after deletions
if (!lines.some((l) => l.includes("function topicGridFillStyle"))) {
  const insertAfter = lines.findIndex((l) => l.includes("function tocIconIndex"));
  const topicFn = [
    "",
    "/** 无图表 topic 卡网格：2+ 项时均分剩余高度，避免卡片缩在顶部留白 */",
    "function topicGridFillStyle(slide: PptSlide | undefined): Record<string, string> {",
    "  const count = resolveSlideBulletItems(slide).length;",
    "  if (count < 2) return {};",
    "  const cols = count <= 3 ? 1 : 2;",
    "  const rows = Math.ceil(count / cols);",
    "  return { gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` };",
    "}",
  ];
  if (insertAfter >= 0) {
    lines.splice(insertAfter, 0, ...topicFn);
  }
}

fs.writeFileSync(viewerPath, lines.join("\n"));
console.log("Patched PptViewer.vue — lines now:", lines.length);

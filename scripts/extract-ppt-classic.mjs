import fs from "fs";
import path from "path";

const root = path.resolve("src/components/editor/chat");
const srcPath = path.join(root, "PptViewer.vue");
const content = fs.readFileSync(srcPath, "utf8");
const lines = content.split(/\r?\n/);

const ppt = path.join(root, "ppt");
const classicDir = path.join(ppt, "themes/classic");
fs.mkdirSync(classicDir, { recursive: true });

function slice(start, end) {
  return lines.slice(start - 1, end).join("\n");
}

// Template: classic theme block (1-based line numbers)
const templateStart = lines.findIndex((l) => l.includes("<!-- cover 封面")) + 1;
const templateEnd = lines.findIndex((l) => l.includes("<!-- 兜底：未知 layout"));
const fallbackEnd =
  lines.findIndex((l, i) => i >= templateEnd && l.trim() === "</div>" && lines[i + 1]?.trim() === "</template>") + 1;

const templateBody = slice(templateStart, fallbackEnd);

// SCSS: from .ppt-slide through .ppt-thumb-label (before mobile)
const scssStart = lines.findIndex((l) => l.trim() === ".ppt-slide {") + 1;
const scssEnd = lines.findIndex((l) => l.includes("/* ── Mobile layout"));
const classicScss = slice(scssStart, scssEnd);

// Mobile slide rules (subset inside @media)
const mobileStart = scssEnd;
const mobileEnd = lines.findIndex((l, i) => i > mobileStart && l.trim() === "}");
const mobileBlock = lines.slice(mobileStart, mobileEnd + 1).join("\n");
const mobileSlideRules = mobileBlock
  .split("\n")
  .filter((l) => /\.ppt-(slide|content|cover|section|toc|data|quote|end|hero|metric|topic|thumb)/.test(l))
  .join("\n");

fs.writeFileSync(path.join(classicDir, "_template.fragment.html"), templateBody);
fs.writeFileSync(
  path.join(classicDir, "classic.scss"),
  classicScss + (mobileSlideRules ? `\n\n@media (max-width: 767px) {\n${mobileSlideRules}\n}\n` : ""),
);

// Analyze identifiers
const tpl = templateBody;
const fnCalls = new Set();
for (const m of tpl.matchAll(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g)) fnCalls.add(m[1]);

const editorKeys = new Set([
  "isEditing",
  "currentSlide",
  "pptSource",
  "currentBrandFooter",
  "sectionChapterNum",
  "locale",
  "t",
  "onCellBlur",
  "onContentItemBlur",
  "onPptTableRefClick",
  "onDataSourceLineBlur",
  "onListItemBlur",
  "onRightItemFieldBlur",
  "onHeroMetricBlur",
  "onDocumentFigureLeftItemBlur",
  "coverBackdropUrl",
  "sectionBackdropUrl",
  "coverDecorationSvg",
  "sectionDecorationSvg",
]);

const chartKeys = new Set([
  "isMultiSeriesLine",
  "isGroupedBar",
  "lineChartLegendItems",
  "lineChartSeriesList",
  "lineChartCategories",
  "groupedBarSeriesList",
  "groupedBarCategories",
  "linePoints",
  "multiLinePoints",
  "shouldRotateLabels",
  "barChartYRange",
  "barZeroY",
  "LINE_CHART_VIEWBOX",
  "LINE_CHART_X_CAT_Y_ROTATED",
  "LINE_CHART_X_CAT_Y",
  "BAR_CHART_X_CAT_Y_ROTATED",
  "BAR_CHART_X_CAT_Y",
  "getSeriesColor",
  "getLineYTicks",
  "getBarYTicks",
  "mapLineY",
  "mapBarY",
  "mapBarYSmall",
  "formatTickValue",
  "lineSeriesPoints",
  "lineSeriesValue",
  "lineCategoryLabelX",
  "chartStrokeStyle",
  "chartFillStyle",
  "groupedBarSeriesLabel",
  "groupedBarRectX",
  "groupedBarRectWidth",
  "groupedBarValue",
  "groupedBarRectStyle",
  "groupedBarCategoryLabelX",
  "chartXCatLabelTransform",
]);

const skip = new Set([
  "if",
  "else",
  "for",
  "key",
  "class",
  "style",
  "text",
  "blur",
  "click",
  "ref",
  "slice",
  "padStart",
  "toLocaleDateString",
  "String",
  "Number",
  "Math",
  "parseFloat",
  "parseInt",
  "Array",
  "Date",
  "includes",
  "map",
  "filter",
  "reduce",
  "find",
  "join",
  "split",
  "push",
  "length",
  "toFixed",
  "min",
  "max",
  "abs",
  "round",
  "floor",
  "ceil",
  "sqrt",
  "cos",
  "sin",
  "rotate",
  "rgba",
  "url",
  "var",
  "gauge",
  "radar",
  "scatter",
  "heatmap",
  "treemap",
  "waterfall",
  "undefined",
  "null",
  "true",
  "false",
  "event",
  "index",
  "layout",
  "type",
  "title",
  "content",
  "chart",
  "table",
  "slide",
  "item",
  "entry",
  ...editorKeys,
  ...chartKeys,
]);

const classicFns = [...fnCalls].filter((x) => !skip.has(x)).sort();
fs.writeFileSync(
  path.join(classicDir, "_classicFns.json"),
  JSON.stringify({ templateStart, templateEnd: fallbackEnd, scssStart, scssEnd, classicFns }, null, 2),
);

console.log("Extracted classic theme:", {
  templateLines: fallbackEnd - templateStart + 1,
  scssLines: scssEnd - scssStart,
  classicFnCount: classicFns.length,
});

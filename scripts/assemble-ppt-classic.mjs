import fs from "fs";
import path from "path";

const ppt = path.resolve("src/components/editor/chat/ppt");
const classicDir = path.join(ppt, "themes/classic");

function read(rel) {
  return fs.readFileSync(path.join(classicDir, rel), "utf8");
}

function indent(html, spaces = 2) {
  return html
    .split("\n")
    .map((line) => (line ? " ".repeat(spaces) + line : line))
    .join("\n");
}

let template = read("_template.fragment.html");
template = template.replace(
  /v-else-if="slide\.layout === 'cover'"/,
  'v-if="slide.layout === \'cover\'"',
);

const sharedImports = new Set([
  "displayText",
  "parseContentBody",
  "parseContentHeading",
  "contentPointTitle",
  "contentPointBody",
  "hasContentPointBody",
  "resolveSlideBulletItems",
  "getTocEntries",
  "tocDensityLevel",
  "hasDocumentFigurePage",
  "documentFigureLeftItems",
  "isHeroLeftSlide",
  "isContentMetricChartSlide",
  "isMetricCardsChartSplitSlide",
  "resolveSectionSubtitle",
  "formatChartDataValue",
  "getContentItems",
  "getSummaryItem",
  "isChapterImagePage",
  "resolveContentSplitIndex",
]);

const classicComputed = [
  "coverBackdropUrl",
  "sectionBackdropUrl",
  "coverDecorationSvg",
  "sectionDecorationSvg",
  "twoColumnBackdropUrl",
  "chapterImagePageDecorationSvg",
  "twoColumnSlideBackgroundStyle",
];

const extraClassicFns = [
  "metricCardStyle",
  "metricCardValueStyle",
  "contentPointStyle",
  "heroRightCardStyle",
  "heroMetricStyle",
  "rightItemAccentColor",
  "rightItemTitle",
  "rightItemDescription",
  "formatRightItemIndex",
  "isTimelineChart",
];

const classicFnKeys = [
  ...new Set([
    ...JSON.parse(read("_classicFns.json")).classicFns.filter((k) => !sharedImports.has(k)),
    ...extraClassicFns,
  ]),
];

const editorBindings = `
const isEditing = editor.isEditing;
const currentSlide = editor.currentSlideIndex;
const pptSource = editor.pptSource;
const currentBrandFooter = editor.brandFooter;
const sectionChapterNum = editor.sectionChapterNum;
const t = editor.t;
const onCellBlur = editor.onCellBlur;
const onContentItemBlur = editor.onContentItemBlur;
const onPptTableRefClick = editor.onPptTableRefClick;
`;

const chartBindings = `
const {
  isMultiSeriesLine,
  isGroupedBar,
  lineChartLegendItems,
  lineChartSeriesList,
  lineChartCategories,
  groupedBarSeriesList,
  groupedBarCategories,
  linePoints,
  multiLinePoints,
  shouldRotateLabels,
  barChartYRange,
  barZeroY,
  LINE_CHART_VIEWBOX,
  LINE_CHART_X_CAT_Y_ROTATED,
  LINE_CHART_X_CAT_Y,
  BAR_CHART_X_CAT_Y_ROTATED,
  BAR_CHART_X_CAT_Y,
  getSeriesColor,
  getLineYTicks,
  getBarYTicks,
  mapLineY,
  mapBarY,
  mapBarYSmall,
  formatTickValue,
  lineSeriesPoints,
  lineSeriesValue,
  lineCategoryLabelX,
  chartStrokeStyle,
  chartFillStyle,
  groupedBarSeriesLabel,
  groupedBarRectX,
  groupedBarRectWidth,
  groupedBarValue,
  groupedBarRectStyle,
  groupedBarCategoryLabelX,
  chartXCatLabelTransform,
} = chart;
`;

const classicBindings = [
  ...classicComputed.map((k) => `const ${k} = classic.${k};`),
  ...classicFnKeys.map((k) => `const ${k} = classic.${k};`),
  "const onDataSourceLineBlur = classic.onDataSourceLineBlur;",
  "const onListItemBlur = classic.onListItemBlur;",
  "const onRightItemFieldBlur = classic.onRightItemFieldBlur;",
  "const onHeroMetricBlur = classic.onHeroMetricBlur;",
  "const onDocumentFigureLeftItemBlur = classic.onDocumentFigureLeftItemBlur;",
].join("\n");

const sfc = `<script setup lang="ts">
import { inject } from "vue";
import { useI18n } from "vue-i18n";
import PptMarkdownInline from "@/components/editor/chat/PptMarkdownInline.vue";
import PptTableBlock from "@/components/editor/chat/PptTableBlock.vue";
import PptMetricCardsRow from "@/components/editor/chat/PptMetricCardsRow.vue";
import PptChartSourceLine from "@/components/editor/chat/PptChartSourceLine.vue";
import PptChapterImages from "@/components/editor/chat/PptChapterImages.vue";
import {
  isChapterImagePage,
  resolveContentSplitIndex,
} from "@/utils/pptChapterImages";
import { pptChartContextKey } from "../../pptChartContext";
import { pptClassicContextKey } from "../../pptClassicContext";
import { pptSlideEditorKey } from "../../pptSlideContext";
import { formatChartDataValue } from "../../shared/chartHelpers";
import {
  contentPointBody,
  contentPointTitle,
  displayText,
  getContentItems,
  getSummaryItem,
  hasContentPointBody,
  parseContentBody,
  parseContentHeading,
  resolveSlideBulletItems,
} from "../../shared/contentHelpers";
import {
  documentFigureLeftItems,
  getTocEntries,
  hasDocumentFigurePage,
  isContentMetricChartSlide,
  isHeroLeftSlide,
  isMetricCardsChartSplitSlide,
  resolveSectionSubtitle,
  tocDensityLevel,
} from "../../shared/slideLayoutHelpers";
import type { PptSlide } from "../../types";

defineProps<{ slide: PptSlide }>();

const editor = inject(pptSlideEditorKey)!;
const chart = inject(pptChartContextKey)!;
const classic = inject(pptClassicContextKey)!;
const { locale } = useI18n();
${editorBindings}
${chartBindings}
${classicBindings}
</script>

<template>
${indent(template)}
</template>

<style lang="scss">
@import "./classic.scss";
</style>
`;

fs.writeFileSync(path.join(classicDir, "PptClassicSlide.vue"), sfc);
console.log("Built PptClassicSlide.vue");

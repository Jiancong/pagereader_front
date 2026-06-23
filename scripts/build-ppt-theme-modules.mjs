import fs from "fs";
import path from "path";

const root = path.resolve("src/components/editor/chat");
const ppt = path.join(root, "ppt");
const viewerPath = path.join(root, "PptViewer.vue");
const lines = fs.readFileSync(viewerPath, "utf8").split(/\r?\n/);

function slice(start, end) {
  return lines.slice(start - 1, end).join("\n");
}

function readFragment(rel) {
  return fs.readFileSync(path.join(ppt, rel), "utf8");
}

function write(rel, content) {
  fs.writeFileSync(path.join(ppt, rel), content);
}

// --- editorialBrutalistHelpers.ts ---
const editorialHelpersBody = readFragment("themes/editorialBrutalist/_helpers.fragment.ts")
  .replace(/^type EditorialBrutalistLayout/m, "export type EditorialBrutalistLayout")
  .replace(/^interface EditorialBrutalistCard/m, "export interface EditorialBrutalistCard")
  .replace(/^function /gm, "export function ")
  .replace(/pptSource\.value/g, "ctx.pptSource")
  .replace(/sectionChapterNum\.value/g, "ctx.sectionChapterNum")
  .replace(/currentSlide\.value/g, "ctx.currentSlideIndex")
  .replace(/\bt\(/g, "ctx.t(");

write(
  "themes/editorialBrutalist/editorialBrutalistHelpers.ts",
  `import type { Composer } from "vue-i18n";
import { resolveSectionSubtitle } from "@/utils/pptChapterImages";
import type { PptChart, PptData, PptSlide } from "../../types";
import {
  contentPointTitle,
  displayText,
  hasContentPointBody,
  isPredominantlyLatin,
  parseContentBody,
} from "../../shared/contentHelpers";
import {
  documentFigureColumnStyle,
  documentFigureLeftItems,
  getTocEntries,
  isHeroLeftSlide,
  isLikelyUrl,
} from "../../shared/slideLayoutHelpers";
import {
  chartHasPlottableValues,
  formatChartDataValue,
  isGroupedBarChart,
  isMultiSeriesLineChart,
} from "../../shared/chartHelpers";
import { resolveSlideBulletItems } from "../../shared/contentHelpers";

export interface EditorialBrutalistContext {
  pptSource: PptData;
  currentSlideIndex: number;
  sectionChapterNum: number;
  t: Composer["t"];
}

${editorialHelpersBody.replace(
  /function editorialBrutalist/g,
  "export function editorialBrutalist"
).replace(/export export function/g, "export function")}

`.replace(
  /export function editorialBrutalistLayout\(slide: PptSlide\)/,
  "export function editorialBrutalistLayout(slide: PptSlide)"
).replace(
  /export function editorialBrutalistKicker\(slide: PptSlide\)/,
  "export function editorialBrutalistKicker(slide: PptSlide, ctx: EditorialBrutalistContext)"
).replace(
  /export function editorialBrutalistDisplayClass\(slide: PptSlide\)/,
  "export function editorialBrutalistDisplayClass(slide: PptSlide, ctx: EditorialBrutalistContext)"
).replace(
  /export function editorialBrutalistWatermark\(slide: PptSlide\)/,
  "export function editorialBrutalistWatermark(slide: PptSlide, ctx: EditorialBrutalistContext)"
)
);

// Fix duplicate export function from replace
let editorialHelpers = fs.readFileSync(
  path.join(ppt, "themes/editorialBrutalist/editorialBrutalistHelpers.ts"),
  "utf8"
);
editorialHelpers = editorialHelpers
  .replace(/export export function/g, "export function")
  .replace(
    /export function editorialBrutalistKicker\(slide: PptSlide\): string \{/,
    "export function editorialBrutalistKicker(slide: PptSlide, ctx: EditorialBrutalistContext): string {"
  )
  .replace(
    /export function editorialBrutalistDisplayClass\(slide: PptSlide\): Record<string, boolean> \{/,
    "export function editorialBrutalistDisplayClass(slide: PptSlide, ctx: EditorialBrutalistContext): Record<string, boolean> {"
  )
  .replace(
    /export function editorialBrutalistWatermark\(slide: PptSlide\): string \{/,
    "export function editorialBrutalistWatermark(slide: PptSlide, ctx: EditorialBrutalistContext): string {"
  );
fs.writeFileSync(path.join(ppt, "themes/editorialBrutalist/editorialBrutalistHelpers.ts"), editorialHelpers);

// --- modernLiteraryHelpers.ts ---
let modernBody = readFragment("themes/modernLiterary/_helpers.fragment.ts")
  .replace(/^function /gm, "export function ")
  .replace(/^type ModernLiteraryQuoteTextScale/m, "export type ModernLiteraryQuoteTextScale")
  .replace(/^type ModernLiteraryRightItem/m, "export type ModernLiteraryRightItem")
  .replace(/currentSlide\.value/g, "ctx.currentSlideIndex");

write(
  "themes/modernLiterary/modernLiteraryHelpers.ts",
  `import type { Composer } from "vue-i18n";
import type { PptSlide } from "../../types";
import {
  contentPointTitle,
  displayText,
  isPredominantlyLatin,
  modernLiteraryCleanText,
  parseContentBody,
} from "../../shared/contentHelpers";
import { pickDisplayString, slideEmphasisLayout } from "../../shared/slideLayoutHelpers";

export interface ModernLiteraryContext {
  currentSlideIndex: number;
  t?: Composer["t"];
}

${modernBody}

export function modernLiteraryCompareTitleDuplicatesSlide(
  columnTitle?: string,
  slideTitle?: string,
): boolean {
  const col = (columnTitle ?? "").trim();
  const title = (slideTitle ?? "").trim();
  return Boolean(col && title && col === title);
}
`
);

// Fix modernLiteraryQuadVariant to use ctx
let modernHelpers = fs.readFileSync(
  path.join(ppt, "themes/modernLiterary/modernLiteraryHelpers.ts"),
  "utf8"
);
modernHelpers = modernHelpers.replace(
  /export function modernLiteraryQuadVariant\(slide: PptSlide\)/,
  "export function modernLiteraryQuadVariant(slide: PptSlide, ctx: ModernLiteraryContext)"
);
fs.writeFileSync(path.join(ppt, "themes/modernLiterary/modernLiteraryHelpers.ts"), modernHelpers);

// --- PptBrutalistDataChart.vue ---
const chartFragment = readFragment("charts/_brutalistChart.fragment.html").trim();
write(
  "charts/PptBrutalistDataChart.vue",
  `<script setup lang="ts">
import { inject } from "vue";
import PptMarkdownInline from "@/components/editor/chat/PptMarkdownInline.vue";
import PptChartSourceLine from "@/components/editor/chat/PptChartSourceLine.vue";
import type { PptSlide } from "../types";
import { pptChartContextKey } from "../pptChartContext";
import { pptSlideEditorKey } from "../pptSlideContext";
import { editorialBrutalistChartCards } from "../themes/editorialBrutalist/editorialBrutalistHelpers";

defineProps<{ slide: PptSlide }>();

const chart = inject(pptChartContextKey)!;
const editor = inject(pptSlideEditorKey)!;

const {
  isMultiSeriesLine,
  lineChartLegendItems,
  getSeriesColor,
  LINE_CHART_VIEWBOX,
  getLineYTicks,
  mapLineY,
  formatTickValue,
  lineChartSeriesList,
  lineSeriesPoints,
  chartStrokeStyle,
  lineChartCategories,
  lineCategoryLabelX,
  shouldRotateLabels,
  LINE_CHART_X_CAT_Y_ROTATED,
  LINE_CHART_X_CAT_Y,
  lineSeriesValue,
  chartFillStyle,
  linePoints,
  multiLinePoints,
  isGroupedBar,
  groupedBarSeriesList,
  groupedBarSeriesLabel,
  getBarYTicks,
  mapBarY,
  barChartYRange,
  barZeroY,
  groupedBarRectX,
  groupedBarRectWidth,
  groupedBarValue,
  groupedBarRectStyle,
  groupedBarCategoryLabelX,
  chartXCatLabelTransform,
  BAR_CHART_X_CAT_Y_ROTATED,
  BAR_CHART_X_CAT_Y,
  mapBarYSmall,
} = chart;

function onPptTableRefClick(refId: string, slide: PptSlide) {
  editor.onPptTableRefClick(refId, slide);
}
</script>

<template>
${chartFragment}
  <div v-else class="ppt-brutalist-data-chart-fallback">
    <div
      v-for="card in editorialBrutalistChartCards(slide)"
      :key="'brutalist-chart-' + card.index"
      class="ppt-brutalist-data-chart-row"
    >
      <strong>{{ card.title }}</strong>
      <PptMarkdownInline
        v-if="card.body"
        class="ppt-brutalist-card-body"
        :text="card.body"
        :page-references="slide.page_references"
        @ref-click="onPptTableRefClick($event, slide)"
      />
    </div>
  </div>
</template>
`
);

// --- Editorial template: replace chart block ---
let editorialTemplate = readFragment("themes/editorialBrutalist/_template.fragment.html");
editorialTemplate = editorialTemplate.replace(
  /<template v-else-if="slide\.chart">[\s\S]*?<\/template>\s*(?=<\/section>)/,
  `<PptBrutalistDataChart v-else-if="slide.chart" :slide="slide" />\n`
);

write(
  "themes/editorialBrutalist/PptEditorialBrutalistSlide.vue",
  `<script setup lang="ts">
import { computed, inject } from "vue";
import PptMarkdownInline from "@/components/editor/chat/PptMarkdownInline.vue";
import PptTableBlock from "@/components/editor/chat/PptTableBlock.vue";
import PptBrutalistDataChart from "../../charts/PptBrutalistDataChart.vue";
import { pptSlideEditorKey } from "../../pptSlideContext";
import type { PptSlide } from "../../types";
import {
  displayText,
  contentPointTitle,
  hasContentPointBody,
  parseContentBody,
} from "../../shared/contentHelpers";
import {
  getTocEntries,
  hasDocumentFigurePage,
  isHeroLeftSlide,
  tocDensityLevel,
} from "../../shared/slideLayoutHelpers";
import { modernLiteraryCompareTitleDuplicatesSlide } from "../modernLiterary/modernLiteraryHelpers";
import type { EditorialBrutalistContext } from "./editorialBrutalistHelpers";
import * as brutalist from "./editorialBrutalistHelpers";

const props = defineProps<{ slide: PptSlide }>();
const editor = inject(pptSlideEditorKey)!;

const isEditing = editor.isEditing;
const currentSlide = editor.currentSlideIndex;
const pptSource = editor.pptSource;
const currentBrandFooter = editor.brandFooter;

const brutalistCtx = computed<EditorialBrutalistContext>(() => ({
  pptSource: editor.pptSource.value,
  currentSlideIndex: editor.currentSlideIndex.value,
  sectionChapterNum: editor.sectionChapterNum.value,
  t: editor.t,
}));

const editorialBrutalistLayout = (s: PptSlide) => brutalist.editorialBrutalistLayout(s);
const editorialBrutalistKicker = (s: PptSlide) =>
  brutalist.editorialBrutalistKicker(s, brutalistCtx.value);
const editorialBrutalistDisplayClass = (s: PptSlide) =>
  brutalist.editorialBrutalistDisplayClass(s, brutalistCtx.value);
const editorialBrutalistWatermark = (s: PptSlide) =>
  brutalist.editorialBrutalistWatermark(s, brutalistCtx.value);
const editorialBrutalistHeroBody = brutalist.editorialBrutalistHeroBody;
const editorialBrutalistHeroDate = brutalist.editorialBrutalistHeroDate;
const shouldShowEditorialBrutalistVerticalWatermark =
  brutalist.shouldShowEditorialBrutalistVerticalWatermark;
const editorialBrutalistIsMultiQuote = brutalist.editorialBrutalistIsMultiQuote;
const editorialBrutalistQuoteListClass = brutalist.editorialBrutalistQuoteListClass;
const editorialBrutalistQuoteItems = brutalist.editorialBrutalistQuoteItems;
const editorialBrutalistQuoteCardClass = brutalist.editorialBrutalistQuoteCardClass;
const editorialBrutalistQuoteTextClass = brutalist.editorialBrutalistQuoteTextClass;
const editorialBrutalistQuoteText = brutalist.editorialBrutalistQuoteText;
const editorialBrutalistSplitStyle = brutalist.editorialBrutalistSplitStyle;
const editorialBrutalistSplitListClass = brutalist.editorialBrutalistSplitListClass;
const editorialBrutalistSplitLeft = brutalist.editorialBrutalistSplitLeft;
const editorialBrutalistSplitRight = brutalist.editorialBrutalistSplitRight;
const editorialBrutalistIsContentSplit = brutalist.editorialBrutalistIsContentSplit;
const editorialBrutalistIsDataSlide = brutalist.editorialBrutalistIsDataSlide;
const editorialBrutalistShowDataTable = brutalist.editorialBrutalistShowDataTable;
const editorialBrutalistCardGridDensity = brutalist.editorialBrutalistCardGridDensity;
const editorialBrutalistContentCards = brutalist.editorialBrutalistContentCards;
const editorialBrutalistInsightInline = brutalist.editorialBrutalistInsightInline;
const resolveSlideBulletItems = brutalist.resolveSlideBulletItems;

const onCellBlur = editor.onCellBlur;
const onContentItemBlur = editor.onContentItemBlur;
const onPptTableRefClick = editor.onPptTableRefClick;

const slideClass = computed(() => [
  \`ppt-editorial-brutalist--\${props.slide.layout}\`,
  \`ppt-editorial-brutalist--\${editorialBrutalistLayout(props.slide)}\`,
  props.slide.layout === "toc"
    ? \`ppt-editorial-brutalist--toc-\${tocDensityLevel(props.slide)}\`
    : undefined,
  isHeroLeftSlide(props.slide) ? "ppt-editorial-brutalist--hero-left" : undefined,
  editorialBrutalistIsContentSplit(props.slide)
    ? "ppt-editorial-brutalist--content-split"
    : undefined,
  hasDocumentFigurePage(props.slide) ? "ppt-editorial-brutalist--document-figure" : undefined,
  editorialBrutalistIsMultiQuote(props.slide)
    ? "ppt-editorial-brutalist--quote-multi"
    : undefined,
]);
</script>

<template>
  <div class="ppt-slide ppt-editorial-brutalist" :class="slideClass">
${editorialTemplate.split("\n").map((l) => (l ? "    " + l : l)).join("\n")}
    <div v-if="currentBrandFooter" class="ppt-brand-footer">{{ currentBrandFooter }}</div>
  </div>
</template>

<style lang="scss">
@import "./editorialBrutalist.scss";
</style>
`
);

// --- Modern Literary slide ---
const modernTemplate = readFragment("themes/modernLiterary/_template.fragment.html");
write(
  "themes/modernLiterary/PptModernLiterarySlide.vue",
  `<script setup lang="ts">
import { computed, inject } from "vue";
import { useI18n } from "vue-i18n";
import PptMarkdownInline from "@/components/editor/chat/PptMarkdownInline.vue";
import { pptSlideEditorKey } from "../../pptSlideContext";
import type { PptSlide } from "../../types";
import {
  contentPointTitle,
  displayText,
  hasContentPointBody,
  parseContentBody,
} from "../../shared/contentHelpers";
import type { ModernLiteraryContext } from "./modernLiteraryHelpers";
import * as modern from "./modernLiteraryHelpers";

defineProps<{ slide: PptSlide }>();

const editor = inject(pptSlideEditorKey)!;
const { locale } = useI18n();

const isEditing = editor.isEditing;
const currentSlide = editor.currentSlideIndex;
const pptSource = editor.pptSource;
const currentBrandFooter = editor.brandFooter;
const modernLiteraryCoverTagline = editor.modernLiteraryCoverTagline;

const modernCtx = computed<ModernLiteraryContext>(() => ({
  currentSlideIndex: editor.currentSlideIndex.value,
  t: editor.t,
}));

const modernLiteraryQuoteCardClass = modern.modernLiteraryQuoteCardClass;
const modernLiteraryQuoteTextClass = modern.modernLiteraryQuoteTextClass;
const modernLiteraryQuoteText = modern.modernLiteraryQuoteText;
const modernLiteraryPortraitKicker = modern.modernLiteraryPortraitKicker;
const modernLiteraryPortraitHeroTitle = modern.modernLiteraryPortraitHeroTitle;
const modernLiteraryPortraitHeroBody = modern.modernLiteraryPortraitHeroBody;
const modernLiteraryRightItemTitleAccentClass = modern.modernLiteraryRightItemTitleAccentClass;
const modernLiteraryRightItemTitleAccentStyle = modern.modernLiteraryRightItemTitleAccentStyle;
const modernLiteraryDoubleVariant = modern.modernLiteraryDoubleVariant;
const modernLiteraryDoubleItems = modern.modernLiteraryDoubleItems;
const modernLiteraryTripleVariant = modern.modernLiteraryTripleVariant;
const modernLiteraryTripleItems = modern.modernLiteraryTripleItems;
const modernLiteraryTripleDarkIndex = modern.modernLiteraryTripleDarkIndex;
const modernLiteraryQuadVariant = (s: PptSlide) => modern.modernLiteraryQuadVariant(s, modernCtx.value);
const modernLiteraryQuadItems = modern.modernLiteraryQuadItems;
const modernLiteraryMultiItems = modern.modernLiteraryMultiItems;
const modernLiteraryQuoteItems = modern.modernLiteraryQuoteItems;
const modernLiteraryBodyItems = modern.modernLiteraryBodyItems;
const modernLiteraryInlineKeyInsight = modern.modernLiteraryInlineKeyInsight;
const modernLiteraryRightItems = modern.modernLiteraryRightItems;
const modernLiteraryTwoColumnFooter = modern.modernLiteraryTwoColumnFooter;
const modernLiteraryCompareTitleDuplicatesSlide = modern.modernLiteraryCompareTitleDuplicatesSlide;
const isModernLiteraryRightItemsContent = modern.isModernLiteraryRightItemsContent;
const isModernLiteraryQuadContent = modern.isModernLiteraryQuadContent;
const isModernLiteraryMultiContent = modern.isModernLiteraryMultiContent;

const onCellBlur = editor.onCellBlur;
const onContentItemBlur = editor.onContentItemBlur;
const onPptTableRefClick = editor.onPptTableRefClick;
</script>

<template>
  <div class="ppt-slide ppt-modern-literary" :class="\`ppt-modern-literary--\${slide.layout}\`">
${modernTemplate.split("\n").map((l) => (l ? "    " + l : l)).join("\n")}
    <div v-if="currentBrandFooter && slide.layout !== 'cover'" class="ppt-brand-footer">{{ currentBrandFooter }}</div>
  </div>
</template>

<style lang="scss">
@import "./modernLiterary.scss";
</style>
`
);

console.log("Built theme modules");

import fs from "fs";
import path from "path";

const ppt = path.resolve("src/components/editor/chat/ppt");

function read(rel) {
  return fs.readFileSync(path.join(ppt, rel), "utf8");
}

function indent(html, spaces = 4) {
  return html
    .split("\n")
    .map((line) => (line ? " ".repeat(spaces) + line : line))
    .join("\n");
}

let editorialTemplate = read("themes/editorialBrutalist/_template.fragment.html");
editorialTemplate = editorialTemplate.replace(
  /<template v-else-if="slide\.chart">[\s\S]*?<\/template>\s*(?=<\/section>)/,
  `<PptBrutalistDataChart v-else-if="slide.chart" :slide="slide" />\n`,
);

const editorialSlide = `<script setup lang="ts">
import { computed, inject } from "vue";
import PptMarkdownInline from "@/components/editor/chat/PptMarkdownInline.vue";
import PptTableBlock from "@/components/editor/chat/PptTableBlock.vue";
import PptBrutalistDataChart from "../../charts/PptBrutalistDataChart.vue";
import { pptSlideEditorKey } from "../../pptSlideContext";
import type { PptSlide } from "../../types";
import {
  contentPointTitle,
  displayText,
  hasContentPointBody,
  parseContentBody,
  resolveSlideBulletItems,
} from "../../shared/contentHelpers";
import {
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

const editorialBrutalistLayout = brutalist.editorialBrutalistLayout;
const editorialBrutalistKicker = (s: PptSlide) =>
  brutalist.editorialBrutalistKicker(s, brutalistCtx.value);
const editorialBrutalistDisplayClass = (s: PptSlide) =>
  brutalist.editorialBrutalistDisplayClass(s, brutalistCtx.value);
const editorialBrutalistWatermark = (s: PptSlide) =>
  brutalist.editorialBrutalistWatermark(s, brutalistCtx.value);
const editorialBrutalistHeroBody = (s: PptSlide) =>
  brutalist.editorialBrutalistHeroBody(s, brutalistCtx.value);
const editorialBrutalistHeroDate = (s: PptSlide) =>
  brutalist.editorialBrutalistHeroDate(s, brutalistCtx.value);

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
  editorialBrutalistIsMultiQuote(props.slide) ? "ppt-editorial-brutalist--quote-multi" : undefined,
]);
</script>

<template>
  <div class="ppt-slide ppt-editorial-brutalist" :class="slideClass">
${indent(editorialTemplate)}
    <div v-if="currentBrandFooter" class="ppt-brand-footer">{{ currentBrandFooter }}</div>
  </div>
</template>

<style lang="scss">
@import "./editorialBrutalist.scss";
</style>
`;

fs.writeFileSync(
  path.join(ppt, "themes/editorialBrutalist/PptEditorialBrutalistSlide.vue"),
  editorialSlide,
);

const chartFragment = read("charts/_brutalistChart.fragment.html").trim();
const chartVue = `<script setup lang="ts">
import { inject } from "vue";
import PptMarkdownInline from "@/components/editor/chat/PptMarkdownInline.vue";
import PptChartSourceLine from "@/components/editor/chat/PptChartSourceLine.vue";
import { pptChartContextKey } from "../pptChartContext";
import { pptSlideEditorKey } from "../pptSlideContext";
import type { PptSlide } from "../types";
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

const onPptTableRefClick = editor.onPptTableRefClick;
</script>

<template>
${indent(chartFragment, 2)}
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
`;

fs.writeFileSync(path.join(ppt, "charts/PptBrutalistDataChart.vue"), chartVue);

const modernTemplate = read("themes/modernLiterary/_template.fragment.html");
const modernSlide = `<script setup lang="ts">
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
}));

const modernLiteraryQuoteCardClass = modern.modernLiteraryQuoteCardClass;
const modernLiteraryQuoteTextClass = modern.modernLiteraryQuoteTextClass;
const modernLiteraryQuoteText = modern.modernLiteraryQuoteText;
const modernLiteraryPortraitKicker = modern.modernLiteraryPortraitKicker;
const modernLiteraryPortraitHeroTitle = modern.modernLiteraryPortraitHeroTitle;
const modernLiteraryPortraitHeroBody = modern.modernLiteraryPortraitHeroBody;
const modernLiteraryRightItemTitleAccentClass = modern.modernLiteraryRightItemTitleAccentClass;
const modernLiteraryRightItemTitleAccentStyle = modern.modernLiteraryRightItemTitleAccentStyle;
const modernLiteraryDoubleItems = modern.modernLiteraryDoubleItems;
const modernLiteraryDoubleVariant = (s: PptSlide) =>
  modern.modernLiteraryDoubleVariant(s, modernCtx.value);
const modernLiteraryTripleVariant = modern.modernLiteraryTripleVariant;
const modernLiteraryTripleItems = modern.modernLiteraryTripleItems;
const modernLiteraryTripleDarkIndex = (s: PptSlide) =>
  modern.modernLiteraryTripleDarkIndex(s, modernCtx.value);
const modernLiteraryQuadVariant = (s: PptSlide) =>
  modern.modernLiteraryQuadVariant(s, modernCtx.value);
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
const isModernLiteraryDoubleContent = modern.isModernLiteraryDoubleContent;
const isModernLiteraryTripleContent = modern.isModernLiteraryTripleContent;

const onCellBlur = editor.onCellBlur;
const onContentItemBlur = editor.onContentItemBlur;
const onPptTableRefClick = editor.onPptTableRefClick;
</script>

<template>
  <div class="ppt-slide ppt-modern-literary" :class="\`ppt-modern-literary--\${slide.layout}\`">
${indent(modernTemplate)}
    <div v-if="currentBrandFooter && slide.layout !== 'cover'" class="ppt-brand-footer">
      {{ currentBrandFooter }}
    </div>
  </div>
</template>

<style lang="scss">
@import "./modernLiterary.scss";
</style>
`;

fs.writeFileSync(path.join(ppt, "themes/modernLiterary/PptModernLiterarySlide.vue"), modernSlide);

console.log("Built theme Vue SFCs");

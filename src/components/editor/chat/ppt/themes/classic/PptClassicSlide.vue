<script setup lang="ts">
import { computed, inject } from "vue";
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
  normalizeDocumentFigure,
  resolveSectionSubtitle,
  tocDensityLevel,
} from "../../shared/slideLayoutHelpers";
import {
  classicBulletListTypography,
  classicContentPointsTypography,
  classicDataContentLeftTypography,
  classicHeroRightColumnTypography,
  classicTopicGridTypography,
} from "../../shared/classicTypographyHelpers";
import type { PptSlide } from "../../types";

const props = defineProps<{ slide: PptSlide }>();

const editor = inject(pptSlideEditorKey)!;
const chart = inject(pptChartContextKey)!;
const classic = inject(pptClassicContextKey)!;
const { locale } = useI18n();

const isEditing = editor.isEditing;
const currentSlide = editor.currentSlideIndex;
const pptSource = editor.pptSource;
const currentBrandFooter = editor.brandFooter;
const sectionChapterNum = editor.sectionChapterNum;
const t = editor.t;
const onCellBlur = editor.onCellBlur;
const onContentItemBlur = editor.onContentItemBlur;
const onPptTableRefClick = editor.onPptTableRefClick;
const onDocumentFigureCaptionBlur = editor.onDocumentFigureCaptionBlur;

const documentFigure = computed(() => normalizeDocumentFigure(props.slide));

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

const coverBackdropUrl = classic.coverBackdropUrl;
const sectionBackdropUrl = classic.sectionBackdropUrl;
const coverDecorationSvg = classic.coverDecorationSvg;
const sectionDecorationSvg = classic.sectionDecorationSvg;
const twoColumnBackdropUrl = classic.twoColumnBackdropUrl;
const chapterImagePageDecorationSvg = classic.chapterImagePageDecorationSvg;
const twoColumnSlideBackgroundStyle = classic.twoColumnSlideBackgroundStyle;
const contentPointStyle = classic.contentPointStyle;
const documentFigureColumnStyle = classic.documentFigureColumnStyle;
const documentFigureImgStyle = classic.documentFigureImgStyle;
const formatRightItemIndex = classic.formatRightItemIndex;
const formatStackedBarSegmentLabel = classic.formatStackedBarSegmentLabel;
const funnelBarWidthPercent = classic.funnelBarWidthPercent;
const funnelItemLabel = classic.funnelItemLabel;
const gaugeArcPath = classic.gaugeArcPath;
const gaugeTickMarks = classic.gaugeTickMarks;
const getScatterXTicks = classic.getScatterXTicks;
const getScatterYTicks = classic.getScatterYTicks;
const getStackedBarCategoryLabels = classic.getStackedBarCategoryLabels;
const getStackedBarRowValues = classic.getStackedBarRowValues;
const getWaterfallYTicks = classic.getWaterfallYTicks;
const hasBodyPrimaryVisual = classic.hasBodyPrimaryVisual;
const hasTableAndChart = classic.hasTableAndChart;
const heroLeftContentRightItems = classic.heroLeftContentRightItems;
const heroMetricStyle = classic.heroMetricStyle;
const heroRightCardStyle = classic.heroRightCardStyle;
const horizontalBarValueTextX = classic.horizontalBarValueTextX;
const horizontalBarViewBoxHeight = classic.horizontalBarViewBoxHeight;
const horizontalBarWidthPx = classic.horizontalBarWidthPx;
const isContentWithRightItemsSlide = classic.isContentWithRightItemsSlide;
const isMetricCardsOnlySlide = classic.isMetricCardsOnlySlide;
const isTimelineChart = classic.isTimelineChart;
const isVisualOnlySlide = classic.isVisualOnlySlide;
const mapScatterX = classic.mapScatterX;
const mapScatterY = classic.mapScatterY;
const mapWaterfallY = classic.mapWaterfallY;
const resolveReferencesSlideItemUrl = classic.resolveReferencesSlideItemUrl;
const rightItemAccentColor = classic.rightItemAccentColor;
const rightItemDescription = classic.rightItemDescription;
const rightItemTitle = classic.rightItemTitle;
const shouldFillMetricCards = classic.shouldFillMetricCards;
const shouldShowChapterSideImage = classic.shouldShowChapterSideImage;
const shouldShowContentBullets = classic.shouldShowContentBullets;
const shouldShowHeroLeftContentItems = classic.shouldShowHeroLeftContentItems;
const shouldShowHeroLeftMetricCards = classic.shouldShowHeroLeftMetricCards;
const shouldShowHeroLeftTable = classic.shouldShowHeroLeftTable;
const shouldShowHeroMetricBanner = classic.shouldShowHeroMetricBanner;
const shouldShowMetricCardInline = classic.shouldShowMetricCardInline;
const shouldShowMetricCardsCompactGrid = classic.shouldShowMetricCardsCompactGrid;
const shouldShowMetricCardsPrimaryGrid = classic.shouldShowMetricCardsPrimaryGrid;
const shouldUsePrimaryMetricCards = classic.shouldUsePrimaryMetricCards;
const stackedBarSegmentTitle = classic.stackedBarSegmentTitle;
const tocIconIndex = classic.tocIconIndex;
const topicGridFillStyle = classic.topicGridFillStyle;
const metricCardStyle = classic.metricCardStyle;
const metricCardValueStyle = classic.metricCardValueStyle;
const onDataSourceLineBlur = classic.onDataSourceLineBlur;
const onListItemBlur = classic.onListItemBlur;
const onRightItemFieldBlur = classic.onRightItemFieldBlur;
const onHeroMetricBlur = classic.onHeroMetricBlur;
const onDocumentFigureLeftItemBlur = classic.onDocumentFigureLeftItemBlur;
</script>

<template>
            <!-- cover 封面 -->
            <div
              v-if="slide.layout === 'cover'"
              class="ppt-slide ppt-cover"
              :style="coverBackdropUrl ? { backgroundImage: `url(${coverBackdropUrl})` } : {}"
            >
              <!-- 背景图蒙层（cover 仅 image_url 作全页背景） -->
              <div v-if="coverBackdropUrl" class="ppt-slide-bg-overlay"></div>
              <!-- 意境装饰背景（20 套随机其一，无背景图时显示） -->
              <div
                v-if="!coverBackdropUrl"
                class="ppt-cover-skyline"
                v-html="coverDecorationSvg"
              />
              <!-- 封面主体内容（居中） -->
              <div class="ppt-cover-content">
                <h1 class="ppt-cover-title">
                  <PptMarkdownInline
                    :text="slide.title || ''"
                    :editable="isEditing"
                    @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
                  />
                </h1>
                <p
                  v-if="pptSource.subtitle"
                  class="ppt-cover-subtitle"
                  :contenteditable="isEditing"
                  @blur="onCellBlur($event, 'subtitle')"
                >
                  {{ pptSource.subtitle }}
                </p>
              </div>
              <!-- 底部信息卡片 -->
              <div class="ppt-cover-info">
                <div class="ppt-cover-info-inner">
                  <div class="ppt-cover-author">
                    {{ slide.author || slide.organization || t("agent.pptDefaultOrg") }}
                  </div>
                  <div class="ppt-cover-date">
                    {{
                      slide.date ||
                      new Date().toLocaleDateString(
                        locale === "zh-cn" ? "zh-CN" : "en-US",
                        {
                          year: "numeric",
                          month: "long",
                        }
                      )
                    }}
                  </div>
                </div>
              </div>
              <!-- 底部装饰线 -->
              <div class="ppt-cover-bottom-line"></div>
              <div v-if="currentBrandFooter" class="ppt-brand-footer">{{ currentBrandFooter }}</div>
            </div>

            <!-- section 章节过渡 -->
            <div
              v-else-if="slide.layout === 'section'"
              class="ppt-slide ppt-section"
              :style="
                sectionBackdropUrl ? { backgroundImage: `url(${sectionBackdropUrl})` } : {}
              "
            >
              <div v-if="sectionBackdropUrl" class="ppt-slide-bg-overlay"></div>
              <div
                v-if="!sectionBackdropUrl"
                class="ppt-cover-skyline ppt-scenic-skyline"
                v-html="sectionDecorationSvg"
              />
              <!-- 四角装饰 -->
              <span class="ppt-section-corner ppt-section-corner--tl"></span>
              <span class="ppt-section-corner ppt-section-corner--tr"></span>
              <span class="ppt-section-corner ppt-section-corner--bl"></span>
              <span class="ppt-section-corner ppt-section-corner--br"></span>
              <!-- 居中内容 -->
              <div class="ppt-section-content">
                <div class="ppt-section-label">
                  {{
                    t("agent.pptChapterLabel", {
                      number:
                        slide.chapter_number ||
                        String(sectionChapterNum).padStart(2, "0"),
                    })
                  }}
                </div>
                <h2 class="ppt-section-title">
                  <PptMarkdownInline
                    :text="slide.title || ''"
                    :editable="isEditing"
                    @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
                  />
                </h2>
                <div class="ppt-section-divider"></div>
                <div
                  v-if="resolveSectionSubtitle(slide) || isEditing"
                  class="ppt-section-sub"
                >
                  <PptMarkdownInline
                    :text="resolveSectionSubtitle(slide)"
                    :editable="isEditing"
                    @blur="onCellBlur($event, `slides.${currentSlide}.subtitle_en`)"
                  />
                </div>
              </div>
              <!-- 底部品牌标识 -->
              <div v-if="currentBrandFooter" class="ppt-brand-footer">{{ currentBrandFooter }}</div>
            </div>

            <!-- toc 目录页 -->
            <div
              v-else-if="slide.layout === 'toc'"
              class="ppt-slide ppt-toc"
              :class="`ppt-toc--${tocDensityLevel(slide)}`"
            >
              <!-- 标题区域 -->
              <div class="ppt-toc-header">
                <h2 class="ppt-toc-title">
                  <PptMarkdownInline
                    :text="slide.title || ''"
                    :editable="isEditing"
                    @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
                  />
                </h2>
                <div v-if="slide.subtitle" class="ppt-toc-subtitle">
                  <PptMarkdownInline
                    :text="slide.subtitle || ''"
                    :editable="isEditing"
                    @blur="onCellBlur($event, `slides.${currentSlide}.subtitle`)"
                  />
                </div>
              </div>
              <!-- 卡片网格 -->
              <div class="ppt-toc-grid" :class="`ppt-toc-grid--${tocDensityLevel(slide)}`">
                <div
                  v-for="(entry, ti) in getTocEntries(slide)"
                  :key="'toc-' + ti"
                  class="ppt-toc-card"
                >
                  <div class="ppt-toc-card-icon">
                    <!-- 根据 toc_items.icon 或序号轮换不同图标 -->
                    <svg
                      v-if="tocIconIndex(entry, ti) === 0"
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                    <svg
                      v-else-if="tocIconIndex(entry, ti) === 1"
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                    <svg
                      v-else-if="tocIconIndex(entry, ti) === 2"
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <svg
                      v-else-if="tocIconIndex(entry, ti) === 3"
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                    <svg
                      v-else-if="tocIconIndex(entry, ti) === 4"
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <svg
                      v-else
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path
                        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                      />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <div class="ppt-toc-card-body">
                    <template v-if="isEditing && entry.raw">
                      <div
                        class="ppt-toc-card-title ppt-editable-full"
                        contenteditable="true"
                        @blur="onContentItemBlur($event, currentSlide, ti)"
                      >
                        {{ entry.raw }}
                      </div>
                    </template>
                    <template v-else>
                      <div class="ppt-toc-card-title">
                        <span class="ppt-toc-card-num">{{ entry.number }}</span>
                        {{ entry.title }}
                      </div>
                      <div v-if="entry.description" class="ppt-toc-card-desc">
                        {{ entry.description }}
                      </div>
                    </template>
                  </div>
                </div>
              </div>
              <!-- 底部品牌标识 -->
              <div v-if="currentBrandFooter" class="ppt-brand-footer">{{ currentBrandFooter }}</div>
            </div>

            <!-- references 参考资料页 -->
            <div
              v-else-if="slide.layout === 'references'"
              class="ppt-slide ppt-references"
            >
              <h2 class="ppt-slide-title">
                <PptMarkdownInline
                  :text="slide.title || ''"
                  :editable="isEditing"
                  @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
                />
              </h2>
              <div v-if="slide.subtitle" class="ppt-ref-subtitle">
                <PptMarkdownInline
                  :text="slide.subtitle || ''"
                  :editable="isEditing"
                  @blur="onCellBlur($event, `slides.${currentSlide}.subtitle`)"
                />
              </div>
              <div class="ppt-ref-list">
                <template v-for="(item, ri) in slide.content || []" :key="ri">
                  <a
                    v-if="resolveReferencesSlideItemUrl(item, slide)"
                    :href="resolveReferencesSlideItemUrl(item, slide)!"
                    class="ppt-ref-item ppt-ref-item--link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {{ displayText(item) }}
                  </a>
                  <div v-else class="ppt-ref-item">
                    {{ displayText(item) }}
                  </div>
                </template>
              </div>
              <div v-if="currentBrandFooter" class="ppt-brand-footer">{{ currentBrandFooter }}</div>
            </div>

            <!-- content 标准内容页 -->
            <div
              v-else-if="slide.layout === 'content'"
              class="ppt-slide ppt-content"
              :class="{ 'ppt-slide--metric-only': isMetricCardsOnlySlide(slide) }"
            >
              <h2 class="ppt-slide-title">
                <PptMarkdownInline
                  :text="slide.title || ''"
                  :editable="isEditing"
                  @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
                />
              </h2>

              <!-- 关键洞察：紧挨标题下方全宽展示（优先于正文卡片） -->
              <div
                v-if="slide.key_insight"
                class="ppt-content-insight ppt-content-insight--page-callout"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path
                    d="M12 2a7 7 0 0 1 4 12.7V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.3A7 7 0 0 1 12 2z"
                  />
                  <line x1="9" y1="21" x2="15" y2="21" />
                </svg>
                <PptMarkdownInline
                  class="ppt-content-insight-text"
                  :text="slide.key_insight || ''"
                  :editable="isEditing"
                  @blur="onCellBlur($event, `slides.${currentSlide}.key_insight`)"
                />
              </div>

              <div
                v-if="slide.subtitle && shouldShowMetricCardsPrimaryGrid(slide)"
                class="ppt-chart-subtitle"
              >
                <PptMarkdownInline
                  :text="slide.subtitle || ''"
                  :editable="isEditing"
                  @blur="onCellBlur($event, `slides.${currentSlide}.subtitle`)"
                />
              </div>

              <!-- KPI 卡：metric_cards_row（无 table/chart 时主视觉；有时为上方 KPI 条） -->
              <div
                v-if="shouldShowMetricCardsPrimaryGrid(slide)"
                class="ppt-metric-cards-fullpage"
                :class="{ 'ppt-metric-cards-fullpage--active': shouldFillMetricCards(slide) }"
              >
                <PptMetricCardsRow
                  :cards="slide.metric_cards ?? []"
                  :primary="shouldUsePrimaryMetricCards(slide)"
                  :fill="shouldFillMetricCards(slide)"
                  :page-references="slide.page_references"
                  :card-style="metricCardStyle"
                  :value-style="metricCardValueStyle"
                  @ref-click="onPptTableRefClick($event, slide)"
                />
              </div>

              <!-- 顶部 hero KPI（单 hero，非 hero_left / 非 metric_cards） -->
              <div
                v-if="shouldShowHeroMetricBanner(slide)"
                class="ppt-hero-metric ppt-content-hero-metric"
                :style="heroMetricStyle(slide.hero_metric)"
              >
                <div
                  v-if="slide.hero_metric?.value"
                  class="ppt-hero-metric-value"
                  :contenteditable="isEditing"
                  @blur="onHeroMetricBlur($event, currentSlide, 'value')"
                >
                  {{ slide.hero_metric.value }}
                </div>
                <PptMarkdownInline
                  v-if="slide.hero_metric?.caption"
                  class="ppt-hero-metric-caption"
                  :text="slide.hero_metric.caption"
                  :page-references="slide.page_references"
                  :editable="isEditing"
                  @blur="onHeroMetricBlur($event, currentSlide, 'caption')"
                  @ref-click="onPptTableRefClick($event, slide)"
                />
              </div>

              <!-- hero_left：左大数 + 右列表（与 metric_cards_row 互斥，不再渲染 content 要点） -->
              <div
                v-if="isHeroLeftSlide(slide)"
                class="ppt-content-split ppt-content-items-split ppt-hero-left-split"
              >
                <div class="ppt-content-left ppt-hero-left-panel">
                  <div
                    class="ppt-hero-metric ppt-content-hero-metric"
                    :style="heroMetricStyle(slide.hero_metric)"
                  >
                    <div
                      v-if="slide.hero_metric?.value"
                      class="ppt-hero-metric-value"
                      :contenteditable="isEditing"
                      @blur="onHeroMetricBlur($event, currentSlide, 'value')"
                    >
                      {{ slide.hero_metric.value }}
                    </div>
                    <PptMarkdownInline
                      v-if="slide.hero_metric?.caption"
                      class="ppt-hero-metric-caption"
                      :text="slide.hero_metric.caption"
                      :page-references="slide.page_references"
                      :editable="isEditing"
                      @blur="onHeroMetricBlur($event, currentSlide, 'caption')"
                      @ref-click="onPptTableRefClick($event, slide)"
                    />
                  </div>
                </div>
                <div
                  class="ppt-content-right ppt-hero-right-items"
                  v-bind="classicHeroRightColumnTypography(slide, heroLeftContentRightItems(slide))"
                >
                  <template v-if="slide.right_items?.length">
                    <div
                      v-for="(ri, idx) in slide.right_items"
                      :key="'hl-ri-' + idx"
                      class="ppt-hero-right-card"
                      :style="heroRightCardStyle(ri, idx)"
                    >
                      <div class="ppt-hero-right-card-head">
                        <span
                          class="ppt-hero-right-card-index"
                          :style="{ color: rightItemAccentColor(ri, idx) }"
                          :contenteditable="isEditing"
                          @blur="onRightItemFieldBlur($event, currentSlide, idx, 'index')"
                          >{{ formatRightItemIndex(ri, idx) }}</span
                        >
                        <PptMarkdownInline
                          class="ppt-hero-right-card-title"
                          :text="rightItemTitle(ri)"
                          :editable="isEditing"
                          @blur="onRightItemFieldBlur($event, currentSlide, idx, 'title')"
                        />
                      </div>
                      <PptMarkdownInline
                        v-if="rightItemDescription(ri) || isEditing"
                        class="ppt-hero-right-card-desc"
                        :text="rightItemDescription(ri)"
                        :editable="isEditing"
                        @blur="onRightItemFieldBlur($event, currentSlide, idx, 'description')"
                      />
                    </div>
                  </template>
                  <template v-else>
                    <PptMetricCardsRow
                      v-if="shouldShowHeroLeftMetricCards(slide)"
                      :cards="slide.metric_cards ?? []"
                      column
                      :page-references="slide.page_references"
                      :card-style="metricCardStyle"
                      :value-style="metricCardValueStyle"
                      @ref-click="onPptTableRefClick($event, slide)"
                    />
                    <PptTableBlock
                      v-else-if="shouldShowHeroLeftTable(slide) && slide.table"
                      :table="slide.table"
                      :page-references="slide.page_references"
                      @ref-click="onPptTableRefClick($event, slide)"
                    />
                    <template v-if="shouldShowHeroLeftContentItems(slide)">
                      <div
                        v-for="(ri, idx) in heroLeftContentRightItems(slide)"
                        :key="'hl-fb-' + idx"
                        class="ppt-hero-right-card"
                        :class="{ 'ppt-hero-right-card--after-metrics': shouldShowHeroLeftMetricCards(slide) }"
                        :style="heroRightCardStyle(ri, idx)"
                      >
                        <div class="ppt-hero-right-card-head">
                          <span
                            class="ppt-hero-right-card-index"
                            :style="{ color: rightItemAccentColor(ri, idx) }"
                            >{{ formatRightItemIndex(ri, idx) }}</span
                          >
                          <PptMarkdownInline
                            class="ppt-hero-right-card-title"
                            :text="rightItemTitle(ri)"
                            :page-references="slide.page_references"
                            @ref-click="onPptTableRefClick($event, slide)"
                          />
                        </div>
                        <PptMarkdownInline
                          v-if="rightItemDescription(ri)"
                          class="ppt-hero-right-card-desc"
                          :text="rightItemDescription(ri)"
                          :page-references="slide.page_references"
                          @ref-click="onPptTableRefClick($event, slide)"
                        />
                      </div>
                    </template>
                  </template>
                </div>
              </div>

              <!-- ════ 有表格/图表时：左右分栏布局 ════ -->
              <div
                v-else-if="hasBodyPrimaryVisual(slide)"
                class="ppt-content-split"
                :class="{
                  'ppt-content-split--table-chart-dual':
                    hasTableAndChart(slide) && !shouldShowContentBullets(slide),
                  'ppt-content-split--table-chart-with-bullets':
                    hasTableAndChart(slide) && shouldShowContentBullets(slide),
                  'ppt-content-chart-only':
                    hasBodyPrimaryVisual(slide) && !shouldShowContentBullets(slide),
                }"
              >
                <!-- 左栏：文字要点 -->
                <div
                  v-if="shouldShowContentBullets(slide)"
                  class="ppt-content-left"
                  v-bind="classicContentPointsTypography(resolveSlideBulletItems(slide))"
                >
                  <div
                    v-for="(item, bi) in resolveSlideBulletItems(slide)"
                    :key="'tc' + bi"
                    class="ppt-content-point"
                  >
                    <div class="ppt-content-point-header">
                      <span class="ppt-content-point-icon">
                        <svg
                          v-if="bi % 4 === 0"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <line x1="18" y1="20" x2="18" y2="10" />
                          <line x1="12" y1="20" x2="12" y2="4" />
                          <line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                        <svg
                          v-else-if="bi % 4 === 1"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <svg
                          v-else-if="bi % 4 === 2"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                          <polyline points="17 6 23 6 23 12" />
                        </svg>
                        <svg
                          v-else
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                      </span>
                      <PptMarkdownInline
                        class="ppt-content-point-title"
                        :text="contentPointTitle(item)"
                        :editable="isEditing"
                        @blur="onContentItemBlur($event, currentSlide, bi)"
                      />
                    </div>
                    <PptMarkdownInline
                      v-if="hasContentPointBody(item)"
                      class="ppt-content-point-body"
                      :text="parseContentBody(item)"
                      :editable="isEditing"
                      @blur="onContentItemBlur($event, currentSlide, bi)"
                    />
                  </div>
                </div>
                <!-- 右栏：图表 + 表格（可同时存在） -->
                <div class="ppt-content-right">
                  <div v-if="slide.chart" class="ppt-content-chart-wrap">
                    <div class="ppt-chart-title">{{ slide.chart.title }}</div>
                    <div v-if="slide.chart.note" class="ppt-chart-note">
                      {{ slide.chart.note }}
                    </div>
                    <PptChartSourceLine
                      :chart="slide.chart"
                      :page-references="slide.page_references"
                    />
                    <!-- 折线图 line -->
                    <div v-if="slide.chart.type === 'line'" class="ppt-line-chart-wrap">
                      <!-- 图例 -->
                      <div v-if="lineChartLegendItems.length" class="ppt-line-legend">
                        <span
                          v-for="(sn, si) in lineChartLegendItems"
                          :key="'sleg' + si"
                          class="ppt-line-legend-item"
                        >
                          <span
                            class="ppt-line-legend-dot"
                            :style="{ background: getSeriesColor(si) }"
                          ></span>
                          {{ sn }}
                        </span>
                      </div>
                      <svg
                        class="ppt-chart-svg"
                        :viewBox="LINE_CHART_VIEWBOX"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        <text
                          v-if="slide.chart.y_label"
                          :x="LINE_CHART_Y_AXIS_LABEL_X"
                          :y="LINE_CHART_Y_AXIS_LABEL_Y"
                          class="ppt-axis-label"
                          text-anchor="middle"
                          :transform="`rotate(-90, ${LINE_CHART_Y_AXIS_LABEL_X}, ${LINE_CHART_Y_AXIS_LABEL_Y})`"
                        >
                          {{ slide.chart.y_label }}
                        </text>
                        <text
                          v-if="slide.chart.x_label"
                          x="265"
                          :y="LINE_CHART_X_AXIS_LABEL_Y"
                          class="ppt-axis-label"
                          text-anchor="middle"
                        >
                          {{ slide.chart.x_label }}
                        </text>
                        <!-- Y轴刻度 -->
                        <template v-for="(tick, ti) in getLineYTicks()" :key="'lyt1' + ti">
                          <text
                            x="48"
                            :y="mapLineY(tick) + 4"
                            class="ppt-chart-label"
                            text-anchor="end"
                          >
                            {{ formatTickValue(tick) }}
                          </text>
                          <line
                            x1="52"
                            :y1="mapLineY(tick)"
                            x2="460"
                            :y2="mapLineY(tick)"
                            stroke="var(--ppt-chart-grid)"
                            stroke-width="0.5"
                          />
                        </template>
                        <template v-if="isMultiSeriesLine">
                          <template
                            v-for="(s, si) in lineChartSeriesList"
                            :key="'cml' + si"
                          >
                            <polyline
                              :points="lineSeriesPoints(si)"
                              class="ppt-polyline"
                              fill="none"
                              :style="chartStrokeStyle(si)"
                            />
                          </template>
                          <template
                            v-for="(cat, ci) in lineChartCategories"
                            :key="'clx' + ci"
                          >
                            <text
                              :x="lineCategoryLabelX(ci)"
                              :y="
                                shouldRotateLabels
                                  ? LINE_CHART_X_CAT_Y_ROTATED
                                  : LINE_CHART_X_CAT_Y
                              "
                              class="ppt-chart-label"
                              :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                              :transform="
                                shouldRotateLabels
                                  ? `rotate(-45, ${lineCategoryLabelX(ci)}, ${LINE_CHART_X_CAT_Y_ROTATED})`
                                  : undefined
                              "
                              :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                            >
                              {{ cat }}
                            </text>
                          </template>
                          <template
                            v-for="(s, si) in lineChartSeriesList"
                            :key="'cld' + si"
                          >
                            <circle
                              v-for="(cat, ci) in lineChartCategories"
                              :key="'cld' + si + '-' + ci"
                              :cx="lineCategoryLabelX(ci)"
                              :cy="mapLineY(lineSeriesValue(ci, si))"
                              r="4"
                              class="ppt-line-dot"
                              :style="chartFillStyle(si)"
                            />
                          </template>
                        </template>
                        <template v-else>
                        <!-- 主线 -->
                        <polyline
                          :points="linePoints"
                          class="ppt-polyline"
                          fill="none"
                          :style="chartStrokeStyle(0)"
                        />
                        <!-- 副线 (secondary) -->
                        <polyline
                          v-if="multiLinePoints.secondary"
                          :points="multiLinePoints.secondary"
                          class="ppt-polyline ppt-line-secondary"
                          fill="none"
                          :style="chartStrokeStyle(1)"
                        />
                        <!-- 第三条线 (tertiary) -->
                        <polyline
                          v-if="multiLinePoints.tertiary"
                          :points="multiLinePoints.tertiary"
                          class="ppt-polyline ppt-line-tertiary"
                          fill="none"
                          :style="chartStrokeStyle(2)"
                        />
                        <template v-for="(d, di) in slide.chart.data" :key="'cl' + di">
                          <circle
                            :cx="55 + di * (400 / (slide.chart.data.length - 1))"
                            :cy="mapLineY(d.value)"
                            r="4"
                            class="ppt-line-dot"
                            :style="chartFillStyle(0)"
                          />
                          <text
                            :x="55 + di * (400 / (slide.chart.data.length - 1))"
                            :y="
                              shouldRotateLabels
                                ? LINE_CHART_X_CAT_Y_ROTATED
                                : LINE_CHART_X_CAT_Y
                            "
                            class="ppt-chart-label"
                            :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                            :transform="
                              shouldRotateLabels
                                ? `rotate(-45, ${
                                    55 + di * (400 / (slide.chart.data.length - 1))
                                  }, ${LINE_CHART_X_CAT_Y_ROTATED})`
                                : undefined
                            "
                            :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                          >
                            {{ d.label }}
                          </text>
                        </template>
                        </template>
                      </svg>
                    </div>
                    <!-- 普通/分组柱状图 bar -->
                    <template v-else-if="slide.chart.type === 'bar'">
                      <!-- 分组柱状图（带 categories + values） -->
                      <div v-if="isGroupedBar" class="ppt-grouped-bar-wrap">
                        <div
                          class="ppt-grouped-bar-legend"
                          v-if="groupedBarSeriesList.length"
                        >
                          <span
                            v-for="(s, si) in groupedBarSeriesList"
                            :key="'gbl' + si"
                            class="ppt-grouped-bar-legend-item"
                          >
                            <span
                              class="ppt-pie-dot"
                              :style="{ background: getSeriesColor(si) }"
                            ></span>
                            {{ groupedBarSeriesLabel(s) }}
                          </span>
                        </div>
                        <svg
                          class="ppt-chart-svg"
                          viewBox="0 0 500 260"
                          preserveAspectRatio="xMidYMid meet"
                        >
                          <text
                            v-if="slide.chart.y_label"
                            x="10"
                            y="110"
                            class="ppt-axis-label"
                            text-anchor="middle"
                            transform="rotate(-90, 10, 110)"
                          >
                            {{ slide.chart.y_label }}
                          </text>
                          <text
                            v-if="slide.chart.x_label"
                            x="260"
                            y="252"
                            class="ppt-axis-label"
                            text-anchor="middle"
                          >
                            {{ slide.chart.x_label }}
                          </text>
                          <!-- Y轴刻度数值 (分组柱状图) -->
                          <template v-for="(tick, ti) in getBarYTicks()" :key="'gyt' + ti">
                            <text
                              x="48"
                              :y="mapBarY(tick) + 4"
                              class="ppt-chart-label"
                              text-anchor="end"
                            >
                              {{ formatTickValue(tick) }}
                            </text>
                            <line
                              x1="52"
                              :y1="mapBarY(tick)"
                              x2="460"
                              :y2="mapBarY(tick)"
                              stroke="var(--ppt-chart-grid)"
                              stroke-width="0.5"
                            />
                          </template>
                          <line
                            v-if="barChartYRange.min < 0"
                            x1="52"
                            :y1="barZeroY"
                            x2="460"
                            :y2="barZeroY"
                            stroke="var(--ppt-chart-zero-line)"
                            stroke-width="1"
                          />
                          <template
                            v-for="(cat, ci) in groupedBarCategories"
                            :key="'gb-cat-' + ci"
                          >
                            <template
                              v-for="(s, si) in groupedBarSeriesList"
                              :key="'gb-bar-' + ci + '-' + si"
                            >
                              <rect
                                :x="groupedBarRectX(ci, si)"
                                :y="
                                  Math.min(mapBarY(groupedBarValue(ci, si)), barZeroY)
                                "
                                :width="groupedBarRectWidth()"
                                :height="
                                  Math.max(
                                    1,
                                    Math.abs(mapBarY(groupedBarValue(ci, si)) - barZeroY)
                                  )
                                "
                                :style="groupedBarRectStyle(si, groupedBarValue(ci, si))"
                                :class="[
                                  'ppt-bar-rect',
                                  groupedBarValue(ci, si) < 0 ? 'ppt-bar-negative' : '',
                                ]"
                                rx="2"
                              />
                            </template>
                            <text
                              :x="groupedBarCategoryLabelX(ci)"
                              :y="shouldRotateLabels ? BAR_CHART_X_CAT_Y_ROTATED : BAR_CHART_X_CAT_Y"
                              class="ppt-chart-label"
                              :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                              :transform="
                                shouldRotateLabels
                                  ? chartXCatLabelTransform(
                                      groupedBarCategoryLabelX(ci),
                                      BAR_CHART_X_CAT_Y_ROTATED
                                    )
                                  : undefined
                              "
                              :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                            >
                              {{ cat }}
                            </text>
                          </template>
                        </svg>
                      </div>
                      <!-- 普通单系列柱状图 -->
                      <svg
                        v-else
                        class="ppt-chart-svg"
                        viewBox="0 0 500 260"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        <text
                          v-if="slide.chart.y_label"
                          x="10"
                          y="110"
                          class="ppt-axis-label"
                          text-anchor="middle"
                          transform="rotate(-90, 10, 110)"
                        >
                          {{ slide.chart.y_label }}
                        </text>
                        <text
                          v-if="slide.chart.x_label"
                          x="260"
                          y="252"
                          class="ppt-axis-label"
                          text-anchor="middle"
                        >
                          {{ slide.chart.x_label }}
                        </text>
                        <!-- Y轴刻度数值 -->
                        <template v-for="(tick, ti) in getBarYTicks()" :key="'yt' + ti">
                          <text
                            x="48"
                            :y="mapBarY(tick) + 4"
                            class="ppt-chart-label"
                            text-anchor="end"
                          >
                            {{ formatTickValue(tick) }}
                          </text>
                          <line
                            x1="52"
                            :y1="mapBarY(tick)"
                            x2="460"
                            :y2="mapBarY(tick)"
                            stroke="var(--ppt-chart-grid)"
                            stroke-width="0.5"
                          />
                        </template>
                        <!-- 零线 -->
                        <line
                          v-if="barChartYRange.min < 0"
                          x1="52"
                          :y1="barZeroY"
                          x2="460"
                          :y2="barZeroY"
                          stroke="var(--ppt-chart-zero-line)"
                          stroke-width="1"
                        />
                        <template v-for="(d, di) in slide.chart.data" :key="'cb' + di">
                          <rect
                            :x="55 + di * (400 / slide.chart.data.length)"
                            :y="Math.min(mapBarY(d.value), barZeroY)"
                            :width="(400 / slide.chart.data.length) * 0.65"
                            :height="Math.max(1, Math.abs(mapBarY(d.value) - barZeroY))"
                            :class="['ppt-bar-rect', d.value < 0 ? 'ppt-bar-negative' : '']"
                            rx="3"
                          />
                          <!-- 柱子上方/下方显示数值 -->
                          <text
                            :x="
                              55 +
                              di * (400 / slide.chart.data.length) +
                              (400 / slide.chart.data.length) * 0.325
                            "
                            :y="
                              d.value >= 0
                                ? mapBarY(d.value) - 5
                                : mapBarY(d.value) +
                                  Math.abs(mapBarY(d.value) - barZeroY) +
                                  12
                            "
                            class="ppt-chart-label"
                            text-anchor="middle"
                            fill="var(--ppt-chart-value)"
                          >
                            {{ formatTickValue(d.value) }}
                          </text>
                          <text
                            :x="
                              55 +
                              di * (400 / slide.chart.data.length) +
                              (400 / slide.chart.data.length) * 0.3
                            "
                            :y="shouldRotateLabels ? BAR_CHART_X_CAT_Y_ROTATED : BAR_CHART_X_CAT_Y"
                            class="ppt-chart-label"
                            :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                            :transform="
                              shouldRotateLabels
                                ? chartXCatLabelTransform(
                                    55 +
                                      di * (400 / slide.chart.data.length) +
                                      (400 / slide.chart.data.length) * 0.3,
                                    BAR_CHART_X_CAT_Y_ROTATED
                                  )
                                : undefined
                            "
                            :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                          >
                            {{ d.label }}
                          </text>
                        </template>
                      </svg>
                    </template>
                    <!-- 面积图 area -->
                    <svg
                      v-else-if="slide.chart.type === 'area'"
                      class="ppt-chart-svg"
                      :viewBox="LINE_CHART_VIEWBOX"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <text
                        v-if="slide.chart.y_label"
                        :x="LINE_CHART_Y_AXIS_LABEL_X"
                        :y="LINE_CHART_Y_AXIS_LABEL_Y"
                        class="ppt-axis-label"
                        text-anchor="middle"
                        :transform="`rotate(-90, ${LINE_CHART_Y_AXIS_LABEL_X}, ${LINE_CHART_Y_AXIS_LABEL_Y})`"
                      >
                        {{ slide.chart.y_label }}
                      </text>
                      <text
                        v-if="slide.chart.x_label"
                        x="265"
                        :y="LINE_CHART_X_AXIS_LABEL_Y"
                        class="ppt-axis-label"
                        text-anchor="middle"
                      >
                        {{ slide.chart.x_label }}
                      </text>
                      <!-- Y轴刻度 -->
                      <template v-for="(tick, ti) in getLineYTicks()" :key="'ayt1' + ti">
                        <text
                          x="48"
                          :y="mapLineY(tick) + 4"
                          class="ppt-chart-label"
                          text-anchor="end"
                        >
                          {{ formatTickValue(tick) }}
                        </text>
                        <line
                          x1="52"
                          :y1="mapLineY(tick)"
                          x2="460"
                          :y2="mapLineY(tick)"
                          stroke="var(--ppt-chart-grid)"
                          stroke-width="0.5"
                        />
                      </template>
                      <polygon :points="areaFillPoints" class="ppt-area-fill" />
                      <polyline
                        :points="linePoints"
                        class="ppt-polyline"
                        fill="none"
                        :style="chartStrokeStyle(0)"
                      />
                      <template v-for="(d, di) in slide.chart.data" :key="'ca' + di">
                        <circle
                          :cx="55 + di * (400 / (slide.chart.data.length - 1))"
                          :cy="mapLineY(d.value)"
                          r="4"
                          class="ppt-line-dot"
                          :style="chartFillStyle(0)"
                        />
                        <text
                          :x="55 + di * (400 / (slide.chart.data.length - 1))"
                          :y="
                            shouldRotateLabels
                              ? LINE_CHART_X_CAT_Y_ROTATED
                              : LINE_CHART_X_CAT_Y
                          "
                          class="ppt-chart-label"
                          :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                          :transform="
                            shouldRotateLabels
                              ? `rotate(-45, ${
                                  55 + di * (400 / (slide.chart.data.length - 1))
                                }, ${LINE_CHART_X_CAT_Y_ROTATED})`
                              : undefined
                          "
                          :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                        >
                          {{ d.label }}
                        </text>
                      </template>
                    </svg>
                    <!-- 组合图 combo -->
                    <svg
                      v-else-if="slide.chart.type === 'combo'"
                      class="ppt-chart-svg"
                      viewBox="0 0 520 240"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <text
                        v-if="slide.chart.y_label"
                        x="10"
                        y="120"
                        class="ppt-axis-label"
                        text-anchor="middle"
                        transform="rotate(-90, 10, 120)"
                      >
                        {{ slide.chart.y_label }}
                      </text>
                      <text
                        v-if="slide.chart.secondary_y_label"
                        x="510"
                        y="120"
                        class="ppt-axis-label ppt-axis-label-secondary"
                        text-anchor="middle"
                        transform="rotate(90, 510, 120)"
                      >
                        {{ slide.chart.secondary_y_label }}
                      </text>
                      <text
                        v-if="slide.chart.x_label"
                        x="275"
                        :y="COMBO_CHART_X_AXIS_LABEL_Y"
                        class="ppt-axis-label"
                        text-anchor="middle"
                      >
                        {{ slide.chart.x_label }}
                      </text>
                      <!-- Y轴刻度（主轴） -->
                      <template v-for="(tick, ti) in getBarYTicks()" :key="'coyt1' + ti">
                        <text
                          x="48"
                          :y="mapBarY(tick) + 4"
                          class="ppt-chart-label"
                          text-anchor="end"
                        >
                          {{ formatTickValue(tick) }}
                        </text>
                        <line
                          x1="52"
                          :y1="mapBarY(tick)"
                          x2="460"
                          :y2="mapBarY(tick)"
                          stroke="var(--ppt-chart-grid)"
                          stroke-width="0.5"
                        />
                      </template>
                      <!-- 零线 -->
                      <line
                        v-if="barChartYRange.min < 0"
                        x1="52"
                        :y1="barZeroY"
                        x2="460"
                        :y2="barZeroY"
                        stroke="var(--ppt-chart-zero-line)"
                        stroke-width="1"
                      />
                      <template v-for="(pt, pi) in comboPrimaryPoints" :key="'ccp' + pi">
                        <rect
                          :x="pt.x"
                          :y="pt.y"
                          :width="pt.w"
                          :height="pt.h"
                          :class="['ppt-bar-rect', pt.isNegative ? 'ppt-bar-negative' : '']"
                          rx="2"
                        />
                        <!-- 柱子上方/下方显示数值 -->
                        <text
                          :x="pt.x + pt.w / 2"
                          :y="pt.isNegative ? pt.y + pt.h + 12 : pt.y - 5"
                          class="ppt-chart-label"
                          text-anchor="middle"
                          fill="var(--ppt-chart-value)"
                          style="font-size: 9px"
                        >
                          {{ formatTickValue(pt.value) }}
                        </text>
                        <text
                          :x="pt.x + pt.w / 2"
                          :y="
                            shouldRotateLabels
                              ? LINE_CHART_X_CAT_Y_ROTATED
                              : LINE_CHART_X_CAT_Y
                          "
                          class="ppt-chart-label"
                          :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                          :transform="
                            shouldRotateLabels
                              ? `rotate(-45, ${pt.x + pt.w / 2}, ${LINE_CHART_X_CAT_Y_ROTATED})`
                              : undefined
                          "
                          :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                        >
                          {{ pt.label }}
                        </text>
                      </template>
                      <polyline
                        :points="comboSecondaryLinePoints"
                        class="ppt-polyline ppt-line-secondary"
                        fill="none"
                      />
                      <template v-for="(dot, di) in comboSecondaryDots" :key="'ccd' + di">
                        <circle
                          :cx="dot.cx"
                          :cy="dot.cy"
                          r="4"
                          class="ppt-line-dot ppt-dot-secondary"
                        />
                      </template>
                    </svg>
                    <!-- 堆叠柱状图 stacked_bar -->
                    <div
                      v-else-if="slide.chart.type === 'stacked_bar'"
                      class="ppt-stacked-chart"
                    >
                      <div
                        v-if="slide.chart.x_label || slide.chart.y_label"
                        class="ppt-axis-labels-row"
                      >
                        <span v-if="slide.chart.y_label" class="ppt-axis-label-text"
                          >Y: {{ slide.chart.y_label }}</span
                        >
                        <span v-if="slide.chart.x_label" class="ppt-axis-label-text"
                          >X: {{ slide.chart.x_label }}</span
                        >
                      </div>
                      <div
                        class="ppt-stacked-legend"
                        v-if="getStackedBarCategoryLabels(slide.chart).length"
                      >
                        <span
                          v-for="(cat, ci) in getStackedBarCategoryLabels(slide.chart)"
                          :key="'csc' + ci"
                          class="ppt-stacked-legend-item"
                        >
                          <span
                            class="ppt-pie-dot"
                            :style="{ background: getSeriesColor(ci) }"
                          ></span
                          >{{ cat }}
                        </span>
                      </div>
                      <div
                        v-for="(d, di) in slide.chart.data"
                        :key="'csb' + di"
                        class="ppt-stacked-row"
                      >
                        <span class="ppt-stacked-label">{{ d.label }}</span>
                        <div class="ppt-stacked-bar-track">
                          <div
                            v-for="(v, vi) in getStackedBarRowValues(d)"
                            :key="'csv' + vi"
                            class="ppt-stacked-segment"
                            :style="{
                              width: (v / stackedBarMax) * 100 + '%',
                              background: getSeriesColor(vi),
                            }"
                            :title="stackedBarSegmentTitle(slide.chart, vi, v)"
                          >
                            <span v-if="v > 5" class="ppt-stacked-seg-text">{{
                              formatStackedBarSegmentLabel(slide.chart, v)
                            }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <!-- 水平柱状图 horizontal_bar -->
                    <svg
                      v-else-if="slide.chart.type === 'horizontal_bar'"
                      class="ppt-chart-svg ppt-chart-svg-hbar"
                      :viewBox="`0 0 ${HBAR_LAYOUT.viewW} ${horizontalBarViewBoxHeight(
                        slide.chart.data.length,
                        HBAR_LAYOUT.rowH
                      )}`"
                      preserveAspectRatio="xMinYMid meet"
                    >
                      <text
                        v-if="slide.chart.x_label"
                        :x="HBAR_LAYOUT.viewW / 2"
                        :y="
                          horizontalBarViewBoxHeight(
                            slide.chart.data.length,
                            HBAR_LAYOUT.rowH
                          ) - 4
                        "
                        class="ppt-axis-label"
                        text-anchor="middle"
                      >
                        {{ slide.chart.x_label }}
                      </text>
                      <template v-for="(d, di) in slide.chart.data" :key="'cc' + di">
                        <text
                          :x="HBAR_LAYOUT.labelX"
                          :y="12 + di * HBAR_LAYOUT.rowH + 10"
                          class="ppt-chart-label"
                          text-anchor="end"
                        >
                          {{ d.label }}
                        </text>
                        <rect
                          :x="HBAR_LAYOUT.barX"
                          :y="12 + di * HBAR_LAYOUT.rowH"
                          :width="
                            horizontalBarWidthPx(
                              d.value,
                              maxChartValue,
                              HBAR_LAYOUT.barMaxW,
                              slide.chart
                            )
                          "
                          height="18"
                          :class="['ppt-bar-rect', d.value < 0 ? 'ppt-bar-negative' : '']"
                          rx="3"
                        />
                        <text
                          :x="
                            horizontalBarValueTextX(
                              HBAR_LAYOUT.barX,
                              horizontalBarWidthPx(
                                d.value,
                                maxChartValue,
                                HBAR_LAYOUT.barMaxW,
                                slide.chart
                              ),
                              HBAR_LAYOUT.valueGap
                            )
                          "
                          :y="12 + di * HBAR_LAYOUT.rowH + 13"
                          class="ppt-chart-value-label"
                        >
                          {{ formatChartDataValue(d.value) }}
                        </text>
                      </template>
                    </svg>
                    <!-- 饼图 pie -->
                    <svg
                      v-else-if="slide.chart.type === 'pie'"
                      class="ppt-chart-svg ppt-pie-svg"
                      :viewBox="`0 0 ${PIE_CHART_LAYOUT.viewW} ${PIE_CHART_LAYOUT.viewH}`"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <template v-for="(sl, si) in pieSlices" :key="'cp' + si">
                        <path :d="sl.path" :fill="sl.color" opacity="0.88" />
                        <line
                          :x1="sl.leaderX1"
                          :y1="sl.leaderY1"
                          :x2="sl.lx"
                          :y2="sl.ly"
                          class="ppt-pie-leader"
                        />
                        <text
                          :x="sl.tx"
                          :y="sl.ty"
                          :text-anchor="sl.anchor"
                          class="ppt-pie-label"
                          dominant-baseline="middle"
                        >
                          {{ sl.percent }}%
                        </text>
                      </template>
                      <!-- 图例 -->
                      <template v-for="(sl, si) in pieSlices" :key="'cpl' + si">
                        <rect
                          :x="PIE_CHART_LAYOUT.legendX"
                          :y="10 + si * 20"
                          width="10"
                          height="10"
                          :fill="sl.color"
                          rx="2"
                        />
                        <text
                          :x="PIE_CHART_LAYOUT.legendTextX"
                          :y="10 + si * 20 + 9"
                          class="ppt-pie-legend-text"
                        >
                          {{ sl.label }}
                        </text>
                      </template>
                    </svg>
                    <!-- 雷达图 radar（支持新旧两种格式） -->
                    <div
                      v-else-if="slide.chart.type === 'radar'"
                      class="ppt-radar-chart-wrap"
                    >
                      <div v-if="radarSeriesNorm.length > 1" class="ppt-radar-legend">
                        <span
                          v-for="s in radarSeriesNorm"
                          :key="s.name"
                          class="ppt-radar-legend-item"
                        >
                          <span
                            class="ppt-radar-legend-dot"
                            :style="{ background: s.color }"
                          ></span>
                          {{ s.name }}
                        </span>
                      </div>
                      <svg class="ppt-chart-svg ppt-radar-svg" viewBox="0 0 280 220">
                        <polygon
                          v-for="(ring, ri) in radarGridPolygons"
                          :key="'crg' + ri"
                          :points="ring.points"
                          class="ppt-radar-grid"
                        />
                        <line
                          v-for="(ax, ai) in radarAxes"
                          :key="'cra' + ai"
                          :x1="120"
                          :y1="90"
                          :x2="ax.x"
                          :y2="ax.y"
                          class="ppt-radar-axis"
                        />
                        <text
                          v-for="(ring, ri) in radarGridPolygons"
                          :key="'crv' + ri"
                          x="124"
                          :y="90 - 64 * ((ri + 1) / radarGridPolygons.length) + 4"
                          class="ppt-radar-tick"
                        >
                          {{ ring.value }}
                        </text>
                        <g v-for="(series, si) in radarSeriesShapes" :key="'crs' + si">
                          <polygon
                            :points="series.points"
                            class="ppt-radar-series-fill"
                            :style="{ fill: series.color, stroke: series.color }"
                          />
                          <circle
                            v-for="(dot, di) in series.dots"
                            :key="'crd' + si + '-' + di"
                            :cx="dot.x"
                            :cy="dot.y"
                            r="3"
                            :style="{ fill: series.color }"
                          />
                        </g>
                        <text
                          v-for="(ax, ai) in radarAxes"
                          :key="'crl' + ai"
                          :x="ax.tx"
                          :y="ax.ty"
                          :text-anchor="ax.anchor"
                          class="ppt-radar-axis-label"
                          dominant-baseline="middle"
                        >
                          {{ ax.label }}
                        </text>
                      </svg>
                    </div>
                    <!-- 漏斗图 funnel -->
                    <div v-else-if="slide.chart.type === 'funnel'" class="ppt-funnel-chart">
                      <div
                        v-for="(d, di) in slide.chart.data"
                        :key="'cf' + di"
                        class="ppt-funnel-row"
                      >
                        <span class="ppt-funnel-label">{{ funnelItemLabel(d) }}</span>
                        <div class="ppt-funnel-bar-wrap">
                          <div
                            class="ppt-funnel-bar"
                            :style="{
                              width: funnelBarWidthPercent(
                                d.value,
                                maxChartValue,
                                slide.chart
                              ),
                              background: getSeriesColor(di),
                            }"
                          >
                            <span class="ppt-funnel-value">{{
                              formatChartDataValue(d.value)
                            }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <!-- 瀑布图 waterfall -->
                    <svg
                      v-else-if="slide.chart.type === 'waterfall'"
                      class="ppt-chart-svg"
                      :viewBox="LINE_CHART_VIEWBOX"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <text
                        v-if="slide.chart.y_label"
                        x="10"
                        y="120"
                        class="ppt-axis-label"
                        text-anchor="middle"
                        transform="rotate(-90, 10, 120)"
                      >
                        {{ slide.chart.y_label }}
                      </text>
                      <text
                        v-if="slide.chart.x_label"
                        x="265"
                        :y="LINE_CHART_X_AXIS_LABEL_Y"
                        class="ppt-axis-label"
                        text-anchor="middle"
                      >
                        {{ slide.chart.x_label }}
                      </text>
                      <!-- Y轴刻度 -->
                      <template
                        v-for="(tick, ti) in getWaterfallYTicks()"
                        :key="'wfyt1' + ti"
                      >
                        <text
                          x="48"
                          :y="mapWaterfallY(tick) + 4"
                          class="ppt-chart-label"
                          text-anchor="end"
                        >
                          {{ formatTickValue(tick) }}
                        </text>
                        <line
                          x1="52"
                          :y1="mapWaterfallY(tick)"
                          x2="460"
                          :y2="mapWaterfallY(tick)"
                          stroke="var(--ppt-chart-grid)"
                          stroke-width="0.5"
                        />
                      </template>
                      <template v-for="(bar, bi) in waterfallBars" :key="'cwf' + bi">
                        <rect
                          :x="55 + bi * (400 / waterfallBars.length) + 4"
                          :y="bar.y"
                          :width="400 / waterfallBars.length - 8"
                          :height="Math.max(2, bar.h)"
                          :class="[
                            'ppt-bar-rect',
                            bar.isTotal
                              ? 'ppt-bar-total'
                              : bar.isNegative
                              ? 'ppt-bar-negative'
                              : '',
                          ]"
                          rx="3"
                          opacity="0.88"
                        />
                        <text
                          :x="
                            55 +
                            bi * (400 / waterfallBars.length) +
                            400 / waterfallBars.length / 2
                          "
                          :y="bar.y - 5"
                          class="ppt-chart-label"
                          text-anchor="middle"
                          style="font-size: 9px"
                        >
                          {{ bar.value }}
                        </text>
                        <text
                          :x="
                            55 +
                            bi * (400 / waterfallBars.length) +
                            400 / waterfallBars.length / 2
                          "
                          :y="shouldRotateLabels ? LINE_CHART_X_CAT_Y_ROTATED : LINE_CHART_X_CAT_Y"
                          class="ppt-chart-label"
                          :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                          :transform="
                            shouldRotateLabels
                              ? chartXCatLabelTransform(
                                  55 +
                                    bi * (400 / waterfallBars.length) +
                                    400 / waterfallBars.length / 2,
                                  LINE_CHART_X_CAT_Y_ROTATED
                                )
                              : undefined
                          "
                          :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                        >
                          {{ bar.label }}
                        </text>
                      </template>
                    </svg>
                    <!-- 散点图 scatter -->
                    <svg
                      v-else-if="slide.chart.type === 'scatter'"
                      class="ppt-chart-svg"
                      :viewBox="LINE_CHART_VIEWBOX"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <!-- Y 轴标签 -->
                      <text
                        v-if="slide.chart.y_label"
                        x="10"
                        y="110"
                        class="ppt-axis-label"
                        text-anchor="middle"
                        transform="rotate(-90, 10, 110)"
                      >
                        {{ slide.chart.y_label }}
                      </text>
                      <!-- X 轴标签 -->
                      <text
                        v-if="slide.chart.x_label"
                        x="255"
                        :y="LINE_CHART_X_AXIS_LABEL_Y"
                        class="ppt-axis-label"
                        text-anchor="middle"
                      >
                        {{ slide.chart.x_label }}
                      </text>
                      <!-- Y 轴网格线 + 刻度 -->
                      <template v-for="(tick, ti) in getScatterYTicks()" :key="'csy' + ti">
                        <line
                          :x1="55"
                          :y1="mapScatterY(tick)"
                          :x2="455"
                          :y2="mapScatterY(tick)"
                          stroke="rgba(255,255,255,0.1)"
                          stroke-width="1"
                        />
                        <text
                          :x="50"
                          :y="mapScatterY(tick) + 3"
                          class="ppt-chart-label"
                          text-anchor="end"
                          style="font-size: 9px"
                        >
                          {{ formatTickValue(tick) }}
                        </text>
                      </template>
                      <!-- X 轴网格线 + 刻度 -->
                      <template v-for="(tick, ti) in getScatterXTicks()" :key="'csx' + ti">
                        <line
                          :x1="mapScatterX(tick)"
                          :y1="25"
                          :x2="mapScatterX(tick)"
                          :y2="195"
                          stroke="rgba(255,255,255,0.1)"
                          stroke-width="1"
                        />
                        <text
                          :x="mapScatterX(tick)"
                          :y="LINE_CHART_X_CAT_Y"
                          class="ppt-chart-label"
                          text-anchor="middle"
                          style="font-size: 9px"
                        >
                          {{ formatTickValue(tick) }}
                        </text>
                      </template>
                      <!-- 数据点 -->
                      <template v-for="(pt, pi) in scatterPoints" :key="'csp' + pi">
                        <circle
                          :cx="pt.svgX"
                          :cy="pt.svgY"
                          r="5"
                          :fill="pt.color"
                          fill-opacity="0.8"
                          stroke="#fff"
                          stroke-width="0.5"
                        />
                        <text
                          :x="pt.svgX"
                          :y="pt.svgY - 8"
                          class="ppt-chart-label"
                          text-anchor="middle"
                          style="font-size: 8px"
                        >
                          {{ pt.label }}
                        </text>
                      </template>
                    </svg>
                    <!-- 热力图 heatmap -->
                    <svg
                      v-else-if="slide.chart.type === 'heatmap'"
                      class="ppt-chart-svg"
                      :viewBox="LINE_CHART_VIEWBOX"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <text
                        v-if="slide.chart.y_label"
                        x="8"
                        y="110"
                        class="ppt-axis-label"
                        text-anchor="middle"
                        transform="rotate(-90, 8, 110)"
                      >
                        {{ slide.chart.y_label }}
                      </text>
                      <text
                        v-if="slide.chart.x_label"
                        x="260"
                        :y="LINE_CHART_X_AXIS_LABEL_Y"
                        class="ppt-axis-label"
                        text-anchor="middle"
                      >
                        {{ slide.chart.x_label }}
                      </text>
                      <!-- 列标签 -->
                      <text
                        v-for="(col, ci) in heatmapParsed?.cols || []"
                        :key="'chc' + ci"
                        :x="
                          60 +
                          ci * (400 / (heatmapParsed?.cols?.length || 1)) +
                          400 / (heatmapParsed?.cols?.length || 1) / 2
                        "
                        y="20"
                        class="ppt-chart-label"
                        text-anchor="middle"
                        style="font-size: 9px"
                      >
                        {{ col }}
                      </text>
                      <!-- 行标签 -->
                      <text
                        v-for="(row, ri) in heatmapParsed?.rows || []"
                        :key="'chr' + ri"
                        x="56"
                        :y="
                          25 +
                          ri * (175 / (heatmapParsed?.rows?.length || 1)) +
                          175 / (heatmapParsed?.rows?.length || 1) / 2 +
                          3
                        "
                        class="ppt-chart-label"
                        text-anchor="end"
                        style="font-size: 9px"
                      >
                        {{ row }}
                      </text>
                      <!-- 色块 + 数值 -->
                      <template v-for="(cell, ci) in heatmapCells" :key="'chv' + ci">
                        <rect
                          :x="cell.svgX + 1"
                          :y="cell.svgY + 1"
                          :width="Math.max(cell.width - 2, 1)"
                          :height="Math.max(cell.height - 2, 1)"
                          :fill="cell.color"
                          rx="2"
                          opacity="0.85"
                        />
                        <text
                          :x="cell.svgX + cell.width / 2"
                          :y="cell.svgY + cell.height / 2 + 3"
                          class="ppt-chart-label"
                          text-anchor="middle"
                          style="font-size: 9px; fill: #fff; font-weight: 600"
                        >
                          {{ cell.value }}
                        </text>
                      </template>
                    </svg>
                    <!-- 树形图 treemap -->
                    <svg
                      v-else-if="slide.chart.type === 'treemap'"
                      class="ppt-chart-svg"
                      :viewBox="LINE_CHART_VIEWBOX"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <template v-for="(rect, ri) in treemapRects" :key="'ctr' + ri">
                        <rect
                          :x="rect.x + 1"
                          :y="rect.y + 1"
                          :width="Math.max(rect.width - 2, 1)"
                          :height="Math.max(rect.height - 2, 1)"
                          :fill="rect.color"
                          rx="3"
                          opacity="0.88"
                        />
                        <text
                          v-if="rect.width > 30 && rect.height > 20"
                          :x="rect.x + rect.width / 2"
                          :y="rect.y + rect.height / 2 - 4"
                          class="ppt-chart-label"
                          text-anchor="middle"
                          style="font-size: 10px; fill: #fff; font-weight: 600"
                        >
                          {{ rect.label }}
                        </text>
                        <text
                          v-if="rect.width > 30 && rect.height > 30"
                          :x="rect.x + rect.width / 2"
                          :y="rect.y + rect.height / 2 + 10"
                          class="ppt-chart-label"
                          text-anchor="middle"
                          style="font-size: 9px; fill: rgba(255, 255, 255, 0.7)"
                        >
                          {{ rect.value }} ({{ rect.percent }}%)
                        </text>
                      </template>
                    </svg>
                    <!-- 时间线 timeline -->
                    <div
                      v-else-if="isTimelineChart(slide.chart)"
                      class="ppt-timeline-chart"
                    >
                      <div
                        v-if="
                          slide.chart.x_label ||
                          slide.chart.xLabel ||
                          slide.chart.y_label ||
                          slide.chart.yLabel
                        "
                        class="ppt-timeline-axis-hint"
                      >
                        <span v-if="slide.chart.x_label || slide.chart.xLabel">{{
                          slide.chart.x_label || slide.chart.xLabel
                        }}</span>
                        <template
                          v-if="
                            (slide.chart.x_label || slide.chart.xLabel) &&
                            (slide.chart.y_label || slide.chart.yLabel)
                          "
                        >
                          ·
                        </template>
                        <span v-if="slide.chart.y_label || slide.chart.yLabel">{{
                          slide.chart.y_label || slide.chart.yLabel
                        }}</span>
                      </div>
                      <div
                        v-for="(d, di) in slide.chart.data || []"
                        :key="'tl-m-' + di"
                        class="ppt-timeline-item"
                      >
                        <div class="ppt-timeline-track">
                          <div
                            class="ppt-timeline-dot"
                            :style="{ background: getSeriesColor(di) }"
                          ></div>
                          <div
                            v-if="di < (slide.chart.data?.length || 0) - 1"
                            class="ppt-timeline-line"
                          ></div>
                        </div>
                        <div class="ppt-timeline-body">
                          <div
                            v-if="d.value != null && String(d.value) !== ''"
                            class="ppt-timeline-step"
                          >
                            {{ d.value }}
                          </div>
                          <div class="ppt-timeline-date">{{ d.label }}</div>
                          <div class="ppt-timeline-desc">
                            {{ d.description || d.desc || d.text || d.title || "" }}
                          </div>
                        </div>
                      </div>
                    </div>
                    <!-- 仪表盘图 gauge -->
                    <svg
                      v-else-if="slide.chart.type === 'gauge'"
                      class="ppt-chart-svg ppt-gauge-svg"
                      viewBox="0 0 260 160"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <template v-if="gaugeData">
                        <!-- 背景弧 -->
                        <path
                          :d="gaugeArcPath(1)"
                          fill="none"
                          stroke="rgba(255,255,255,0.12)"
                          stroke-width="16"
                          stroke-linecap="round"
                        />
                        <!-- 数值弧 -->
                        <path
                          :d="gaugeArcPath(gaugeData.ratio)"
                          fill="none"
                          :stroke="gaugeData.color"
                          stroke-width="16"
                          stroke-linecap="round"
                        />
                        <!-- 刻度 -->
                        <template
                          v-for="(tick, ti) in gaugeTickMarks(gaugeData.min, gaugeData.max)"
                          :key="'cgt' + ti"
                        >
                          <line
                            :x1="tick.x1"
                            :y1="tick.y1"
                            :x2="tick.x2"
                            :y2="tick.y2"
                            stroke="rgba(255,255,255,0.3)"
                            stroke-width="1"
                          />
                          <text
                            :x="tick.x2 + (tick.x2 > 130 ? 4 : -4)"
                            :y="tick.y2 + 3"
                            class="ppt-chart-label"
                            :text-anchor="tick.x2 > 130 ? 'start' : 'end'"
                            style="font-size: 8px"
                          >
                            {{ tick.label }}
                          </text>
                        </template>
                        <!-- 中心数值 -->
                        <text
                          x="130"
                          y="115"
                          text-anchor="middle"
                          class="ppt-gauge-value"
                          :fill="gaugeData.color"
                        >
                          {{ gaugeData.value }}{{ gaugeData.unit }}
                        </text>
                        <text x="130" y="135" text-anchor="middle" class="ppt-gauge-label">
                          {{ gaugeData.label }}
                        </text>
                        <!-- 目标线 -->
                        <template v-if="gaugeData.target !== undefined">
                          <line
                            :x1="
                              130 +
                              95 *
                                Math.cos(
                                  Math.PI -
                                    ((gaugeData.target - gaugeData.min) /
                                      (gaugeData.max - gaugeData.min || 1)) *
                                      Math.PI
                                )
                            "
                            :y1="
                              130 +
                              95 *
                                Math.sin(
                                  Math.PI -
                                    ((gaugeData.target - gaugeData.min) /
                                      (gaugeData.max - gaugeData.min || 1)) *
                                      Math.PI
                                )
                            "
                            :x2="
                              130 +
                              108 *
                                Math.cos(
                                  Math.PI -
                                    ((gaugeData.target - gaugeData.min) /
                                      (gaugeData.max - gaugeData.min || 1)) *
                                      Math.PI
                                )
                            "
                            :y2="
                              130 +
                              108 *
                                Math.sin(
                                  Math.PI -
                                    ((gaugeData.target - gaugeData.min) /
                                      (gaugeData.max - gaugeData.min || 1)) *
                                      Math.PI
                                )
                            "
                            stroke="#fff"
                            stroke-width="2"
                          />
                        </template>
                      </template>
                    </svg>
                  </div>
                  <PptTableBlock
                    v-if="slide.table"
                    :table="slide.table"
                    :page-references="slide.page_references"
                    @ref-click="onPptTableRefClick($event, slide)"
                  />
                </div>
              </div>
              <!-- /ppt-content-split (有图表的左右分栏) -->

              <!-- ════ 小卡网格 + 要点并列（无 emphasis_layout、无 table/chart） ════ -->
              <div
                v-else-if="shouldShowMetricCardsCompactGrid(slide) && shouldShowContentBullets(slide)"
                class="ppt-content-split ppt-metric-content-split"
              >
                <div class="ppt-content-left ppt-metric-cards-side">
                  <PptMetricCardsRow
                    :cards="slide.metric_cards ?? []"
                    column
                    :page-references="slide.page_references"
                    :card-style="metricCardStyle"
                    :value-style="metricCardValueStyle"
                    @ref-click="onPptTableRefClick($event, slide)"
                  />
                </div>
                <div class="ppt-content-right">
                  <div
                    v-for="(item, bi) in resolveSlideBulletItems(slide)"
                    :key="'mcsb' + bi"
                    class="ppt-content-point"
                    :style="contentPointStyle(bi)"
                  >
                    <div class="ppt-content-point-header">
                      <span class="ppt-content-point-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                      </span>
                      <PptMarkdownInline
                        class="ppt-content-point-title"
                        :text="contentPointTitle(item)"
                        :editable="isEditing"
                        @blur="onContentItemBlur($event, currentSlide, bi)"
                      />
                    </div>
                    <PptMarkdownInline
                      v-if="hasContentPointBody(item)"
                      class="ppt-content-point-body"
                      :text="parseContentBody(item)"
                      :editable="isEditing"
                      @blur="onContentItemBlur($event, currentSlide, bi)"
                    />
                  </div>
                </div>
              </div>

              <!-- ════ 仅小卡网格（无要点） ════ -->
              <div
                v-else-if="shouldShowMetricCardsCompactGrid(slide)"
                class="ppt-metric-cards-fullpage"
                :class="{ 'ppt-metric-cards-fullpage--active': shouldFillMetricCards(slide) }"
              >
                <PptMetricCardsRow
                  :cards="slide.metric_cards ?? []"
                  :fill="shouldFillMetricCards(slide)"
                  :page-references="slide.page_references"
                  :card-style="metricCardStyle"
                  :value-style="metricCardValueStyle"
                  @ref-click="onPptTableRefClick($event, slide)"
                />
              </div>

              <!-- ════ 单张 KPI 卡 ════ -->
              <div
                v-else-if="shouldShowMetricCardInline(slide)"
                class="ppt-body-inline-metric"
                :class="{
                  'ppt-metric-cards-fullpage ppt-metric-cards-fullpage--active':
                    shouldFillMetricCards(slide),
                }"
              >
                <PptMetricCardsRow
                  :cards="slide.metric_cards ?? []"
                  :inline="!shouldFillMetricCards(slide)"
                  :fill="shouldFillMetricCards(slide)"
                  :page-references="slide.page_references"
                  :card-style="metricCardStyle"
                  :value-style="metricCardValueStyle"
                  @ref-click="onPptTableRefClick($event, slide)"
                />
                <ul
                  v-if="shouldShowContentBullets(slide)"
                  class="ppt-bullet-list ppt-data-notes"
                  v-bind="classicBulletListTypography(slide)"
                >
                  <li
                    v-for="(item, bi) in resolveSlideBulletItems(slide)"
                    :key="'inline-b' + bi"
                    class="ppt-bullet-item"
                  >
                    <span class="ppt-bullet-dot"></span>
                    <PptMarkdownInline
                      :text="displayText(item)"
                      :editable="isEditing"
                      @blur="onContentItemBlur($event, currentSlide, bi)"
                    />
                  </li>
                </ul>
              </div>

              <!-- ════ metric_cards_row 主网格 + 下方要点 ════ -->
              <div
                v-else-if="
                  shouldShowMetricCardsPrimaryGrid(slide) &&
                  (shouldShowContentBullets(slide) ||
                    (shouldShowChapterSideImage(slide) && currentChapterImages.length))
                "
                class="ppt-data-metric-with-image"
                :class="{
                  'ppt-data-metric-with-image--has-image':
                    shouldShowChapterSideImage(slide) && currentChapterImages.length,
                }"
              >
                <ul
                  v-if="shouldShowContentBullets(slide)"
                  class="ppt-bullet-list ppt-data-notes"
                  v-bind="classicBulletListTypography(slide)"
                >
                  <li
                    v-for="(item, bi) in resolveSlideBulletItems(slide)"
                    :key="'pmc-b' + bi"
                    class="ppt-bullet-item"
                  >
                    <span class="ppt-bullet-dot"></span>
                    <PptMarkdownInline
                      :text="displayText(item)"
                      :editable="isEditing"
                      @blur="onContentItemBlur($event, currentSlide, bi)"
                    />
                  </li>
                </ul>
                <PptChapterImages
                  v-if="shouldShowChapterSideImage(slide) && currentChapterImages.length"
                  variant="sidebar"
                  :images="currentChapterImages"
                  :alt-fallback="slide.title"
                />
              </div>

              <!-- ════ 左要点 + 右叙事卡（无图表） ════ -->
              <div
                v-else-if="isContentWithRightItemsSlide(slide)"
                class="ppt-content-split ppt-content-items-split"
              >
                <div
                  class="ppt-content-left"
                  v-bind="classicContentPointsTypography(getContentItems(slide.content))"
                >
                  <div
                    v-for="(item, bi) in getContentItems(slide.content)"
                    :key="'cri' + bi"
                    class="ppt-content-point"
                  >
                    <div class="ppt-content-point-header">
                      <span class="ppt-content-point-icon">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <line x1="18" y1="20" x2="18" y2="10" />
                          <line x1="12" y1="20" x2="12" y2="4" />
                          <line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                      </span>
                      <PptMarkdownInline
                        class="ppt-content-point-title"
                        :text="contentPointTitle(item)"
                        :editable="isEditing"
                        @blur="onContentItemBlur($event, currentSlide, bi)"
                      />
                    </div>
                    <PptMarkdownInline
                      v-if="hasContentPointBody(item)"
                      class="ppt-content-point-body"
                      :text="parseContentBody(item)"
                      :editable="isEditing"
                      @blur="onContentItemBlur($event, currentSlide, bi)"
                    />
                  </div>
                </div>
                <div
                  class="ppt-content-right ppt-hero-right-items"
                  v-bind="classicHeroRightColumnTypography(slide, heroLeftContentRightItems(slide))"
                >
                  <div
                    v-for="(ri, idx) in slide.right_items"
                    :key="'cri-ri-' + idx"
                    class="ppt-hero-right-card"
                    :style="heroRightCardStyle(ri, idx)"
                  >
                    <div class="ppt-hero-right-card-head">
                      <span
                        class="ppt-hero-right-card-index"
                        :style="{ color: rightItemAccentColor(ri, idx) }"
                        :contenteditable="isEditing"
                        @blur="onRightItemFieldBlur($event, currentSlide, idx, 'index')"
                        >{{ formatRightItemIndex(ri, idx) }}</span
                      >
                      <PptMarkdownInline
                        class="ppt-hero-right-card-title"
                        :text="rightItemTitle(ri)"
                        :editable="isEditing"
                        @blur="onRightItemFieldBlur($event, currentSlide, idx, 'title')"
                      />
                    </div>
                    <PptMarkdownInline
                      v-if="rightItemDescription(ri) || isEditing"
                      class="ppt-hero-right-card-desc"
                      :text="rightItemDescription(ri)"
                      :editable="isEditing"
                      @blur="onRightItemFieldBlur($event, currentSlide, idx, 'description')"
                    />
                  </div>
                </div>
              </div>

              <!-- ════ 无图表时：全宽卡片网格（可选章节侧边配图） ════ -->
              <div
                v-else
                class="ppt-content-with-side-image"
                :class="{
                  'ppt-content-with-side-image--has-image':
                    shouldShowChapterSideImage(slide) && currentChapterImages.length,
                }"
              >
                <div
                  class="ppt-topic-grid"
                  :class="{
                    'ppt-topic-grid--stack': resolveSlideBulletItems(slide).length <= 3,
                    'ppt-topic-grid--fill': resolveSlideBulletItems(slide).length >= 2,
                  }"
                  :style="topicGridFillStyle(slide)"
                  v-bind="classicTopicGridTypography(slide)"
                >
                  <div
                    v-for="(item, bi) in resolveSlideBulletItems(slide)"
                    :key="'tc' + bi"
                    class="ppt-topic-card"
                  >
                    <div class="ppt-topic-card-header">
                      <span class="ppt-topic-card-icon">
                        <svg
                          v-if="bi % 4 === 0"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <line x1="18" y1="20" x2="18" y2="10" />
                          <line x1="12" y1="20" x2="12" y2="4" />
                          <line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                        <svg
                          v-else-if="bi % 4 === 1"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <svg
                          v-else-if="bi % 4 === 2"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                          <polyline points="17 6 23 6 23 12" />
                        </svg>
                        <svg
                          v-else
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                      </span>
                      <PptMarkdownInline
                        class="ppt-topic-card-title"
                        :text="contentPointTitle(item)"
                        :editable="isEditing"
                        @blur="onContentItemBlur($event, currentSlide, bi)"
                      />
                    </div>
                    <PptMarkdownInline
                      v-if="hasContentPointBody(item)"
                      class="ppt-topic-card-body"
                      :text="contentPointBody(item)"
                      :editable="isEditing"
                      @blur="onContentItemBlur($event, currentSlide, bi)"
                    />
                  </div>
                </div>
                <PptChapterImages
                  v-if="shouldShowChapterSideImage(slide) && currentChapterImages.length"
                  variant="sidebar"
                  :images="currentChapterImages"
                  :alt-fallback="slide.title"
                />
              </div>

              <div v-if="(slide.sources || []).length > 0" class="ppt-sources">
                <span class="ppt-sources-label">{{ t("agent.pptSources") }}</span>
                <a
                  v-for="(src, si) in slide.sources"
                  :key="si"
                  :href="src.url || src"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="ppt-source-link"
                  >{{ src.title || src }}</a
                >
              </div>
              <!-- 底部总结栏 -->
              <div v-if="getSummaryItem(slide.content)" class="ppt-content-summary">
                <span class="ppt-summary-label">
                  <PptMarkdownInline
                    :text="
                      parseContentHeading(getSummaryItem(slide.content) || '') ||
                      t('agent.pptSummary')
                    "
                  />：
                </span>
                <PptMarkdownInline
                  class="ppt-content-summary-body"
                  :text="parseContentBody(getSummaryItem(slide.content) || '')"
                  :editable="isEditing"
                  @blur="onSummaryContentBlur"
                />
              </div>

              <!-- 页底数据来源 -->
              <PptMarkdownInline
                v-if="slide.data_source_line || isEditing"
                class="ppt-data-source-line ppt-content-footer-source"
                :text="slide.data_source_line || ''"
                :page-references="slide.page_references"
                :editable="isEditing"
                @blur="onDataSourceLineBlur($event, currentSlide)"
                @ref-click="onPptTableRefClick($event, slide)"
              />
              <div v-if="currentBrandFooter" class="ppt-brand-footer">{{ currentBrandFooter }}</div>
            </div>

            <!-- two_column 双栏对比 -->
            <div
              v-else-if="slide.layout === 'two_column'"
              class="ppt-slide ppt-two-col"
              :class="{
                'ppt-chapter-image-page': isChapterImagePage(slide),
                'ppt-document-figure-page': hasDocumentFigurePage(slide),
              }"
              :style="twoColumnSlideBackgroundStyle"
            >
              <div v-if="twoColumnBackdropUrl" class="ppt-slide-bg-overlay"></div>
              <div
                v-if="isChapterImagePage(slide) && !twoColumnBackdropUrl"
                class="ppt-cover-skyline ppt-scenic-skyline"
                v-html="chapterImagePageDecorationSvg"
              />
              <h2 class="ppt-slide-title">
                <PptMarkdownInline
                  :text="slide.title || ''"
                  :editable="isEditing"
                  @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
                />
              </h2>
              <div
                v-if="slide.subtitle"
                class="ppt-chart-subtitle ppt-chapter-image-page-sub"
              >
                <PptMarkdownInline
                  :text="slide.subtitle || ''"
                  :editable="isEditing"
                  @blur="onCellBlur($event, `slides.${currentSlide}.subtitle`)"
                />
              </div>
              <div
                class="ppt-two-col-body"
                :class="{
                  'ppt-chapter-image-page-body': isChapterImagePage(slide),
                  'ppt-document-figure-page-body': hasDocumentFigurePage(slide),
                }"
                :style="documentFigureColumnStyle(slide)"
              >
                <template v-if="hasDocumentFigurePage(slide)">
                  <div class="ppt-col">
                    <div
                      class="ppt-col-header"
                      :contenteditable="isEditing"
                      @blur="onCellBlur($event, `slides.${currentSlide}.left_title`)"
                    >
                      {{ slide.left_title || t("agent.pptLeftColumn") }}
                    </div>
                    <ul v-if="documentFigureLeftItems(slide).length" class="ppt-bullet-list">
                      <li
                        v-for="(item, li) in documentFigureLeftItems(slide)"
                        :key="'doc-l' + li"
                        class="ppt-bullet-item"
                      >
                        <span class="ppt-bullet-dot"></span>
                        <PptMarkdownInline
                          :text="displayText(item)"
                          :editable="isEditing"
                          @blur="onDocumentFigureLeftItemBlur($event, li)"
                        />
                      </li>
                    </ul>
                  </div>
                  <div class="ppt-col ppt-document-figure-col">
                    <div
                      class="ppt-col-header"
                      :contenteditable="isEditing"
                      @blur="onCellBlur($event, `slides.${currentSlide}.right_title`)"
                    >
                      {{ slide.right_title || t("agent.pptDocumentSourceImage") }}
                    </div>
                    <figure v-if="documentFigure?.url" class="ppt-document-figure">
                      <img
                        :src="documentFigure.url"
                        class="ppt-document-figure-img"
                        :style="documentFigureImgStyle(documentFigure)"
                        :alt="documentFigure.caption || documentFigure.page_label || slide.title || ''"
                        loading="lazy"
                        crossorigin="anonymous"
                      />
                      <figcaption
                        v-if="documentFigure.caption || isEditing"
                        class="ppt-document-figure-caption"
                        :contenteditable="isEditing"
                        @blur="onDocumentFigureCaptionBlur"
                      >
                        {{ documentFigure.caption || "" }}
                      </figcaption>
                    </figure>
                  </div>
                </template>
                <template v-else-if="isChapterImagePage(slide)">
                  <div class="ppt-col ppt-chapter-image-page-col">
                    <div
                      class="ppt-col-header"
                      :contenteditable="isEditing"
                      @blur="onCellBlur($event, `slides.${currentSlide}.left_title`)"
                    >
                      {{ slide.left_title || t("agent.pptChapterImage") }}
                    </div>
                    <PptChapterImages
                      v-if="slideChapterImages.length"
                      variant="page"
                      :images="slideChapterImages"
                      :alt-fallback="slide.title"
                    />
                  </div>
                  <div class="ppt-col-divider"></div>
                  <div class="ppt-col">
                    <div
                      class="ppt-col-header"
                      :contenteditable="isEditing"
                      @blur="onCellBlur($event, `slides.${currentSlide}.right_title`)"
                    >
                      {{ slide.right_title || t("agent.pptRightColumn") }}
                    </div>
                    <div v-if="slide.right_items?.length" class="ppt-right-items">
                      <div
                        v-for="(ri, idx) in slide.right_items"
                        :key="'cip-ri' + idx"
                        class="ppt-right-item-card"
                        :style="heroRightCardStyle(ri, idx)"
                      >
                        <div class="ppt-right-item-header">
                          <span class="ppt-right-item-icon">
                            <svg
                              v-if="ri.icon === 'image'"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            >
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                            <svg
                              v-else
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="8" x2="12" y2="12" />
                              <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                          </span>
                          <span
                            v-if="formatRightItemIndex(ri, idx) || rightItemTitle(ri)"
                            class="ppt-right-item-index"
                            :style="{ color: rightItemAccentColor(ri, idx) }"
                            >{{ formatRightItemIndex(ri, idx) }}</span
                          >
                          <PptMarkdownInline
                            class="ppt-right-item-title"
                            :text="rightItemTitle(ri)"
                            :editable="isEditing"
                            @blur="onRightItemFieldBlur($event, currentSlide, idx, 'title')"
                          />
                        </div>
                        <PptMarkdownInline
                          v-if="rightItemDescription(ri) || isEditing"
                          class="ppt-right-item-desc"
                          :text="rightItemDescription(ri)"
                          :editable="isEditing"
                          @blur="
                            onRightItemFieldBlur($event, currentSlide, idx, 'description')
                          "
                        />
                      </div>
                    </div>
                  </div>
                </template>
                <!-- 如果有 left_content/right_content/right_items 就用它们；否则按 column_split 切分 content -->
                <template
                  v-else-if="slide.left_content || slide.right_content || slide.right_items"
                >
                  <div class="ppt-col">
                    <div
                      class="ppt-col-header"
                      :contenteditable="isEditing"
                      @blur="onCellBlur($event, `slides.${currentSlide}.left_title`)"
                    >
                      {{ slide.left_title || t("agent.pptLeftColumn") }}
                    </div>
                    <ul class="ppt-bullet-list">
                      <li
                        v-for="(item, li) in slide.left_content || []"
                        :key="li"
                        class="ppt-bullet-item"
                      >
                        <span class="ppt-bullet-dot"></span>
                        <PptMarkdownInline
                          :text="displayText(item)"
                          :editable="isEditing"
                          @blur="onListItemBlur($event, currentSlide, 'left_content', li)"
                        />
                      </li>
                    </ul>
                  </div>
                  <div class="ppt-col-divider"></div>
                  <div class="ppt-col">
                    <div
                      class="ppt-col-header"
                      :contenteditable="isEditing"
                      @blur="onCellBlur($event, `slides.${currentSlide}.right_title`)"
                    >
                      {{ slide.right_title || t("agent.pptRightColumn") }}
                    </div>
                    <!-- 如果后端提供了 right_items（结构化卡片），优先渲染 -->
                    <div v-if="slide.right_items?.length" class="ppt-right-items">
                      <div
                        v-for="(ri, idx) in slide.right_items"
                        :key="'ri' + idx"
                        class="ppt-right-item-card"
                        :style="heroRightCardStyle(ri, idx)"
                      >
                        <div class="ppt-right-item-header">
                          <span class="ppt-right-item-icon">
                            <svg
                              v-if="ri.icon === 'star'"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            >
                              <polygon
                                points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                              />
                            </svg>
                            <svg
                              v-else-if="ri.icon === 'check'"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <svg
                              v-else-if="ri.icon === 'building'"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            >
                              <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                              <line x1="9" y1="6" x2="9" y2="6.01" />
                              <line x1="15" y1="6" x2="15" y2="6.01" />
                              <line x1="9" y1="10" x2="9" y2="10.01" />
                              <line x1="15" y1="10" x2="15" y2="10.01" />
                              <line x1="9" y1="14" x2="9" y2="14.01" />
                              <line x1="15" y1="14" x2="15" y2="14.01" />
                              <line x1="9" y1="18" x2="15" y2="18" />
                            </svg>
                            <svg
                              v-else-if="ri.icon === 'chart'"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            >
                              <line x1="18" y1="20" x2="18" y2="10" />
                              <line x1="12" y1="20" x2="12" y2="4" />
                              <line x1="6" y1="20" x2="6" y2="14" />
                            </svg>
                            <svg
                              v-else-if="ri.icon === 'shield'"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            >
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                            <svg
                              v-else-if="ri.icon === 'trending_up'"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            >
                              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                              <polyline points="17 6 23 6 23 12" />
                            </svg>
                            <svg
                              v-else
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="8" x2="12" y2="12" />
                              <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                          </span>
                          <span
                            v-if="formatRightItemIndex(ri, idx) || rightItemTitle(ri)"
                            class="ppt-right-item-index"
                            :style="{ color: rightItemAccentColor(ri, idx) }"
                            >{{ formatRightItemIndex(ri, idx) }}</span
                          >
                          <PptMarkdownInline
                            class="ppt-right-item-title"
                            :text="rightItemTitle(ri)"
                            :editable="isEditing"
                            @blur="onRightItemFieldBlur($event, currentSlide, idx, 'title')"
                          />
                        </div>
                        <PptMarkdownInline
                          v-if="rightItemDescription(ri) || isEditing"
                          class="ppt-right-item-desc"
                          :text="rightItemDescription(ri)"
                          :editable="isEditing"
                          @blur="
                            onRightItemFieldBlur($event, currentSlide, idx, 'description')
                          "
                        />
                      </div>
                    </div>
                    <!-- 否则回退到 right_content 文字列表 -->
                    <ul v-else class="ppt-bullet-list">
                      <li
                        v-for="(item, ri) in slide.right_content || []"
                        :key="ri"
                        class="ppt-bullet-item"
                      >
                        <span class="ppt-bullet-dot"></span>
                        <PptMarkdownInline
                          :text="displayText(item)"
                          :editable="isEditing"
                          @blur="onListItemBlur($event, currentSlide, 'right_content', ri)"
                        />
                      </li>
                    </ul>
                  </div>
                </template>
                <!-- 使用 column_split 将 content 分为左右两栏；若同时有 chart/table，对应栏改为图表/表格 -->
                <template v-else-if="slide.content?.length && resolveContentSplitIndex(slide.column_split, slide.content.length)">
                  <!-- 左栏：table.position === 'left' 时展示表格，否则展示前半段文字 -->
                  <div
                    class="ppt-col"
                    v-if="slide.table && slide.table.position === 'left'"
                  >
                    <div v-if="slide.left_title" class="ppt-col-header">
                      {{ slide.left_title }}
                    </div>
                    <PptTableBlock
                      compact
                      :table="slide.table"
                      :page-references="slide.page_references"
                      @ref-click="onPptTableRefClick($event, slide)"
                    />
                  </div>
                  <div class="ppt-col" v-else>
                    <div
                      v-if="slide.left_title"
                      class="ppt-col-header"
                      :contenteditable="isEditing"
                      @blur="onCellBlur($event, `slides.${currentSlide}.left_title`)"
                    >
                      {{ slide.left_title }}
                    </div>
                    <ul class="ppt-bullet-list">
                      <li
                        v-for="(item, li) in slide.content.slice(0, resolveContentSplitIndex(slide.column_split, slide.content.length)!)"
                        :key="'l' + li"
                        class="ppt-bullet-item"
                      >
                        <span class="ppt-bullet-dot"></span>
                        <PptMarkdownInline
                          :text="displayText(item)"
                          :editable="isEditing"
                          @blur="onContentItemBlur($event, currentSlide, li)"
                        />
                      </li>
                    </ul>
                  </div>
                  <div class="ppt-col-divider"></div>
                  <!-- 右栏：有表格时显示表格，否则有图表显示图表，否则显示后半段文字 -->
                  <div
                    class="ppt-col"
                    v-if="slide.table && slide.table.position !== 'left'"
                  >
                    <div v-if="slide.right_title" class="ppt-col-header">
                      {{ slide.right_title }}
                    </div>
                    <PptTableBlock
                      compact
                      :table="slide.table"
                      :page-references="slide.page_references"
                      @ref-click="onPptTableRefClick($event, slide)"
                    />
                  </div>
                  <div class="ppt-col" v-else-if="slide.chart">
                    <div v-if="slide.right_title" class="ppt-col-header">
                      {{ slide.right_title }}
                    </div>
                    <div class="ppt-col-chart-inner">
                      <div class="ppt-chart-title">{{ slide.chart.title }}</div>
                      <PptChartSourceLine
                        compact
                        :chart="slide.chart"
                        :page-references="slide.page_references"
                      />
                      <!-- 折线图 -->
                      <svg
                        v-if="slide.chart.type === 'line'"
                        class="ppt-chart-svg"
                        viewBox="0 0 400 200"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        <!-- Y轴刻度 (小尺寸) -->
                        <template v-for="(tick, ti) in getLineYTicks()" :key="'tcyt' + ti">
                          <text
                            x="28"
                            :y="
                              165 -
                              ((tick - lineChartYRange.min) / lineChartYRange.range) * 140 +
                              4
                            "
                            class="ppt-chart-label"
                            text-anchor="end"
                            style="font-size: 8px"
                          >
                            {{ formatTickValue(tick) }}
                          </text>
                          <line
                            x1="31"
                            :y1="
                              165 -
                              ((tick - lineChartYRange.min) / lineChartYRange.range) * 140
                            "
                            x2="380"
                            :y2="
                              165 -
                              ((tick - lineChartYRange.min) / lineChartYRange.range) * 140
                            "
                            stroke="var(--ppt-chart-grid)"
                            stroke-width="0.5"
                          />
                        </template>
                        <polyline
                          :points="linePointsSmall"
                          class="ppt-polyline"
                          fill="none"
                        />
                        <!-- 副线 (secondary) -->
                        <polyline
                          v-if="multiLinePointsSmall.secondary"
                          :points="multiLinePointsSmall.secondary"
                          class="ppt-polyline ppt-line-secondary"
                          fill="none"
                        />
                        <template v-for="(d, di) in slide.chart.data" :key="'tcl' + di">
                          <circle
                            :cx="35 + di * (340 / (slide.chart.data.length - 1))"
                            :cy="
                              165 -
                              ((d.value - lineChartYRange.min) / lineChartYRange.range) *
                                140
                            "
                            r="3"
                            class="ppt-line-dot"
                            :style="chartFillStyle(0)"
                          />
                          <text
                            :x="35 + di * (340 / (slide.chart.data.length - 1))"
                            :y="shouldRotateLabels ? 185 : 195"
                            class="ppt-chart-label"
                            :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                            :transform="
                              shouldRotateLabels
                                ? `rotate(-45, ${
                                    35 + di * (340 / (slide.chart.data.length - 1))
                                  }, 185)`
                                : undefined
                            "
                            :style="
                              shouldRotateLabels ? 'font-size: 7px' : 'font-size: 9px'
                            "
                          >
                            {{ d.label }}
                          </text>
                        </template>
                      </svg>
                      <!-- 柱状图（含分组） -->
                      <template v-else-if="slide.chart.type === 'bar'">
                        <div v-if="isGroupedBar" class="ppt-grouped-bar-wrap">
                          <div
                            class="ppt-grouped-bar-legend"
                            v-if="groupedBarSeriesList.length"
                          >
                            <span
                              v-for="(s, si) in groupedBarSeriesList"
                              :key="'tcgl' + si"
                              class="ppt-grouped-bar-legend-item"
                            >
                              <span
                                class="ppt-pie-dot"
                                :style="{ background: getSeriesColor(si) }"
                              ></span
                              >{{ groupedBarSeriesLabel(s) }}
                            </span>
                          </div>
                          <svg
                            class="ppt-chart-svg"
                            viewBox="0 0 400 200"
                            preserveAspectRatio="xMidYMid meet"
                          >
                            <!-- Y轴刻度 (小尺寸) -->
                            <template
                              v-for="(tick, ti) in getBarYTicks()"
                              :key="'tcgyt' + ti"
                            >
                              <text
                                x="26"
                                :y="mapBarYSmall(tick) + 4"
                                class="ppt-chart-label"
                                text-anchor="end"
                                style="font-size: 8px"
                              >
                                {{ formatTickValue(tick) }}
                              </text>
                              <line
                                x1="29"
                                :y1="mapBarYSmall(tick)"
                                x2="380"
                                :y2="mapBarYSmall(tick)"
                                stroke="var(--ppt-chart-grid)"
                                stroke-width="0.5"
                              />
                            </template>
                            <line
                              v-if="barChartYRange.min < 0"
                              x1="29"
                              :y1="mapBarYSmall(0)"
                              x2="380"
                              :y2="mapBarYSmall(0)"
                              stroke="var(--ppt-chart-zero-line)"
                              stroke-width="1"
                            />
                            <template
                              v-for="(cat, ci) in groupedBarCategories"
                              :key="'tcgb-cat-' + ci"
                            >
                              <template
                                v-for="(s, si) in groupedBarSeriesList"
                                :key="'tcgb-bar-' + ci + '-' + si"
                              >
                                <rect
                                  :x="groupedBarRectX(ci, si, 'compact')"
                                  :y="
                                    Math.min(
                                      mapBarYSmall(groupedBarValue(ci, si)),
                                      mapBarYSmall(0)
                                    )
                                  "
                                  :width="groupedBarRectWidth('compact')"
                                  :height="
                                    Math.max(
                                      1,
                                      Math.abs(
                                        mapBarYSmall(groupedBarValue(ci, si)) -
                                          mapBarYSmall(0)
                                      )
                                    )
                                  "
                                  :style="groupedBarRectStyle(si, groupedBarValue(ci, si))"
                                  :class="[
                                    'ppt-bar-rect',
                                    groupedBarValue(ci, si) < 0 ? 'ppt-bar-negative' : '',
                                  ]"
                                  rx="2"
                                />
                              </template>
                              <text
                                :x="groupedBarCategoryLabelX(ci, 'compact')"
                                :y="shouldRotateLabels ? 185 : 195"
                                class="ppt-chart-label"
                                :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                                :transform="
                                  shouldRotateLabels
                                    ? chartXCatLabelTransform(
                                        groupedBarCategoryLabelX(ci, 'compact'),
                                        185
                                      )
                                    : undefined
                                "
                                :style="
                                  shouldRotateLabels ? 'font-size: 7px' : 'font-size: 9px'
                                "
                              >
                                {{ cat }}
                              </text>
                            </template>
                          </svg>
                        </div>
                        <svg
                          v-else
                          class="ppt-chart-svg"
                          viewBox="0 0 400 200"
                          preserveAspectRatio="xMidYMid meet"
                        >
                          <!-- Y轴刻度 (小尺寸) -->
                          <template
                            v-for="(tick, ti) in getBarYTicks()"
                            :key="'tcbyt' + ti"
                          >
                            <text
                              x="26"
                              :y="mapBarYSmall(tick) + 4"
                              class="ppt-chart-label"
                              text-anchor="end"
                              style="font-size: 8px"
                            >
                              {{ formatTickValue(tick) }}
                            </text>
                            <line
                              x1="29"
                              :y1="mapBarYSmall(tick)"
                              x2="380"
                              :y2="mapBarYSmall(tick)"
                              stroke="var(--ppt-chart-grid)"
                              stroke-width="0.5"
                            />
                          </template>
                          <line
                            v-if="barChartYRange.min < 0"
                            x1="29"
                            :y1="mapBarYSmall(0)"
                            x2="380"
                            :y2="mapBarYSmall(0)"
                            stroke="var(--ppt-chart-zero-line)"
                            stroke-width="1"
                          />
                          <template v-for="(d, di) in slide.chart.data" :key="'tcb' + di">
                            <rect
                              :x="30 + di * (340 / slide.chart.data.length)"
                              :y="Math.min(mapBarYSmall(d.value), mapBarYSmall(0))"
                              :width="(340 / slide.chart.data.length) * 0.65"
                              :height="
                                Math.max(
                                  1,
                                  Math.abs(mapBarYSmall(d.value) - mapBarYSmall(0))
                                )
                              "
                              :class="[
                                'ppt-bar-rect',
                                d.value < 0 ? 'ppt-bar-negative' : '',
                              ]"
                              rx="2"
                            />
                            <!-- 柱子上方/下方显示数值 -->
                            <text
                              :x="
                                30 +
                                di * (340 / slide.chart.data.length) +
                                (340 / slide.chart.data.length) * 0.325
                              "
                              :y="
                                d.value >= 0
                                  ? mapBarYSmall(d.value) - 4
                                  : mapBarYSmall(d.value) +
                                    Math.abs(mapBarYSmall(d.value) - mapBarYSmall(0)) +
                                    10
                              "
                              class="ppt-chart-label"
                              text-anchor="middle"
                              fill="var(--ppt-chart-value)"
                              style="font-size: 8px"
                            >
                              {{ formatTickValue(d.value) }}
                            </text>
                            <text
                              :x="
                                30 +
                                di * (340 / slide.chart.data.length) +
                                (340 / slide.chart.data.length) * 0.3
                              "
                              :y="shouldRotateLabels ? 185 : 195"
                              class="ppt-chart-label"
                              :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                              :transform="
                                shouldRotateLabels
                                  ? chartXCatLabelTransform(
                                      30 +
                                        di * (340 / slide.chart.data.length) +
                                        (340 / slide.chart.data.length) * 0.3,
                                      185
                                    )
                                  : undefined
                              "
                              :style="
                                shouldRotateLabels ? 'font-size: 7px' : 'font-size: 9px'
                              "
                            >
                              {{ d.label }}
                            </text>
                          </template>
                        </svg>
                      </template>
                      <!-- 饼图 -->
                      <svg
                        v-else-if="slide.chart.type === 'pie'"
                        class="ppt-chart-svg ppt-pie-svg"
                        :viewBox="`0 0 ${PIE_CHART_LAYOUT.viewW} ${PIE_CHART_LAYOUT.viewH}`"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        <template v-for="(sl, si) in pieSlices" :key="'tcp' + si">
                          <path :d="sl.path" :fill="sl.color" opacity="0.88" />
                          <line
                            :x1="sl.leaderX1"
                            :y1="sl.leaderY1"
                            :x2="sl.lx"
                            :y2="sl.ly"
                            class="ppt-pie-leader"
                          />
                          <text
                            :x="sl.tx"
                            :y="sl.ty"
                            :text-anchor="sl.anchor"
                            class="ppt-pie-label"
                            dominant-baseline="middle"
                          >
                            {{ sl.percent }}%
                          </text>
                        </template>
                        <template v-for="(sl, si) in pieSlices" :key="'tcpl' + si">
                          <rect
                            :x="PIE_CHART_LAYOUT.legendX"
                            :y="10 + si * 20"
                            width="10"
                            height="10"
                            :fill="sl.color"
                            rx="2"
                          />
                          <text
                            :x="PIE_CHART_LAYOUT.legendTextX"
                            :y="10 + si * 20 + 9"
                            class="ppt-pie-legend-text"
                          >
                            {{ sl.label }}
                          </text>
                        </template>
                      </svg>
                      <!-- 雷达图（支持新旧两种格式） -->
                      <div
                        v-else-if="slide.chart.type === 'radar'"
                        class="ppt-radar-chart-wrap"
                      >
                        <div v-if="radarSeriesNorm.length > 1" class="ppt-radar-legend">
                          <span
                            v-for="s in radarSeriesNorm"
                            :key="s.name"
                            class="ppt-radar-legend-item"
                          >
                            <span
                              class="ppt-radar-legend-dot"
                              :style="{ background: s.color }"
                            ></span>
                            {{ s.name }}
                          </span>
                        </div>
                        <svg class="ppt-chart-svg ppt-radar-svg" viewBox="0 0 280 220">
                          <polygon
                            v-for="(ring, ri) in radarGridPolygons"
                            :key="'tcrg' + ri"
                            :points="ring.points"
                            class="ppt-radar-grid"
                          />
                          <line
                            v-for="(ax, ai) in radarAxes"
                            :key="'tcra' + ai"
                            :x1="120"
                            :y1="90"
                            :x2="ax.x"
                            :y2="ax.y"
                            class="ppt-radar-axis"
                          />
                          <text
                            v-for="(ring, ri) in radarGridPolygons"
                            :key="'tcrv' + ri"
                            x="124"
                            :y="90 - 64 * ((ri + 1) / radarGridPolygons.length) + 4"
                            class="ppt-radar-tick"
                          >
                            {{ ring.value }}
                          </text>
                          <g v-for="(series, si) in radarSeriesShapes" :key="'tcrs' + si">
                            <polygon
                              :points="series.points"
                              class="ppt-radar-series-fill"
                              :style="{ fill: series.color, stroke: series.color }"
                            />
                            <circle
                              v-for="(dot, di) in series.dots"
                              :key="'tcrd' + si + '-' + di"
                              :cx="dot.x"
                              :cy="dot.y"
                              r="3"
                              :style="{ fill: series.color }"
                            />
                          </g>
                          <text
                            v-for="(ax, ai) in radarAxes"
                            :key="'tcrl' + ai"
                            :x="ax.tx"
                            :y="ax.ty"
                            :text-anchor="ax.anchor"
                            class="ppt-radar-axis-label"
                            dominant-baseline="middle"
                          >
                            {{ ax.label }}
                          </text>
                        </svg>
                      </div>
                      <!-- 水平柱状图 -->
                      <svg
                        v-else-if="slide.chart.type === 'horizontal_bar'"
                        class="ppt-chart-svg ppt-chart-svg-hbar"
                        :viewBox="`0 0 ${
                          HBAR_LAYOUT_COMPACT.viewW
                        } ${horizontalBarViewBoxHeight(
                          slide.chart.data.length,
                          HBAR_LAYOUT_COMPACT.rowH,
                          30
                        )}`"
                        preserveAspectRatio="xMinYMid meet"
                      >
                        <template v-for="(d, di) in slide.chart.data" :key="'tchb' + di">
                          <text
                            :x="HBAR_LAYOUT_COMPACT.labelX"
                            :y="10 + di * HBAR_LAYOUT_COMPACT.rowH + 10"
                            class="ppt-chart-label"
                            text-anchor="end"
                            style="font-size: 9px"
                          >
                            {{ d.label }}
                          </text>
                          <rect
                            :x="HBAR_LAYOUT_COMPACT.barX"
                            :y="10 + di * HBAR_LAYOUT_COMPACT.rowH"
                            :width="
                              horizontalBarWidthPx(
                                d.value,
                                maxChartValue,
                                HBAR_LAYOUT_COMPACT.barMaxW,
                                slide.chart
                              )
                            "
                            height="16"
                            :class="['ppt-bar-rect', d.value < 0 ? 'ppt-bar-negative' : '']"
                            rx="2"
                          />
                          <text
                            :x="
                              horizontalBarValueTextX(
                                HBAR_LAYOUT_COMPACT.barX,
                                horizontalBarWidthPx(
                                  d.value,
                                  maxChartValue,
                                  HBAR_LAYOUT_COMPACT.barMaxW,
                                  slide.chart
                                ),
                                HBAR_LAYOUT_COMPACT.valueGap
                              )
                            "
                            :y="10 + di * HBAR_LAYOUT_COMPACT.rowH + 11"
                            class="ppt-chart-value-label"
                            style="font-size: 9px"
                          >
                            {{ formatChartDataValue(d.value) }}
                          </text>
                        </template>
                      </svg>
                      <!-- 漏斗图 funnel -->
                      <div
                        v-else-if="slide.chart.type === 'funnel'"
                        class="ppt-funnel-chart"
                      >
                        <div
                          v-for="(d, di) in slide.chart.data"
                          :key="'tcf' + di"
                          class="ppt-funnel-row"
                        >
                          <span class="ppt-funnel-label">{{ funnelItemLabel(d) }}</span>
                          <div class="ppt-funnel-bar-wrap">
                            <div
                              class="ppt-funnel-bar"
                              :style="{
                                width: funnelBarWidthPercent(
                                  d.value,
                                  maxChartValue,
                                  slide.chart
                                ),
                                background: getSeriesColor(di),
                              }"
                            >
                              <span class="ppt-funnel-value">{{
                                formatChartDataValue(d.value)
                              }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <!-- 瀑布图 waterfall -->
                      <svg
                        v-else-if="slide.chart.type === 'waterfall'"
                        class="ppt-chart-svg"
                        :viewBox="LINE_CHART_VIEWBOX"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        <text
                          v-if="slide.chart.y_label"
                          :x="LINE_CHART_Y_AXIS_LABEL_X"
                          :y="LINE_CHART_Y_AXIS_LABEL_Y"
                          class="ppt-axis-label"
                          text-anchor="middle"
                          :transform="`rotate(-90, ${LINE_CHART_Y_AXIS_LABEL_X}, ${LINE_CHART_Y_AXIS_LABEL_Y})`"
                        >
                          {{ slide.chart.y_label }}
                        </text>
                        <text
                          v-if="slide.chart.x_label"
                          x="265"
                          :y="LINE_CHART_X_AXIS_LABEL_Y"
                          class="ppt-axis-label"
                          text-anchor="middle"
                        >
                          {{ slide.chart.x_label }}
                        </text>
                        <!-- Y轴刻度 -->
                        <template
                          v-for="(tick, ti) in getWaterfallYTicks()"
                          :key="'tcwfyt' + ti"
                        >
                          <text
                            x="48"
                            :y="mapWaterfallY(tick) + 4"
                            class="ppt-chart-label"
                            text-anchor="end"
                          >
                            {{ formatTickValue(tick) }}
                          </text>
                          <line
                            x1="52"
                            :y1="mapWaterfallY(tick)"
                            x2="460"
                            :y2="mapWaterfallY(tick)"
                            stroke="var(--ppt-chart-grid)"
                            stroke-width="0.5"
                          />
                        </template>
                        <template v-for="(bar, bi) in waterfallBars" :key="'tcwf' + bi">
                          <rect
                            :x="55 + bi * (400 / waterfallBars.length) + 4"
                            :y="bar.y"
                            :width="400 / waterfallBars.length - 8"
                            :height="Math.max(2, bar.h)"
                            :class="[
                              'ppt-bar-rect',
                              bar.isTotal
                                ? 'ppt-bar-total'
                                : bar.isNegative
                                ? 'ppt-bar-negative'
                                : '',
                            ]"
                            rx="3"
                            opacity="0.88"
                          />
                          <text
                            :x="
                              55 +
                              bi * (400 / waterfallBars.length) +
                              400 / waterfallBars.length / 2
                            "
                            :y="bar.y - 5"
                            class="ppt-chart-label"
                            text-anchor="middle"
                            style="font-size: 9px"
                          >
                            {{ bar.value }}
                          </text>
                          <text
                            :x="
                              55 +
                              bi * (400 / waterfallBars.length) +
                              400 / waterfallBars.length / 2
                            "
                            :y="shouldRotateLabels ? LINE_CHART_X_CAT_Y_ROTATED : LINE_CHART_X_CAT_Y"
                            class="ppt-chart-label"
                            :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                            :transform="
                              shouldRotateLabels
                                ? chartXCatLabelTransform(
                                    55 +
                                      bi * (400 / waterfallBars.length) +
                                      400 / waterfallBars.length / 2,
                                    LINE_CHART_X_CAT_Y_ROTATED
                                  )
                                : undefined
                            "
                            :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                          >
                            {{ bar.label }}
                          </text>
                        </template>
                      </svg>
                      <!-- 散点图 scatter -->
                      <svg
                        v-else-if="slide.chart.type === 'scatter'"
                        class="ppt-chart-svg"
                        :viewBox="LINE_CHART_VIEWBOX"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        <text
                          v-if="slide.chart.y_label"
                          x="10"
                          y="110"
                          class="ppt-axis-label"
                          text-anchor="middle"
                          transform="rotate(-90, 10, 110)"
                        >
                          {{ slide.chart.y_label }}
                        </text>
                        <text
                          v-if="slide.chart.x_label"
                          x="255"
                          :y="LINE_CHART_X_AXIS_LABEL_Y"
                          class="ppt-axis-label"
                          text-anchor="middle"
                        >
                          {{ slide.chart.x_label }}
                        </text>
                        <template
                          v-for="(tick, ti) in getScatterYTicks()"
                          :key="'tcsy' + ti"
                        >
                          <line
                            :x1="55"
                            :y1="mapScatterY(tick)"
                            :x2="455"
                            :y2="mapScatterY(tick)"
                            stroke="rgba(255,255,255,0.1)"
                            stroke-width="1"
                          />
                          <text
                            :x="50"
                            :y="mapScatterY(tick) + 3"
                            class="ppt-chart-label"
                            text-anchor="end"
                            style="font-size: 9px"
                          >
                            {{ formatTickValue(tick) }}
                          </text>
                        </template>
                        <template
                          v-for="(tick, ti) in getScatterXTicks()"
                          :key="'tcsx' + ti"
                        >
                          <line
                            :x1="mapScatterX(tick)"
                            :y1="25"
                            :x2="mapScatterX(tick)"
                            :y2="195"
                            stroke="rgba(255,255,255,0.1)"
                            stroke-width="1"
                          />
                          <text
                            :x="mapScatterX(tick)"
                            :y="LINE_CHART_X_CAT_Y"
                            class="ppt-chart-label"
                            text-anchor="middle"
                            style="font-size: 9px"
                          >
                            {{ formatTickValue(tick) }}
                          </text>
                        </template>
                        <template v-for="(pt, pi) in scatterPoints" :key="'tcsp' + pi">
                          <circle
                            :cx="pt.svgX"
                            :cy="pt.svgY"
                            r="5"
                            :fill="pt.color"
                            fill-opacity="0.8"
                            stroke="#fff"
                            stroke-width="0.5"
                          />
                          <text
                            :x="pt.svgX"
                            :y="pt.svgY - 8"
                            class="ppt-chart-label"
                            text-anchor="middle"
                            style="font-size: 8px"
                          >
                            {{ pt.label }}
                          </text>
                        </template>
                      </svg>
                      <!-- 热力图 heatmap -->
                      <svg
                        v-else-if="slide.chart.type === 'heatmap'"
                        class="ppt-chart-svg"
                        :viewBox="LINE_CHART_VIEWBOX"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        <text
                          v-if="slide.chart.y_label"
                          x="8"
                          y="110"
                          class="ppt-axis-label"
                          text-anchor="middle"
                          transform="rotate(-90, 8, 110)"
                        >
                          {{ slide.chart.y_label }}
                        </text>
                        <text
                          v-if="slide.chart.x_label"
                          x="260"
                          :y="LINE_CHART_X_AXIS_LABEL_Y"
                          class="ppt-axis-label"
                          text-anchor="middle"
                        >
                          {{ slide.chart.x_label }}
                        </text>
                        <text
                          v-for="(col, ci) in heatmapParsed?.cols || []"
                          :key="'tchc' + ci"
                          :x="
                            60 +
                            ci * (400 / (heatmapParsed?.cols?.length || 1)) +
                            400 / (heatmapParsed?.cols?.length || 1) / 2
                          "
                          y="20"
                          class="ppt-chart-label"
                          text-anchor="middle"
                          style="font-size: 9px"
                        >
                          {{ col }}
                        </text>
                        <text
                          v-for="(row, ri) in heatmapParsed?.rows || []"
                          :key="'tchr' + ri"
                          x="56"
                          :y="
                            25 +
                            ri * (175 / (heatmapParsed?.rows?.length || 1)) +
                            175 / (heatmapParsed?.rows?.length || 1) / 2 +
                            3
                          "
                          class="ppt-chart-label"
                          text-anchor="end"
                          style="font-size: 9px"
                        >
                          {{ row }}
                        </text>
                        <template v-for="(cell, ci) in heatmapCells" :key="'tchv' + ci">
                          <rect
                            :x="cell.svgX + 1"
                            :y="cell.svgY + 1"
                            :width="Math.max(cell.width - 2, 1)"
                            :height="Math.max(cell.height - 2, 1)"
                            :fill="cell.color"
                            rx="2"
                            opacity="0.85"
                          />
                          <text
                            :x="cell.svgX + cell.width / 2"
                            :y="cell.svgY + cell.height / 2 + 3"
                            class="ppt-chart-label"
                            text-anchor="middle"
                            style="font-size: 9px; fill: #fff; font-weight: 600"
                          >
                            {{ cell.value }}
                          </text>
                        </template>
                      </svg>
                      <!-- 树形图 treemap -->
                      <svg
                        v-else-if="slide.chart.type === 'treemap'"
                        class="ppt-chart-svg"
                        :viewBox="LINE_CHART_VIEWBOX"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        <template v-for="(rect, ri) in treemapRects" :key="'tctr' + ri">
                          <rect
                            :x="rect.x + 1"
                            :y="rect.y + 1"
                            :width="Math.max(rect.width - 2, 1)"
                            :height="Math.max(rect.height - 2, 1)"
                            :fill="rect.color"
                            rx="3"
                            opacity="0.88"
                          />
                          <text
                            v-if="rect.width > 30 && rect.height > 20"
                            :x="rect.x + rect.width / 2"
                            :y="rect.y + rect.height / 2 - 4"
                            class="ppt-chart-label"
                            text-anchor="middle"
                            style="font-size: 10px; fill: #fff; font-weight: 600"
                          >
                            {{ rect.label }}
                          </text>
                          <text
                            v-if="rect.width > 30 && rect.height > 30"
                            :x="rect.x + rect.width / 2"
                            :y="rect.y + rect.height / 2 + 10"
                            class="ppt-chart-label"
                            text-anchor="middle"
                            style="font-size: 9px; fill: rgba(255, 255, 255, 0.7)"
                          >
                            {{ rect.value }} ({{ rect.percent }}%)
                          </text>
                        </template>
                      </svg>
                      <!-- 时间线 timeline -->
                      <div
                        v-else-if="isTimelineChart(slide.chart)"
                        class="ppt-timeline-chart ppt-timeline-chart--compact"
                      >
                        <div
                          v-if="
                            slide.chart.x_label ||
                            slide.chart.xLabel ||
                            slide.chart.y_label ||
                            slide.chart.yLabel
                          "
                          class="ppt-timeline-axis-hint"
                        >
                          <span v-if="slide.chart.x_label || slide.chart.xLabel">{{
                            slide.chart.x_label || slide.chart.xLabel
                          }}</span>
                          <template
                            v-if="
                              (slide.chart.x_label || slide.chart.xLabel) &&
                              (slide.chart.y_label || slide.chart.yLabel)
                            "
                          >
                            ·
                          </template>
                          <span v-if="slide.chart.y_label || slide.chart.yLabel">{{
                            slide.chart.y_label || slide.chart.yLabel
                          }}</span>
                        </div>
                        <div
                          v-for="(d, di) in slide.chart.data || []"
                          :key="'tl-cr-' + di"
                          class="ppt-timeline-item"
                        >
                          <div class="ppt-timeline-track">
                            <div
                              class="ppt-timeline-dot"
                              :style="{ background: getSeriesColor(di) }"
                            ></div>
                            <div
                              v-if="di < (slide.chart.data?.length || 0) - 1"
                              class="ppt-timeline-line"
                            ></div>
                          </div>
                          <div class="ppt-timeline-body">
                            <div
                              v-if="d.value != null && String(d.value) !== ''"
                              class="ppt-timeline-step"
                            >
                              {{ d.value }}
                            </div>
                            <div class="ppt-timeline-date">{{ d.label }}</div>
                            <div class="ppt-timeline-desc">
                              {{ d.description || d.desc || d.text || d.title || "" }}
                            </div>
                          </div>
                        </div>
                      </div>
                      <!-- 仪表盘图 gauge -->
                      <svg
                        v-else-if="slide.chart.type === 'gauge'"
                        class="ppt-chart-svg ppt-gauge-svg"
                        viewBox="0 0 260 160"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        <template v-if="gaugeData">
                          <path
                            :d="gaugeArcPath(1)"
                            fill="none"
                            stroke="rgba(255,255,255,0.12)"
                            stroke-width="16"
                            stroke-linecap="round"
                          />
                          <path
                            :d="gaugeArcPath(gaugeData.ratio)"
                            fill="none"
                            :stroke="gaugeData.color"
                            stroke-width="16"
                            stroke-linecap="round"
                          />
                          <template
                            v-for="(tick, ti) in gaugeTickMarks(
                              gaugeData.min,
                              gaugeData.max
                            )"
                            :key="'tcgt' + ti"
                          >
                            <line
                              :x1="tick.x1"
                              :y1="tick.y1"
                              :x2="tick.x2"
                              :y2="tick.y2"
                              stroke="rgba(255,255,255,0.3)"
                              stroke-width="1"
                            />
                            <text
                              :x="tick.x2 + (tick.x2 > 130 ? 4 : -4)"
                              :y="tick.y2 + 3"
                              class="ppt-chart-label"
                              :text-anchor="tick.x2 > 130 ? 'start' : 'end'"
                              style="font-size: 8px"
                            >
                              {{ tick.label }}
                            </text>
                          </template>
                          <text
                            x="130"
                            y="115"
                            text-anchor="middle"
                            class="ppt-gauge-value"
                            :fill="gaugeData.color"
                          >
                            {{ gaugeData.value }}{{ gaugeData.unit }}
                          </text>
                          <text
                            x="130"
                            y="135"
                            text-anchor="middle"
                            class="ppt-gauge-label"
                          >
                            {{ gaugeData.label }}
                          </text>
                          <template v-if="gaugeData.target !== undefined">
                            <line
                              :x1="
                                130 +
                                95 *
                                  Math.cos(
                                    Math.PI -
                                      ((gaugeData.target - gaugeData.min) /
                                        (gaugeData.max - gaugeData.min || 1)) *
                                        Math.PI
                                  )
                              "
                              :y1="
                                130 +
                                95 *
                                  Math.sin(
                                    Math.PI -
                                      ((gaugeData.target - gaugeData.min) /
                                        (gaugeData.max - gaugeData.min || 1)) *
                                        Math.PI
                                  )
                              "
                              :x2="
                                130 +
                                108 *
                                  Math.cos(
                                    Math.PI -
                                      ((gaugeData.target - gaugeData.min) /
                                        (gaugeData.max - gaugeData.min || 1)) *
                                        Math.PI
                                  )
                              "
                              :y2="
                                130 +
                                108 *
                                  Math.sin(
                                    Math.PI -
                                      ((gaugeData.target - gaugeData.min) /
                                        (gaugeData.max - gaugeData.min || 1)) *
                                        Math.PI
                                  )
                              "
                              stroke="#fff"
                              stroke-width="2"
                            />
                          </template>
                        </template>
                      </svg>
                    </div>
                  </div>
                  <div class="ppt-col" v-else>
                    <div v-if="slide.right_title" class="ppt-col-header">
                      {{ slide.right_title }}
                    </div>
                    <ul class="ppt-bullet-list">
                      <li
                        v-for="(item, ri) in slide.content.slice(resolveContentSplitIndex(slide.column_split, slide.content.length)!)"
                        :key="'r' + ri"
                        class="ppt-bullet-item"
                      >
                        <span class="ppt-bullet-dot"></span>
                        <PptMarkdownInline
                          :text="displayText(item)"
                          :editable="isEditing"
                          @blur="
                            onContentItemBlur(
                              $event,
                              currentSlide,
                              resolveContentSplitIndex(slide.column_split, slide.content.length)! + ri
                            )
                          "
                        />
                      </li>
                    </ul>
                  </div>
                </template>
                <!-- 兜底：只有 content 没有分栏信息 -->
                <template v-else>
                  <div class="ppt-col" style="flex: 1">
                    <ul class="ppt-bullet-list">
                      <li
                        v-for="(item, bi) in slide.content || []"
                        :key="bi"
                        class="ppt-bullet-item"
                      >
                        <span class="ppt-bullet-dot"></span>
                        <PptMarkdownInline
                          :text="displayText(item)"
                          :editable="isEditing"
                          @blur="onContentItemBlur($event, currentSlide, bi)"
                        />
                      </li>
                    </ul>
                  </div>
                </template>
              </div>
              <div
                v-if="isChapterImagePage(slide) && slide.key_insight"
                class="ppt-content-insight ppt-chapter-image-page-insight"
              >
                <PptMarkdownInline
                  :text="slide.key_insight || ''"
                  :editable="isEditing"
                  @blur="onCellBlur($event, `slides.${currentSlide}.key_insight`)"
                />
              </div>
              <!-- two_column 无 column_split 时表格显示在底部 -->
              <div
                v-if="slide.table && !resolveContentSplitIndex(slide.column_split, slide.content?.length ?? 0)"
                class="ppt-two-col-chart ppt-two-col-table"
              >
                <PptTableBlock
                  :table="slide.table"
                  :page-references="slide.page_references"
                  @ref-click="onPptTableRefClick($event, slide)"
                />
              </div>
              <!-- two_column 无 column_split 时图表显示在底部 -->
              <div v-else-if="slide.chart && !resolveContentSplitIndex(slide.column_split, slide.content?.length ?? 0)" class="ppt-two-col-chart" :class="{ 'ppt-chart-contained': isVisualOnlySlide(slide) }">
                <div class="ppt-chart-title">{{ slide.chart.title }}</div>
                <PptChartSourceLine
                  :chart="slide.chart"
                  :page-references="slide.page_references"
                />
                <!-- 折线图 line -->
                <svg
                  v-if="slide.chart.type === 'line'"
                  class="ppt-chart-svg"
                  :viewBox="LINE_CHART_VIEWBOX"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <text
                    v-if="slide.chart.y_label"
                    :x="LINE_CHART_Y_AXIS_LABEL_X"
                    :y="LINE_CHART_Y_AXIS_LABEL_Y"
                    class="ppt-axis-label"
                    text-anchor="middle"
                    :transform="`rotate(-90, ${LINE_CHART_Y_AXIS_LABEL_X}, ${LINE_CHART_Y_AXIS_LABEL_Y})`"
                  >
                    {{ slide.chart.y_label }}
                  </text>
                  <text
                    v-if="slide.chart.x_label"
                    x="265"
                    :y="LINE_CHART_X_AXIS_LABEL_Y"
                    class="ppt-axis-label"
                    text-anchor="middle"
                  >
                    {{ slide.chart.x_label }}
                  </text>
                  <!-- Y轴刻度 -->
                  <template v-for="(tick, ti) in getLineYTicks()" :key="'twlyt' + ti">
                    <text
                      x="48"
                      :y="mapLineY(tick) + 4"
                      class="ppt-chart-label"
                      text-anchor="end"
                    >
                      {{ formatTickValue(tick) }}
                    </text>
                    <line
                      x1="52"
                      :y1="mapLineY(tick)"
                      x2="460"
                      :y2="mapLineY(tick)"
                      stroke="var(--ppt-chart-grid)"
                      stroke-width="0.5"
                    />
                  </template>
                  <polyline
                    :points="linePoints"
                    class="ppt-polyline"
                    fill="none"
                    :style="chartStrokeStyle(0)"
                  />
                  <template v-for="(d, di) in slide.chart.data" :key="'tl' + di">
                    <circle
                      :cx="55 + di * (400 / (slide.chart.data.length - 1))"
                      :cy="mapLineY(d.value)"
                      r="4"
                      class="ppt-line-dot"
                      :style="chartFillStyle(0)"
                    />
                    <text
                      :x="55 + di * (400 / (slide.chart.data.length - 1))"
                      :y="
                        shouldRotateLabels ? LINE_CHART_X_CAT_Y_ROTATED : LINE_CHART_X_CAT_Y
                      "
                      class="ppt-chart-label"
                      :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                      :transform="
                        shouldRotateLabels
                          ? `rotate(-45, ${
                              55 + di * (400 / (slide.chart.data.length - 1))
                            }, ${LINE_CHART_X_CAT_Y_ROTATED})`
                          : undefined
                      "
                      :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                    >
                      {{ d.label }}
                    </text>
                  </template>
                </svg>
                <!-- 普通/分组柱状图 bar -->
                <template v-else-if="slide.chart.type === 'bar'">
                  <div v-if="isGroupedBar" class="ppt-grouped-bar-wrap">
                    <div
                      class="ppt-grouped-bar-legend"
                      v-if="groupedBarSeriesList.length"
                    >
                      <span
                        v-for="(s, si) in groupedBarSeriesList"
                        :key="'twgl' + si"
                        class="ppt-grouped-bar-legend-item"
                      >
                        <span
                          class="ppt-pie-dot"
                          :style="{ background: getSeriesColor(si) }"
                        ></span
                        >{{ groupedBarSeriesLabel(s) }}
                      </span>
                    </div>
                    <svg
                      class="ppt-chart-svg"
                      viewBox="0 0 500 260"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <text
                        v-if="slide.chart.y_label"
                        x="10"
                        y="110"
                        class="ppt-axis-label"
                        text-anchor="middle"
                        transform="rotate(-90, 10, 110)"
                      >
                        {{ slide.chart.y_label }}
                      </text>
                      <text
                        v-if="slide.chart.x_label"
                        x="260"
                        y="252"
                        class="ppt-axis-label"
                        text-anchor="middle"
                      >
                        {{ slide.chart.x_label }}
                      </text>
                      <!-- Y轴刻度 -->
                      <template v-for="(tick, ti) in getBarYTicks()" :key="'twgyt' + ti">
                        <text
                          x="48"
                          :y="mapBarY(tick) + 4"
                          class="ppt-chart-label"
                          text-anchor="end"
                        >
                          {{ formatTickValue(tick) }}
                        </text>
                        <line
                          x1="52"
                          :y1="mapBarY(tick)"
                          x2="460"
                          :y2="mapBarY(tick)"
                          stroke="var(--ppt-chart-grid)"
                          stroke-width="0.5"
                        />
                      </template>
                      <line
                        v-if="barChartYRange.min < 0"
                        x1="52"
                        :y1="barZeroY"
                        x2="460"
                        :y2="barZeroY"
                        stroke="var(--ppt-chart-zero-line)"
                        stroke-width="1"
                      />
                      <template
                        v-for="(cat, ci) in groupedBarCategories"
                        :key="'twgb-cat-' + ci"
                      >
                        <template
                          v-for="(s, si) in groupedBarSeriesList"
                          :key="'twgb-bar-' + ci + '-' + si"
                        >
                          <rect
                            :x="groupedBarRectX(ci, si)"
                            :y="Math.min(mapBarY(groupedBarValue(ci, si)), barZeroY)"
                            :width="groupedBarRectWidth()"
                            :height="
                              Math.max(
                                1,
                                Math.abs(mapBarY(groupedBarValue(ci, si)) - barZeroY)
                              )
                            "
                            :style="groupedBarRectStyle(si, groupedBarValue(ci, si))"
                            :class="[
                              'ppt-bar-rect',
                              groupedBarValue(ci, si) < 0 ? 'ppt-bar-negative' : '',
                            ]"
                            rx="3"
                          />
                        </template>
                        <text
                          :x="groupedBarCategoryLabelX(ci)"
                          :y="shouldRotateLabels ? BAR_CHART_X_CAT_Y_ROTATED : BAR_CHART_X_CAT_Y"
                          class="ppt-chart-label"
                          :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                          :transform="
                            shouldRotateLabels
                              ? chartXCatLabelTransform(
                                  groupedBarCategoryLabelX(ci),
                                  BAR_CHART_X_CAT_Y_ROTATED
                                )
                              : undefined
                          "
                          :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                        >
                          {{ cat }}
                        </text>
                      </template>
                    </svg>
                  </div>
                  <svg
                    v-else
                    class="ppt-chart-svg"
                    viewBox="0 0 500 260"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <text
                      v-if="slide.chart.y_label"
                      x="10"
                      y="110"
                      class="ppt-axis-label"
                      text-anchor="middle"
                      transform="rotate(-90, 10, 110)"
                    >
                      {{ slide.chart.y_label }}
                    </text>
                    <text
                      v-if="slide.chart.x_label"
                      x="260"
                      y="252"
                      class="ppt-axis-label"
                      text-anchor="middle"
                    >
                      {{ slide.chart.x_label }}
                    </text>
                    <!-- Y轴刻度 -->
                    <template v-for="(tick, ti) in getBarYTicks()" :key="'tbyt' + ti">
                      <text
                        x="48"
                        :y="mapBarY(tick) + 4"
                        class="ppt-chart-label"
                        text-anchor="end"
                      >
                        {{ formatTickValue(tick) }}
                      </text>
                      <line
                        x1="52"
                        :y1="mapBarY(tick)"
                        x2="460"
                        :y2="mapBarY(tick)"
                        stroke="var(--ppt-chart-grid)"
                        stroke-width="0.5"
                      />
                    </template>
                    <line
                      v-if="barChartYRange.min < 0"
                      x1="52"
                      :y1="barZeroY"
                      x2="460"
                      :y2="barZeroY"
                      stroke="var(--ppt-chart-zero-line)"
                      stroke-width="1"
                    />
                    <template v-for="(d, di) in slide.chart.data" :key="'tb' + di">
                      <rect
                        :x="55 + di * (400 / slide.chart.data.length)"
                        :y="Math.min(mapBarY(d.value), barZeroY)"
                        :width="(400 / slide.chart.data.length) * 0.65"
                        :height="Math.max(1, Math.abs(mapBarY(d.value) - barZeroY))"
                        :class="['ppt-bar-rect', d.value < 0 ? 'ppt-bar-negative' : '']"
                        rx="3"
                      />
                      <!-- 柱子上方/下方显示数值 -->
                      <text
                        :x="
                          55 +
                          di * (400 / slide.chart.data.length) +
                          (400 / slide.chart.data.length) * 0.325
                        "
                        :y="
                          d.value >= 0
                            ? mapBarY(d.value) - 5
                            : mapBarY(d.value) + Math.abs(mapBarY(d.value) - barZeroY) + 12
                        "
                        class="ppt-chart-label"
                        text-anchor="middle"
                        fill="var(--ppt-chart-value)"
                      >
                        {{ formatTickValue(d.value) }}
                      </text>
                      <text
                        :x="
                          55 +
                          di * (400 / slide.chart.data.length) +
                          (400 / slide.chart.data.length) * 0.3
                        "
                        :y="shouldRotateLabels ? BAR_CHART_X_CAT_Y_ROTATED : BAR_CHART_X_CAT_Y"
                        class="ppt-chart-label"
                        :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                        :transform="
                          shouldRotateLabels
                            ? chartXCatLabelTransform(
                                55 +
                                  di * (400 / slide.chart.data.length) +
                                  (400 / slide.chart.data.length) * 0.3,
                                BAR_CHART_X_CAT_Y_ROTATED
                              )
                            : undefined
                        "
                        :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                      >
                        {{ d.label }}
                      </text>
                    </template>
                  </svg>
                </template>
                <!-- 水平柱状图 horizontal_bar -->
                <svg
                  v-else-if="slide.chart.type === 'horizontal_bar'"
                  class="ppt-chart-svg ppt-chart-svg-hbar"
                  :viewBox="`0 0 ${HBAR_LAYOUT.viewW} ${horizontalBarViewBoxHeight(
                    slide.chart.data.length,
                    HBAR_LAYOUT.rowH
                  )}`"
                  preserveAspectRatio="xMinYMid meet"
                >
                  <text
                    v-if="slide.chart.x_label"
                    :x="HBAR_LAYOUT.viewW / 2"
                    :y="
                      horizontalBarViewBoxHeight(
                        slide.chart.data.length,
                        HBAR_LAYOUT.rowH
                      ) - 4
                    "
                    class="ppt-axis-label"
                    text-anchor="middle"
                  >
                    {{ slide.chart.x_label }}
                  </text>
                  <template v-for="(d, di) in slide.chart.data" :key="'tc' + di">
                    <text
                      :x="HBAR_LAYOUT.labelX"
                      :y="12 + di * HBAR_LAYOUT.rowH + 10"
                      class="ppt-chart-label"
                      text-anchor="end"
                    >
                      {{ d.label }}
                    </text>
                    <rect
                      :x="HBAR_LAYOUT.barX"
                      :y="12 + di * HBAR_LAYOUT.rowH"
                      :width="
                        horizontalBarWidthPx(
                          d.value,
                          maxChartValue,
                          HBAR_LAYOUT.barMaxW,
                          slide.chart
                        )
                      "
                      height="18"
                      :class="['ppt-bar-rect', d.value < 0 ? 'ppt-bar-negative' : '']"
                      rx="3"
                    />
                    <text
                      :x="
                        horizontalBarValueTextX(
                          HBAR_LAYOUT.barX,
                          horizontalBarWidthPx(
                            d.value,
                            maxChartValue,
                            HBAR_LAYOUT.barMaxW,
                            slide.chart
                          ),
                          HBAR_LAYOUT.valueGap
                        )
                      "
                      :y="12 + di * HBAR_LAYOUT.rowH + 13"
                      class="ppt-chart-value-label"
                    >
                      {{ formatChartDataValue(d.value) }}
                    </text>
                  </template>
                </svg>
                <!-- 饼图 pie -->
                <svg
                  v-else-if="slide.chart.type === 'pie'"
                  class="ppt-chart-svg ppt-pie-svg"
                  :viewBox="`0 0 ${PIE_CHART_LAYOUT.viewW} ${PIE_CHART_LAYOUT.viewH}`"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <template v-for="(sl, si) in pieSlices" :key="'tp' + si">
                    <path :d="sl.path" :fill="sl.color" opacity="0.88" />
                    <line
                      :x1="sl.leaderX1"
                      :y1="sl.leaderY1"
                      :x2="sl.lx"
                      :y2="sl.ly"
                      class="ppt-pie-leader"
                    />
                    <text
                      :x="sl.tx"
                      :y="sl.ty"
                      :text-anchor="sl.anchor"
                      class="ppt-pie-label"
                      dominant-baseline="middle"
                    >
                      {{ sl.percent }}%
                    </text>
                  </template>
                  <template v-for="(sl, si) in pieSlices" :key="'tpl' + si">
                    <rect
                      :x="PIE_CHART_LAYOUT.legendX"
                      :y="10 + si * 20"
                      width="10"
                      height="10"
                      :fill="sl.color"
                      rx="2"
                    />
                    <text
                      :x="PIE_CHART_LAYOUT.legendTextX"
                      :y="10 + si * 20 + 9"
                      class="ppt-pie-legend-text"
                    >
                      {{ sl.label }}
                    </text>
                  </template>
                </svg>
                <!-- 雷达图 radar（支持新旧两种格式） -->
                <div v-else-if="slide.chart.type === 'radar'" class="ppt-radar-chart-wrap">
                  <div v-if="radarSeriesNorm.length > 1" class="ppt-radar-legend">
                    <span
                      v-for="s in radarSeriesNorm"
                      :key="s.name"
                      class="ppt-radar-legend-item"
                    >
                      <span
                        class="ppt-radar-legend-dot"
                        :style="{ background: s.color }"
                      ></span>
                      {{ s.name }}
                    </span>
                  </div>
                  <svg class="ppt-chart-svg ppt-radar-svg" viewBox="0 0 280 220">
                    <polygon
                      v-for="(ring, ri) in radarGridPolygons"
                      :key="'trg' + ri"
                      :points="ring.points"
                      class="ppt-radar-grid"
                    />
                    <line
                      v-for="(ax, ai) in radarAxes"
                      :key="'tra' + ai"
                      :x1="120"
                      :y1="90"
                      :x2="ax.x"
                      :y2="ax.y"
                      class="ppt-radar-axis"
                    />
                    <text
                      v-for="(ring, ri) in radarGridPolygons"
                      :key="'trv' + ri"
                      x="124"
                      :y="90 - 64 * ((ri + 1) / radarGridPolygons.length) + 4"
                      class="ppt-radar-tick"
                    >
                      {{ ring.value }}
                    </text>
                    <g v-for="(series, si) in radarSeriesShapes" :key="'trs' + si">
                      <polygon
                        :points="series.points"
                        class="ppt-radar-series-fill"
                        :style="{ fill: series.color, stroke: series.color }"
                      />
                      <circle
                        v-for="(dot, di) in series.dots"
                        :key="'trd' + si + '-' + di"
                        :cx="dot.x"
                        :cy="dot.y"
                        r="3"
                        :style="{ fill: series.color }"
                      />
                    </g>
                    <text
                      v-for="(ax, ai) in radarAxes"
                      :key="'trl' + ai"
                      :x="ax.tx"
                      :y="ax.ty"
                      :text-anchor="ax.anchor"
                      class="ppt-radar-axis-label"
                      dominant-baseline="middle"
                    >
                      {{ ax.label }}
                    </text>
                  </svg>
                </div>
                <!-- 漏斗图 funnel（two_column 底部，无 column_split） -->
                <div v-else-if="slide.chart.type === 'funnel'" class="ppt-funnel-chart">
                  <div
                    v-for="(d, di) in slide.chart.data"
                    :key="'tf' + di"
                    class="ppt-funnel-row"
                  >
                    <span class="ppt-funnel-label">{{ funnelItemLabel(d) }}</span>
                    <div class="ppt-funnel-bar-wrap">
                      <div
                        class="ppt-funnel-bar"
                        :style="{
                          width: funnelBarWidthPercent(d.value, maxChartValue, slide.chart),
                          background: getSeriesColor(di),
                        }"
                      >
                        <span class="ppt-funnel-value">{{
                          formatChartDataValue(d.value)
                        }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <!-- 瀑布图 waterfall（two_column 底部） -->
                <svg
                  v-else-if="slide.chart.type === 'waterfall'"
                  class="ppt-chart-svg"
                  :viewBox="LINE_CHART_VIEWBOX"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <text
                    v-if="slide.chart.y_label"
                    :x="LINE_CHART_Y_AXIS_LABEL_X"
                    :y="LINE_CHART_Y_AXIS_LABEL_Y"
                    class="ppt-axis-label"
                    text-anchor="middle"
                    :transform="`rotate(-90, ${LINE_CHART_Y_AXIS_LABEL_X}, ${LINE_CHART_Y_AXIS_LABEL_Y})`"
                  >
                    {{ slide.chart.y_label }}
                  </text>
                  <text
                    v-if="slide.chart.x_label"
                    x="265"
                    :y="LINE_CHART_X_AXIS_LABEL_Y"
                    class="ppt-axis-label"
                    text-anchor="middle"
                  >
                    {{ slide.chart.x_label }}
                  </text>
                  <!-- Y轴刻度 -->
                  <template v-for="(tick, ti) in getWaterfallYTicks()" :key="'twfyt' + ti">
                    <text
                      x="48"
                      :y="mapWaterfallY(tick) + 4"
                      class="ppt-chart-label"
                      text-anchor="end"
                    >
                      {{ formatTickValue(tick) }}
                    </text>
                    <line
                      x1="52"
                      :y1="mapWaterfallY(tick)"
                      x2="460"
                      :y2="mapWaterfallY(tick)"
                      stroke="var(--ppt-chart-grid)"
                      stroke-width="0.5"
                    />
                  </template>
                  <template v-for="(bar, bi) in waterfallBars" :key="'twf' + bi">
                    <rect
                      :x="55 + bi * (400 / waterfallBars.length) + 4"
                      :y="bar.y"
                      :width="400 / waterfallBars.length - 8"
                      :height="Math.max(2, bar.h)"
                      :class="[
                        'ppt-bar-rect',
                        bar.isTotal
                          ? 'ppt-bar-total'
                          : bar.isNegative
                          ? 'ppt-bar-negative'
                          : '',
                      ]"
                      rx="3"
                      opacity="0.88"
                    />
                    <text
                      :x="
                        55 +
                        bi * (400 / waterfallBars.length) +
                        400 / waterfallBars.length / 2
                      "
                      :y="bar.y - 5"
                      class="ppt-chart-label"
                      text-anchor="middle"
                      style="font-size: 9px"
                    >
                      {{ bar.value }}
                    </text>
                    <text
                      :x="
                        55 +
                        bi * (400 / waterfallBars.length) +
                        400 / waterfallBars.length / 2
                      "
                      :y="shouldRotateLabels ? LINE_CHART_X_CAT_Y_ROTATED : LINE_CHART_X_CAT_Y"
                      class="ppt-chart-label"
                      :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                      :transform="
                        shouldRotateLabels
                          ? chartXCatLabelTransform(
                              55 +
                                bi * (400 / waterfallBars.length) +
                                400 / waterfallBars.length / 2,
                              LINE_CHART_X_CAT_Y_ROTATED
                            )
                          : undefined
                      "
                      :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                    >
                      {{ bar.label }}
                    </text>
                  </template>
                </svg>
                <!-- 散点图 scatter -->
                <svg
                  v-else-if="slide.chart.type === 'scatter'"
                  class="ppt-chart-svg"
                  :viewBox="LINE_CHART_VIEWBOX"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <text
                    v-if="slide.chart.y_label"
                    x="10"
                    y="110"
                    class="ppt-axis-label"
                    text-anchor="middle"
                    transform="rotate(-90, 10, 110)"
                  >
                    {{ slide.chart.y_label }}
                  </text>
                  <text
                    v-if="slide.chart.x_label"
                    x="255"
                    :y="LINE_CHART_X_AXIS_LABEL_Y"
                    class="ppt-axis-label"
                    text-anchor="middle"
                  >
                    {{ slide.chart.x_label }}
                  </text>
                  <template v-for="(tick, ti) in getScatterYTicks()" :key="'twsy' + ti">
                    <line
                      :x1="55"
                      :y1="mapScatterY(tick)"
                      :x2="455"
                      :y2="mapScatterY(tick)"
                      stroke="rgba(255,255,255,0.1)"
                      stroke-width="1"
                    />
                    <text
                      :x="50"
                      :y="mapScatterY(tick) + 3"
                      class="ppt-chart-label"
                      text-anchor="end"
                      style="font-size: 9px"
                    >
                      {{ formatTickValue(tick) }}
                    </text>
                  </template>
                  <template v-for="(tick, ti) in getScatterXTicks()" :key="'twsx' + ti">
                    <line
                      :x1="mapScatterX(tick)"
                      :y1="25"
                      :x2="mapScatterX(tick)"
                      :y2="195"
                      stroke="rgba(255,255,255,0.1)"
                      stroke-width="1"
                    />
                    <text
                      :x="mapScatterX(tick)"
                      :y="LINE_CHART_X_CAT_Y"
                      class="ppt-chart-label"
                      text-anchor="middle"
                      style="font-size: 9px"
                    >
                      {{ formatTickValue(tick) }}
                    </text>
                  </template>
                  <template v-for="(pt, pi) in scatterPoints" :key="'twsp' + pi">
                    <circle
                      :cx="pt.svgX"
                      :cy="pt.svgY"
                      r="5"
                      :fill="pt.color"
                      fill-opacity="0.8"
                      stroke="#fff"
                      stroke-width="0.5"
                    />
                    <text
                      :x="pt.svgX"
                      :y="pt.svgY - 8"
                      class="ppt-chart-label"
                      text-anchor="middle"
                      style="font-size: 8px"
                    >
                      {{ pt.label }}
                    </text>
                  </template>
                </svg>
                <!-- 热力图 heatmap -->
                <svg
                  v-else-if="slide.chart.type === 'heatmap'"
                  class="ppt-chart-svg"
                  :viewBox="LINE_CHART_VIEWBOX"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <text
                    v-if="slide.chart.y_label"
                    x="8"
                    y="110"
                    class="ppt-axis-label"
                    text-anchor="middle"
                    transform="rotate(-90, 8, 110)"
                  >
                    {{ slide.chart.y_label }}
                  </text>
                  <text
                    v-if="slide.chart.x_label"
                    x="260"
                    :y="LINE_CHART_X_AXIS_LABEL_Y"
                    class="ppt-axis-label"
                    text-anchor="middle"
                  >
                    {{ slide.chart.x_label }}
                  </text>
                  <text
                    v-for="(col, ci) in heatmapParsed?.cols || []"
                    :key="'twhc' + ci"
                    :x="
                      60 +
                      ci * (400 / (heatmapParsed?.cols?.length || 1)) +
                      400 / (heatmapParsed?.cols?.length || 1) / 2
                    "
                    y="20"
                    class="ppt-chart-label"
                    text-anchor="middle"
                    style="font-size: 9px"
                  >
                    {{ col }}
                  </text>
                  <text
                    v-for="(row, ri) in heatmapParsed?.rows || []"
                    :key="'twhr' + ri"
                    x="56"
                    :y="
                      25 +
                      ri * (175 / (heatmapParsed?.rows?.length || 1)) +
                      175 / (heatmapParsed?.rows?.length || 1) / 2 +
                      3
                    "
                    class="ppt-chart-label"
                    text-anchor="end"
                    style="font-size: 9px"
                  >
                    {{ row }}
                  </text>
                  <template v-for="(cell, ci) in heatmapCells" :key="'twhv' + ci">
                    <rect
                      :x="cell.svgX + 1"
                      :y="cell.svgY + 1"
                      :width="Math.max(cell.width - 2, 1)"
                      :height="Math.max(cell.height - 2, 1)"
                      :fill="cell.color"
                      rx="2"
                      opacity="0.85"
                    />
                    <text
                      :x="cell.svgX + cell.width / 2"
                      :y="cell.svgY + cell.height / 2 + 3"
                      class="ppt-chart-label"
                      text-anchor="middle"
                      style="font-size: 9px; fill: #fff; font-weight: 600"
                    >
                      {{ cell.value }}
                    </text>
                  </template>
                </svg>
                <!-- 树形图 treemap -->
                <svg
                  v-else-if="slide.chart.type === 'treemap'"
                  class="ppt-chart-svg"
                  :viewBox="LINE_CHART_VIEWBOX"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <template v-for="(rect, ri) in treemapRects" :key="'twtr' + ri">
                    <rect
                      :x="rect.x + 1"
                      :y="rect.y + 1"
                      :width="Math.max(rect.width - 2, 1)"
                      :height="Math.max(rect.height - 2, 1)"
                      :fill="rect.color"
                      rx="3"
                      opacity="0.88"
                    />
                    <text
                      v-if="rect.width > 30 && rect.height > 20"
                      :x="rect.x + rect.width / 2"
                      :y="rect.y + rect.height / 2 - 4"
                      class="ppt-chart-label"
                      text-anchor="middle"
                      style="font-size: 10px; fill: #fff; font-weight: 600"
                    >
                      {{ rect.label }}
                    </text>
                    <text
                      v-if="rect.width > 30 && rect.height > 30"
                      :x="rect.x + rect.width / 2"
                      :y="rect.y + rect.height / 2 + 10"
                      class="ppt-chart-label"
                      text-anchor="middle"
                      style="font-size: 9px; fill: rgba(255, 255, 255, 0.7)"
                    >
                      {{ rect.value }} ({{ rect.percent }}%)
                    </text>
                  </template>
                </svg>
                <!-- 时间线 timeline -->
                <div v-else-if="isTimelineChart(slide.chart)" class="ppt-timeline-chart">
                  <div
                    v-if="
                      slide.chart.x_label ||
                      slide.chart.xLabel ||
                      slide.chart.y_label ||
                      slide.chart.yLabel
                    "
                    class="ppt-timeline-axis-hint"
                  >
                    <span v-if="slide.chart.x_label || slide.chart.xLabel">{{
                      slide.chart.x_label || slide.chart.xLabel
                    }}</span>
                    <template
                      v-if="
                        (slide.chart.x_label || slide.chart.xLabel) &&
                        (slide.chart.y_label || slide.chart.yLabel)
                      "
                    >
                      ·
                    </template>
                    <span v-if="slide.chart.y_label || slide.chart.yLabel">{{
                      slide.chart.y_label || slide.chart.yLabel
                    }}</span>
                  </div>
                  <div
                    v-for="(d, di) in slide.chart.data || []"
                    :key="'tl-cb-' + di"
                    class="ppt-timeline-item"
                  >
                    <div class="ppt-timeline-track">
                      <div
                        class="ppt-timeline-dot"
                        :style="{ background: getSeriesColor(di) }"
                      ></div>
                      <div
                        v-if="di < (slide.chart.data?.length || 0) - 1"
                        class="ppt-timeline-line"
                      ></div>
                    </div>
                    <div class="ppt-timeline-body">
                      <div
                        v-if="d.value != null && String(d.value) !== ''"
                        class="ppt-timeline-step"
                      >
                        {{ d.value }}
                      </div>
                      <div class="ppt-timeline-date">{{ d.label }}</div>
                      <div class="ppt-timeline-desc">
                        {{ d.description || d.desc || d.text || d.title || "" }}
                      </div>
                    </div>
                  </div>
                </div>
                <!-- 仪表盘图 gauge -->
                <svg
                  v-else-if="slide.chart.type === 'gauge'"
                  class="ppt-chart-svg ppt-gauge-svg"
                  viewBox="0 0 260 160"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <template v-if="gaugeData">
                    <path
                      :d="gaugeArcPath(1)"
                      fill="none"
                      stroke="rgba(255,255,255,0.12)"
                      stroke-width="16"
                      stroke-linecap="round"
                    />
                    <path
                      :d="gaugeArcPath(gaugeData.ratio)"
                      fill="none"
                      :stroke="gaugeData.color"
                      stroke-width="16"
                      stroke-linecap="round"
                    />
                    <template
                      v-for="(tick, ti) in gaugeTickMarks(gaugeData.min, gaugeData.max)"
                      :key="'twgt' + ti"
                    >
                      <line
                        :x1="tick.x1"
                        :y1="tick.y1"
                        :x2="tick.x2"
                        :y2="tick.y2"
                        stroke="rgba(255,255,255,0.3)"
                        stroke-width="1"
                      />
                      <text
                        :x="tick.x2 + (tick.x2 > 130 ? 4 : -4)"
                        :y="tick.y2 + 3"
                        class="ppt-chart-label"
                        :text-anchor="tick.x2 > 130 ? 'start' : 'end'"
                        style="font-size: 8px"
                      >
                        {{ tick.label }}
                      </text>
                    </template>
                    <text
                      x="130"
                      y="115"
                      text-anchor="middle"
                      class="ppt-gauge-value"
                      :fill="gaugeData.color"
                    >
                      {{ gaugeData.value }}{{ gaugeData.unit }}
                    </text>
                    <text x="130" y="135" text-anchor="middle" class="ppt-gauge-label">
                      {{ gaugeData.label }}
                    </text>
                    <template v-if="gaugeData.target !== undefined">
                      <line
                        :x1="
                          130 +
                          95 *
                            Math.cos(
                              Math.PI -
                                ((gaugeData.target - gaugeData.min) /
                                  (gaugeData.max - gaugeData.min || 1)) *
                                  Math.PI
                            )
                        "
                        :y1="
                          130 +
                          95 *
                            Math.sin(
                              Math.PI -
                                ((gaugeData.target - gaugeData.min) /
                                  (gaugeData.max - gaugeData.min || 1)) *
                                  Math.PI
                            )
                        "
                        :x2="
                          130 +
                          108 *
                            Math.cos(
                              Math.PI -
                                ((gaugeData.target - gaugeData.min) /
                                  (gaugeData.max - gaugeData.min || 1)) *
                                  Math.PI
                            )
                        "
                        :y2="
                          130 +
                          108 *
                            Math.sin(
                              Math.PI -
                                ((gaugeData.target - gaugeData.min) /
                                  (gaugeData.max - gaugeData.min || 1)) *
                                  Math.PI
                            )
                        "
                        stroke="#fff"
                        stroke-width="2"
                      />
                    </template>
                  </template>
                </svg>
              </div>
              <div v-if="currentBrandFooter" class="ppt-brand-footer">{{ currentBrandFooter }}</div>
            </div>

            <!-- data 数据图表页 -->
            <div
              v-else-if="slide.layout === 'data'"
              class="ppt-slide ppt-data"
              :class="{ 'ppt-slide--metric-only': isMetricCardsOnlySlide(slide) }"
            >
              <h2 class="ppt-slide-title">
                <PptMarkdownInline
                  :text="slide.title || ''"
                  :editable="isEditing"
                  @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
                />
              </h2>
              <div v-if="slide.subtitle" class="ppt-chart-subtitle">
                <PptMarkdownInline
                  :text="slide.subtitle || ''"
                  :editable="isEditing"
                  @blur="onCellBlur($event, `slides.${currentSlide}.subtitle`)"
                />
              </div>

              <div
                v-if="slide.key_insight"
                class="ppt-content-insight ppt-content-insight--page-callout"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path
                    d="M12 2a7 7 0 0 1 4 12.7V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.3A7 7 0 0 1 12 2z"
                  />
                  <line x1="9" y1="21" x2="15" y2="21" />
                </svg>
                <PptMarkdownInline
                  class="ppt-content-insight-text"
                  :text="slide.key_insight || ''"
                  :editable="isEditing"
                  @blur="onCellBlur($event, `slides.${currentSlide}.key_insight`)"
                />
              </div>

              <!-- KPI 卡：metric_cards_row -->
              <div
                v-if="shouldShowMetricCardsPrimaryGrid(slide)"
                class="ppt-metric-cards-fullpage"
                :class="{ 'ppt-metric-cards-fullpage--active': shouldFillMetricCards(slide) }"
              >
                <PptMetricCardsRow
                  :cards="slide.metric_cards ?? []"
                  :primary="shouldUsePrimaryMetricCards(slide)"
                  :fill="shouldFillMetricCards(slide)"
                  :page-references="slide.page_references"
                  :card-style="metricCardStyle"
                  :value-style="metricCardValueStyle"
                  @ref-click="onPptTableRefClick($event, slide)"
                />
              </div>

              <!-- 无 emphasis 的小卡（table/chart 上方） -->
              <PptMetricCardsRow
                v-else-if="shouldShowMetricCardsCompactGrid(slide) && hasBodyPrimaryVisual(slide)"
                :cards="slide.metric_cards ?? []"
                :page-references="slide.page_references"
                :card-style="metricCardStyle"
                :value-style="metricCardValueStyle"
                @ref-click="onPptTableRefClick($event, slide)"
              />

              <div
                v-if="isHeroLeftSlide(slide)"
                class="ppt-content-split ppt-content-items-split ppt-hero-left-split"
              >
                <div class="ppt-content-left ppt-hero-left-panel">
                  <div
                    class="ppt-hero-metric ppt-data-hero-metric"
                    :style="heroMetricStyle(slide.hero_metric)"
                  >
                    <div
                      v-if="slide.hero_metric?.value"
                      class="ppt-hero-metric-value"
                      :contenteditable="isEditing"
                      @blur="onHeroMetricBlur($event, currentSlide, 'value')"
                    >
                      {{ slide.hero_metric.value }}
                    </div>
                    <PptMarkdownInline
                      v-if="slide.hero_metric?.caption"
                      class="ppt-hero-metric-caption"
                      :text="slide.hero_metric.caption"
                      :page-references="slide.page_references"
                      :editable="isEditing"
                      @blur="onHeroMetricBlur($event, currentSlide, 'caption')"
                      @ref-click="onPptTableRefClick($event, slide)"
                    />
                  </div>
                </div>
                <div
                  class="ppt-content-right ppt-hero-right-items"
                  v-bind="classicHeroRightColumnTypography(slide, heroLeftContentRightItems(slide))"
                >
                  <template v-if="slide.right_items?.length">
                    <div
                      v-for="(ri, idx) in slide.right_items"
                      :key="'data-hl-' + idx"
                      class="ppt-hero-right-card"
                      :style="heroRightCardStyle(ri, idx)"
                    >
                      <div class="ppt-hero-right-card-head">
                        <span
                          class="ppt-hero-right-card-index"
                          :style="{ color: rightItemAccentColor(ri, idx) }"
                          :contenteditable="isEditing"
                          @blur="onRightItemFieldBlur($event, currentSlide, idx, 'index')"
                          >{{ formatRightItemIndex(ri, idx) }}</span
                        >
                        <PptMarkdownInline
                          class="ppt-hero-right-card-title"
                          :text="rightItemTitle(ri)"
                          :editable="isEditing"
                          @blur="onRightItemFieldBlur($event, currentSlide, idx, 'title')"
                        />
                      </div>
                      <PptMarkdownInline
                        v-if="rightItemDescription(ri) || isEditing"
                        class="ppt-hero-right-card-desc"
                        :text="rightItemDescription(ri)"
                        :editable="isEditing"
                        @blur="onRightItemFieldBlur($event, currentSlide, idx, 'description')"
                      />
                    </div>
                  </template>
                  <template v-else>
                    <PptMetricCardsRow
                      v-if="shouldShowHeroLeftMetricCards(slide)"
                      :cards="slide.metric_cards ?? []"
                      column
                      :page-references="slide.page_references"
                      :card-style="metricCardStyle"
                      :value-style="metricCardValueStyle"
                      @ref-click="onPptTableRefClick($event, slide)"
                    />
                    <PptTableBlock
                      v-else-if="shouldShowHeroLeftTable(slide) && slide.table"
                      :table="slide.table"
                      :page-references="slide.page_references"
                      @ref-click="onPptTableRefClick($event, slide)"
                    />
                    <template v-if="shouldShowHeroLeftContentItems(slide)">
                      <div
                        v-for="(ri, idx) in heroLeftContentRightItems(slide)"
                        :key="'data-hl-fb-' + idx"
                        class="ppt-hero-right-card"
                        :class="{ 'ppt-hero-right-card--after-metrics': shouldShowHeroLeftMetricCards(slide) }"
                        :style="heroRightCardStyle(ri, idx)"
                      >
                        <div class="ppt-hero-right-card-head">
                          <span
                            class="ppt-hero-right-card-index"
                            :style="{ color: rightItemAccentColor(ri, idx) }"
                            >{{ formatRightItemIndex(ri, idx) }}</span
                          >
                          <PptMarkdownInline
                            class="ppt-hero-right-card-title"
                            :text="rightItemTitle(ri)"
                            :page-references="slide.page_references"
                            @ref-click="onPptTableRefClick($event, slide)"
                          />
                        </div>
                        <PptMarkdownInline
                          v-if="rightItemDescription(ri)"
                          class="ppt-hero-right-card-desc"
                          :text="rightItemDescription(ri)"
                          :page-references="slide.page_references"
                          @ref-click="onPptTableRefClick($event, slide)"
                        />
                      </div>
                    </template>
                  </template>
                </div>
              </div>

              <div
                v-else-if="shouldShowHeroMetricBanner(slide)"
                class="ppt-hero-metric ppt-data-hero-metric"
                :style="heroMetricStyle(slide.hero_metric)"
              >
                <div
                  v-if="slide.hero_metric?.value"
                  class="ppt-hero-metric-value"
                  :contenteditable="isEditing"
                  @blur="onHeroMetricBlur($event, currentSlide, 'value')"
                >
                  {{ slide.hero_metric.value }}
                </div>
                <PptMarkdownInline
                  v-if="slide.hero_metric?.caption"
                  class="ppt-hero-metric-caption"
                  :text="slide.hero_metric.caption"
                  :page-references="slide.page_references"
                  :editable="isEditing"
                  @blur="onHeroMetricBlur($event, currentSlide, 'caption')"
                  @ref-click="onPptTableRefClick($event, slide)"
                />
              </div>

              <PptMetricCardsRow
                v-else-if="shouldShowMetricCardInline(slide)"
                :cards="slide.metric_cards ?? []"
                inline
                :page-references="slide.page_references"
                :card-style="metricCardStyle"
                :value-style="metricCardValueStyle"
                @ref-click="onPptTableRefClick($event, slide)"
              />

              <!-- ════ chart/table + 左栏 KPI 或要点 ════ -->
              <div
                v-if="
                  !isHeroLeftSlide(slide) &&
                  hasBodyPrimaryVisual(slide) &&
                  (isMetricCardsChartSplitSlide(slide) ||
                    shouldShowContentBullets(slide) ||
                    hasTableAndChart(slide))
                "
                class="ppt-content-split ppt-data-split"
                :class="{
                  'ppt-metric-chart-split': isMetricCardsChartSplitSlide(slide),
                  'ppt-content-split--table-chart-dual':
                    hasTableAndChart(slide) &&
                    !isMetricCardsChartSplitSlide(slide) &&
                    !shouldShowContentBullets(slide),
                  'ppt-content-split--table-chart-with-bullets':
                    hasTableAndChart(slide) && shouldShowContentBullets(slide),
                  'ppt-content-chart-only':
                    hasBodyPrimaryVisual(slide) &&
                    !shouldShowContentBullets(slide) &&
                    !isMetricCardsChartSplitSlide(slide),
                }"
              >
                <!-- 左栏：KPI 卡或文字要点 -->
                <div
                  v-if="isMetricCardsChartSplitSlide(slide) || shouldShowContentBullets(slide)"
                  class="ppt-content-left"
                  v-bind="classicDataContentLeftTypography(slide)"
                >
                  <PptMetricCardsRow
                    v-if="isMetricCardsChartSplitSlide(slide)"
                    :cards="slide.metric_cards ?? []"
                    column
                    :page-references="slide.page_references"
                    :card-style="metricCardStyle"
                    :value-style="metricCardValueStyle"
                    @ref-click="onPptTableRefClick($event, slide)"
                  />
                  <template v-else>
                    <div
                      v-for="(item, bi) in resolveSlideBulletItems(slide)"
                      :key="'dp' + bi"
                      class="ppt-content-point"
                      :style="contentPointStyle(bi)"
                    >
                      <div class="ppt-content-point-header">
                        <span class="ppt-content-point-icon">
                          <svg
                            v-if="bi % 4 === 0"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.8"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <line x1="18" y1="20" x2="18" y2="10" />
                            <line x1="12" y1="20" x2="12" y2="4" />
                            <line x1="6" y1="20" x2="6" y2="14" />
                          </svg>
                          <svg
                            v-else-if="bi % 4 === 1"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.8"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <svg
                            v-else-if="bi % 4 === 2"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.8"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                            <polyline points="17 6 23 6 23 12" />
                          </svg>
                          <svg
                            v-else
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.8"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                        </span>
                        <PptMarkdownInline
                          class="ppt-content-point-title"
                          :text="contentPointTitle(item)"
                          :editable="isEditing"
                          @blur="onContentItemBlur($event, currentSlide, bi)"
                        />
                      </div>
                      <PptMarkdownInline
                        v-if="hasContentPointBody(item)"
                        class="ppt-content-point-body"
                        :text="contentPointBody(item)"
                        :editable="isEditing"
                        @blur="onContentItemBlur($event, currentSlide, bi)"
                      />
                    </div>
                  </template>
                </div>
                <!-- 右栏：图表 + 表格（可同时存在） -->
                <div class="ppt-content-right">
                  <PptMetricCardsRow
                    v-if="isContentMetricChartSlide(slide)"
                    class="ppt-data-split-metric-cards"
                    :cards="slide.metric_cards ?? []"
                    :page-references="slide.page_references"
                    :card-style="metricCardStyle"
                    :value-style="metricCardValueStyle"
                    @ref-click="onPptTableRefClick($event, slide)"
                  />
                  <div v-if="slide.chart" class="ppt-content-chart-wrap">
                    <div class="ppt-chart-title">{{ slide.chart.title }}</div>
                    <div v-if="slide.chart.note" class="ppt-chart-note">
                      {{ slide.chart.note }}
                    </div>
                    <PptChartSourceLine
                      :chart="slide.chart"
                      :page-references="slide.page_references"
                    />

                    <!-- ═══ 普通/分组柱状图 bar ═══ -->
                    <template v-if="slide.chart.type === 'bar'">
                      <div v-if="isGroupedBar" class="ppt-grouped-bar-wrap">
                        <div
                          class="ppt-grouped-bar-legend"
                          v-if="groupedBarSeriesList.length"
                        >
                          <span
                            v-for="(s, si) in groupedBarSeriesList"
                            :key="'dgl' + si"
                            class="ppt-grouped-bar-legend-item"
                          >
                            <span
                              class="ppt-pie-dot"
                              :style="{ background: getSeriesColor(si) }"
                            ></span
                            >{{ groupedBarSeriesLabel(s) }}
                          </span>
                        </div>
                        <svg
                          class="ppt-chart-svg"
                          viewBox="0 0 500 260"
                          preserveAspectRatio="xMidYMid meet"
                        >
                          <text
                            v-if="slide.chart.y_label"
                            x="10"
                            y="110"
                            class="ppt-axis-label"
                            text-anchor="middle"
                            transform="rotate(-90, 10, 110)"
                          >
                            {{ slide.chart.y_label }}
                          </text>
                          <text
                            v-if="slide.chart.x_label"
                            x="260"
                            y="252"
                            class="ppt-axis-label"
                            text-anchor="middle"
                          >
                            {{ slide.chart.x_label }}
                          </text>
                          <!-- Y轴刻度 -->
                          <template v-for="(tick, ti) in getBarYTicks()" :key="'dgyt' + ti">
                            <text
                              x="48"
                              :y="mapBarY(tick) + 4"
                              class="ppt-chart-label"
                              text-anchor="end"
                            >
                              {{ formatTickValue(tick) }}
                            </text>
                            <line
                              x1="52"
                              :y1="mapBarY(tick)"
                              x2="460"
                              :y2="mapBarY(tick)"
                              stroke="var(--ppt-chart-grid)"
                              stroke-width="0.5"
                            />
                          </template>
                          <line
                            v-if="barChartYRange.min < 0"
                            x1="52"
                            :y1="barZeroY"
                            x2="460"
                            :y2="barZeroY"
                            stroke="var(--ppt-chart-zero-line)"
                            stroke-width="1"
                          />
                          <template
                            v-for="(cat, ci) in groupedBarCategories"
                            :key="'dgb-cat-' + ci"
                          >
                            <template
                              v-for="(s, si) in groupedBarSeriesList"
                              :key="'dgb-bar-' + ci + '-' + si"
                            >
                              <rect
                                :x="groupedBarRectX(ci, si)"
                                :y="
                                  Math.min(mapBarY(groupedBarValue(ci, si)), barZeroY)
                                "
                                :width="groupedBarRectWidth()"
                                :height="
                                  Math.max(
                                    1,
                                    Math.abs(mapBarY(groupedBarValue(ci, si)) - barZeroY)
                                  )
                                "
                                :style="groupedBarRectStyle(si, groupedBarValue(ci, si))"
                                :class="[
                                  'ppt-bar-rect',
                                  groupedBarValue(ci, si) < 0 ? 'ppt-bar-negative' : '',
                                ]"
                                rx="3"
                              />
                            </template>
                            <text
                              :x="groupedBarCategoryLabelX(ci)"
                              :y="shouldRotateLabels ? BAR_CHART_X_CAT_Y_ROTATED : BAR_CHART_X_CAT_Y"
                              class="ppt-chart-label"
                              :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                              :transform="
                                shouldRotateLabels
                                  ? chartXCatLabelTransform(
                                      groupedBarCategoryLabelX(ci),
                                      BAR_CHART_X_CAT_Y_ROTATED
                                    )
                                  : undefined
                              "
                              :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                            >
                              {{ cat }}
                            </text>
                          </template>
                        </svg>
                      </div>
                      <svg
                        v-else
                        class="ppt-chart-svg"
                        viewBox="0 0 500 260"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        <text
                          v-if="slide.chart.y_label"
                          x="10"
                          y="110"
                          class="ppt-axis-label"
                          text-anchor="middle"
                          transform="rotate(-90, 10, 110)"
                        >
                          {{ slide.chart.y_label }}
                        </text>
                        <text
                          v-if="slide.chart.x_label"
                          x="260"
                          y="252"
                          class="ppt-axis-label"
                          text-anchor="middle"
                        >
                          {{ slide.chart.x_label }}
                        </text>
                        <!-- Y轴刻度 -->
                        <template v-for="(tick, ti) in getBarYTicks()" :key="'dbyt' + ti">
                          <text
                            x="48"
                            :y="mapBarY(tick) + 4"
                            class="ppt-chart-label"
                            text-anchor="end"
                          >
                            {{ formatTickValue(tick) }}
                          </text>
                          <line
                            x1="52"
                            :y1="mapBarY(tick)"
                            x2="460"
                            :y2="mapBarY(tick)"
                            stroke="var(--ppt-chart-grid)"
                            stroke-width="0.5"
                          />
                        </template>
                        <line
                          v-if="barChartYRange.min < 0"
                          x1="52"
                          :y1="barZeroY"
                          x2="460"
                          :y2="barZeroY"
                          stroke="var(--ppt-chart-zero-line)"
                          stroke-width="1"
                        />
                        <template v-for="(d, di) in slide.chart.data" :key="di">
                          <rect
                            :x="55 + di * (400 / slide.chart.data.length)"
                            :y="Math.min(mapBarY(d.value), barZeroY)"
                            :width="(400 / slide.chart.data.length) * 0.65"
                            :height="Math.max(1, Math.abs(mapBarY(d.value) - barZeroY))"
                            :fill="getSeriesColor(di)"
                            :class="['ppt-bar-rect', d.value < 0 ? 'ppt-bar-negative' : '']"
                            rx="3"
                          />
                          <!-- 柱子上方/下方显示数值 -->
                          <text
                            :x="
                              55 +
                              di * (400 / slide.chart.data.length) +
                              (400 / slide.chart.data.length) * 0.325
                            "
                            :y="
                              d.value >= 0
                                ? mapBarY(d.value) - 5
                                : mapBarY(d.value) +
                                  Math.abs(mapBarY(d.value) - barZeroY) +
                                  12
                            "
                            class="ppt-chart-label"
                            text-anchor="middle"
                            fill="var(--ppt-chart-value)"
                          >
                            {{ formatTickValue(d.value) }}
                          </text>
                          <text
                            :x="
                              55 +
                              di * (400 / slide.chart.data.length) +
                              (400 / slide.chart.data.length) * 0.3
                            "
                            :y="shouldRotateLabels ? BAR_CHART_X_CAT_Y_ROTATED : BAR_CHART_X_CAT_Y"
                            class="ppt-chart-label"
                            :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                            :transform="
                              shouldRotateLabels
                                ? chartXCatLabelTransform(
                                    55 +
                                      di * (400 / slide.chart.data.length) +
                                      (400 / slide.chart.data.length) * 0.3,
                                    BAR_CHART_X_CAT_Y_ROTATED
                                  )
                                : undefined
                            "
                            :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                          >
                            {{ d.label }}
                          </text>
                        </template>
                      </svg>
                    </template>

                    <!-- ═══ 折线图 line（支持多线） ═══ -->
                    <div
                      v-else-if="slide.chart.type === 'line'"
                      class="ppt-line-chart-wrap"
                    >
                      <div v-if="lineChartLegendItems.length" class="ppt-line-legend">
                        <span
                          v-for="(label, si) in lineChartLegendItems"
                          :key="'dl-leg' + si"
                          class="ppt-line-legend-item"
                        >
                          <span
                            class="ppt-line-legend-dot"
                            :style="{ background: getSeriesColor(si) }"
                          ></span>
                          {{ label }}
                        </span>
                      </div>
                      <svg
                        class="ppt-chart-svg"
                        :viewBox="LINE_CHART_VIEWBOX"
                        preserveAspectRatio="xMidYMid meet"
                      >
                      <!-- Y轴标签（左） -->
                      <text
                        v-if="slide.chart.y_label"
                        x="10"
                        y="120"
                        class="ppt-axis-label"
                        text-anchor="middle"
                        transform="rotate(-90, 10, 120)"
                      >
                        {{ slide.chart.y_label }}
                      </text>
                      <!-- X轴标签 -->
                      <text
                        v-if="slide.chart.x_label"
                        x="265"
                        :y="LINE_CHART_X_AXIS_LABEL_Y"
                        class="ppt-axis-label"
                        text-anchor="middle"
                      >
                        {{ slide.chart.x_label }}
                      </text>
                      <!-- Y轴刻度 -->
                      <template v-for="(tick, ti) in getLineYTicks()" :key="'dlyt' + ti">
                        <text
                          x="48"
                          :y="mapLineY(tick) + 4"
                          class="ppt-chart-label"
                          text-anchor="end"
                        >
                          {{ formatTickValue(tick) }}
                        </text>
                        <line
                          x1="52"
                          :y1="mapLineY(tick)"
                          x2="460"
                          :y2="mapLineY(tick)"
                          stroke="var(--ppt-chart-grid)"
                          stroke-width="0.5"
                        />
                      </template>
                      <template v-if="isMultiSeriesLine">
                        <template
                          v-for="(s, si) in lineChartSeriesList"
                          :key="'dml' + si"
                        >
                          <polyline
                            :points="lineSeriesPoints(si)"
                            class="ppt-polyline"
                            fill="none"
                            :style="chartStrokeStyle(si)"
                          />
                        </template>
                        <template
                          v-for="(cat, ci) in lineChartCategories"
                          :key="'dlx' + ci"
                        >
                          <text
                            :x="lineCategoryLabelX(ci)"
                            :y="
                              shouldRotateLabels
                                ? LINE_CHART_X_CAT_Y_ROTATED
                                : LINE_CHART_X_CAT_Y
                            "
                            class="ppt-chart-label"
                            :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                            :transform="
                              shouldRotateLabels
                                ? `rotate(-45, ${lineCategoryLabelX(ci)}, ${LINE_CHART_X_CAT_Y_ROTATED})`
                                : undefined
                            "
                            :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                          >
                            {{ cat }}
                          </text>
                        </template>
                        <template
                          v-for="(s, si) in lineChartSeriesList"
                          :key="'dld' + si"
                        >
                          <circle
                            v-for="(cat, ci) in lineChartCategories"
                            :key="'dld' + si + '-' + ci"
                            :cx="lineCategoryLabelX(ci)"
                            :cy="mapLineY(lineSeriesValue(ci, si))"
                            r="4"
                            class="ppt-line-dot"
                            :style="chartFillStyle(si)"
                          />
                        </template>
                      </template>
                      <template v-else>
                      <!-- 主线 -->
                      <polyline
                        :points="linePoints"
                        class="ppt-polyline"
                        fill="none"
                        :style="chartStrokeStyle(0)"
                      />
                      <template v-for="(d, di) in slide.chart.data" :key="'ld' + di">
                        <circle
                          :cx="55 + di * (400 / (slide.chart.data.length - 1))"
                          :cy="mapLineY(d.value)"
                          r="4"
                          class="ppt-line-dot"
                          :style="chartFillStyle(0)"
                        />
                        <text
                          :x="55 + di * (400 / (slide.chart.data.length - 1))"
                          :y="
                            shouldRotateLabels
                              ? LINE_CHART_X_CAT_Y_ROTATED
                              : LINE_CHART_X_CAT_Y
                          "
                          class="ppt-chart-label"
                          :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                          :transform="
                            shouldRotateLabels
                              ? `rotate(-45, ${
                                  55 + di * (400 / (slide.chart.data.length - 1))
                                }, ${LINE_CHART_X_CAT_Y_ROTATED})`
                              : undefined
                          "
                          :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                        >
                          {{ d.label }}
                        </text>
                      </template>
                      <!-- 第二条线 (secondary) -->
                      <polyline
                        v-if="multiLinePoints.secondary"
                        :points="multiLinePoints.secondary"
                        class="ppt-polyline ppt-line-secondary"
                        fill="none"
                        :style="chartStrokeStyle(1)"
                      />
                      <!-- 第三条线 (tertiary) -->
                      <polyline
                        v-if="multiLinePoints.tertiary"
                        :points="multiLinePoints.tertiary"
                        class="ppt-polyline ppt-line-tertiary"
                        fill="none"
                        :style="chartStrokeStyle(2)"
                      />
                      <!-- 图例（legacy 内嵌） -->
                      <template v-if="slide.chart.primary_data_label">
                        <rect
                          x="55"
                          y="2"
                          width="12"
                          height="4"
                          rx="1"
                          class="ppt-bar-rect"
                        />
                        <text x="71" y="7" class="ppt-chart-legend-text">
                          {{ slide.chart.primary_data_label }}
                        </text>
                        <template v-if="slide.chart.secondary_data_label">
                          <rect
                            x="175"
                            y="2"
                            width="12"
                            height="4"
                            rx="1"
                            class="ppt-bar-rect ppt-fill-secondary"
                          />
                          <text x="191" y="7" class="ppt-chart-legend-text">
                            {{ slide.chart.secondary_data_label }}
                          </text>
                        </template>
                        <template v-if="slide.chart.tertiary_data_label">
                          <rect
                            x="295"
                            y="2"
                            width="12"
                            height="4"
                            rx="1"
                            class="ppt-bar-rect ppt-fill-tertiary"
                          />
                          <text x="311" y="7" class="ppt-chart-legend-text">
                            {{ slide.chart.tertiary_data_label }}
                          </text>
                        </template>
                      </template>
                      </template>
                      </svg>
                    </div>

                    <!-- ═══ 面积图 area ═══ -->
                    <svg
                      v-else-if="slide.chart.type === 'area'"
                      class="ppt-chart-svg"
                      :viewBox="LINE_CHART_VIEWBOX"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <!-- Y轴标签 -->
                      <text
                        v-if="slide.chart.y_label"
                        :x="LINE_CHART_Y_AXIS_LABEL_X"
                        :y="LINE_CHART_Y_AXIS_LABEL_Y"
                        class="ppt-axis-label"
                        text-anchor="middle"
                        :transform="`rotate(-90, ${LINE_CHART_Y_AXIS_LABEL_X}, ${LINE_CHART_Y_AXIS_LABEL_Y})`"
                      >
                        {{ slide.chart.y_label }}
                      </text>
                      <!-- X轴标签 -->
                      <text
                        v-if="slide.chart.x_label"
                        x="265"
                        :y="LINE_CHART_X_AXIS_LABEL_Y"
                        class="ppt-axis-label"
                        text-anchor="middle"
                      >
                        {{ slide.chart.x_label }}
                      </text>
                      <!-- Y轴刻度 -->
                      <template v-for="(tick, ti) in getLineYTicks()" :key="'dayt' + ti">
                        <text
                          x="48"
                          :y="mapLineY(tick) + 4"
                          class="ppt-chart-label"
                          text-anchor="end"
                        >
                          {{ formatTickValue(tick) }}
                        </text>
                        <line
                          x1="52"
                          :y1="mapLineY(tick)"
                          x2="460"
                          :y2="mapLineY(tick)"
                          stroke="var(--ppt-chart-grid)"
                          stroke-width="0.5"
                        />
                      </template>
                      <polygon :points="areaFillPoints" class="ppt-area-fill" />
                      <polyline
                        :points="linePoints"
                        class="ppt-polyline"
                        fill="none"
                        :style="chartStrokeStyle(0)"
                      />
                      <template v-for="(d, di) in slide.chart.data" :key="'ad' + di">
                        <circle
                          :cx="55 + di * (400 / (slide.chart.data.length - 1))"
                          :cy="mapLineY(d.value)"
                          r="4"
                          class="ppt-line-dot"
                          :style="chartFillStyle(0)"
                        />
                        <text
                          :x="55 + di * (400 / (slide.chart.data.length - 1))"
                          :y="
                            shouldRotateLabels
                              ? LINE_CHART_X_CAT_Y_ROTATED
                              : LINE_CHART_X_CAT_Y
                          "
                          class="ppt-chart-label"
                          :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                          :transform="
                            shouldRotateLabels
                              ? chartXCatLabelTransform(
                                  55 + di * (400 / (slide.chart.data.length - 1)),
                                  LINE_CHART_X_CAT_Y_ROTATED
                                )
                              : undefined
                          "
                          :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                        >
                          {{ d.label }}
                        </text>
                      </template>
                    </svg>

                    <!-- ═══ 组合图 combo（柱状 + 折线） ═══ -->
                    <svg
                      v-else-if="slide.chart.type === 'combo'"
                      class="ppt-chart-svg"
                      viewBox="0 0 520 240"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <!-- Y轴标签（左，主数据） -->
                      <text
                        v-if="slide.chart.y_label"
                        x="10"
                        y="120"
                        class="ppt-axis-label"
                        text-anchor="middle"
                        transform="rotate(-90, 10, 120)"
                      >
                        {{ slide.chart.y_label }}
                      </text>
                      <!-- Y轴标签（右，次数据） -->
                      <text
                        v-if="slide.chart.secondary_y_label"
                        x="510"
                        y="120"
                        class="ppt-axis-label ppt-axis-label-secondary"
                        text-anchor="middle"
                        transform="rotate(90, 510, 120)"
                      >
                        {{ slide.chart.secondary_y_label }}
                      </text>
                      <!-- X轴标签 -->
                      <text
                        v-if="slide.chart.x_label"
                        x="275"
                        :y="COMBO_CHART_X_AXIS_LABEL_Y"
                        class="ppt-axis-label"
                        text-anchor="middle"
                      >
                        {{ slide.chart.x_label }}
                      </text>
                      <line
                        v-if="secondaryAxisStats.min < 0 && secondaryAxisStats.max > 0"
                        x1="55"
                        :y1="comboSecondaryZeroY"
                        x2="455"
                        :y2="comboSecondaryZeroY"
                        class="ppt-axis-zero-line"
                      />
                      <!-- Y轴刻度（主轴） -->
                      <template v-for="(tick, ti) in getBarYTicks()" :key="'dcyt' + ti">
                        <text
                          x="48"
                          :y="mapBarY(tick) + 4"
                          class="ppt-chart-label"
                          text-anchor="end"
                        >
                          {{ formatTickValue(tick) }}
                        </text>
                        <line
                          x1="52"
                          :y1="mapBarY(tick)"
                          x2="460"
                          :y2="mapBarY(tick)"
                          stroke="var(--ppt-chart-grid)"
                          stroke-width="0.5"
                        />
                      </template>
                      <line
                        v-if="barChartYRange.min < 0"
                        x1="52"
                        :y1="barZeroY"
                        x2="460"
                        :y2="barZeroY"
                        stroke="var(--ppt-chart-zero-line)"
                        stroke-width="1"
                      />
                      <!-- 柱状（主数据） -->
                      <template v-for="(pt, pi) in comboPrimaryPoints" :key="'cp' + pi">
                        <rect
                          :x="pt.x"
                          :y="pt.y"
                          :width="pt.w"
                          :height="pt.h"
                          :class="['ppt-bar-rect', pt.isNegative ? 'ppt-bar-negative' : '']"
                          rx="2"
                        />
                        <!-- 柱子上方/下方显示数值 -->
                        <text
                          :x="pt.x + pt.w / 2"
                          :y="pt.isNegative ? pt.y + pt.h + 12 : pt.y - 5"
                          class="ppt-chart-label"
                          text-anchor="middle"
                          fill="var(--ppt-chart-value)"
                          style="font-size: 9px"
                        >
                          {{ formatTickValue(pt.value) }}
                        </text>
                        <text
                          :x="pt.x + pt.w / 2"
                          :y="
                            shouldRotateLabels
                              ? LINE_CHART_X_CAT_Y_ROTATED
                              : LINE_CHART_X_CAT_Y
                          "
                          class="ppt-chart-label"
                          :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                          :transform="
                            shouldRotateLabels
                              ? `rotate(-45, ${pt.x + pt.w / 2}, ${LINE_CHART_X_CAT_Y_ROTATED})`
                              : undefined
                          "
                          :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                        >
                          {{ pt.label }}
                        </text>
                      </template>
                      <!-- 折线（次数据） -->
                      <polyline
                        :points="comboSecondaryLinePoints"
                        class="ppt-polyline ppt-line-secondary"
                        fill="none"
                      />
                      <template v-for="(dot, di) in comboSecondaryDots" :key="'cd' + di">
                        <circle
                          :cx="dot.cx"
                          :cy="dot.cy"
                          r="4"
                          class="ppt-line-dot ppt-dot-secondary"
                        />
                      </template>
                      <!-- 图例 -->
                      <template
                        v-if="
                          slide.chart.primary_data_label || slide.chart.secondary_data_label
                        "
                      >
                        <template v-if="slide.chart.primary_data_label">
                          <rect
                            x="55"
                            y="2"
                            width="12"
                            height="4"
                            rx="1"
                            class="ppt-bar-rect"
                          />
                          <text x="71" y="7" class="ppt-chart-legend-text">
                            {{ slide.chart.primary_data_label }}
                          </text>
                        </template>
                        <template v-if="slide.chart.secondary_data_label">
                          <line
                            :x1="slide.chart.primary_data_label ? 175 : 55"
                            y1="4"
                            :x2="slide.chart.primary_data_label ? 187 : 67"
                            y2="4"
                            class="ppt-polyline ppt-line-secondary"
                          />
                          <circle
                            :cx="slide.chart.primary_data_label ? 181 : 61"
                            cy="4"
                            r="2.5"
                            class="ppt-dot-secondary"
                          />
                          <text
                            :x="slide.chart.primary_data_label ? 193 : 73"
                            y="7"
                            class="ppt-chart-legend-text"
                          >
                            {{ slide.chart.secondary_data_label }}
                          </text>
                        </template>
                      </template>
                    </svg>

                    <!-- ═══ 水平柱状图 horizontal_bar ═══ -->
                    <svg
                      v-else-if="slide.chart.type === 'horizontal_bar'"
                      class="ppt-chart-svg ppt-chart-svg-hbar"
                      :viewBox="`0 0 ${HBAR_LAYOUT_DATA.viewW} ${horizontalBarViewBoxHeight(
                        slide.chart.data.length,
                        HBAR_LAYOUT_DATA.rowH
                      )}`"
                      preserveAspectRatio="xMinYMid meet"
                    >
                      <!-- X轴标签（底部） -->
                      <text
                        v-if="slide.chart.x_label"
                        :x="HBAR_LAYOUT_DATA.viewW / 2"
                        :y="
                          horizontalBarViewBoxHeight(
                            slide.chart.data.length,
                            HBAR_LAYOUT_DATA.rowH
                          ) - 4
                        "
                        class="ppt-axis-label"
                        text-anchor="middle"
                      >
                        {{ slide.chart.x_label }}
                      </text>
                      <!-- Y轴标签（左侧竖排） -->
                      <text
                        v-if="slide.chart.y_label"
                        x="8"
                        :y="Math.max(60, slide.chart.data.length * 16 + 20)"
                        class="ppt-axis-label"
                        text-anchor="middle"
                        :transform="`rotate(-90, 8, ${Math.max(
                          60,
                          slide.chart.data.length * 16 + 20
                        )})`"
                      >
                        {{ slide.chart.y_label }}
                      </text>
                      <template v-for="(d, di) in slide.chart.data" :key="'hb' + di">
                        <text
                          :x="HBAR_LAYOUT_DATA.labelX"
                          :y="16 + di * HBAR_LAYOUT_DATA.rowH + 12"
                          class="ppt-chart-label"
                          text-anchor="end"
                        >
                          {{ d.label }}
                        </text>
                        <rect
                          :x="HBAR_LAYOUT_DATA.barX"
                          :y="16 + di * HBAR_LAYOUT_DATA.rowH"
                          :width="
                            horizontalBarWidthPx(
                              d.value,
                              maxChartValue,
                              HBAR_LAYOUT_DATA.barMaxW,
                              slide.chart
                            )
                          "
                          height="22"
                          :class="['ppt-bar-rect', d.value < 0 ? 'ppt-bar-negative' : '']"
                          rx="3"
                        />
                        <text
                          :x="
                            horizontalBarValueTextX(
                              HBAR_LAYOUT_DATA.barX,
                              horizontalBarWidthPx(
                                d.value,
                                maxChartValue,
                                HBAR_LAYOUT_DATA.barMaxW,
                                slide.chart
                              ),
                              HBAR_LAYOUT_DATA.valueGap
                            )
                          "
                          :y="16 + di * HBAR_LAYOUT_DATA.rowH + 15"
                          class="ppt-chart-value-label"
                        >
                          {{ formatChartDataValue(d.value) }}
                        </text>
                      </template>
                    </svg>

                    <!-- ═══ 堆叠柱状图 stacked_bar ═══ -->
                    <div
                      v-else-if="slide.chart.type === 'stacked_bar'"
                      class="ppt-stacked-chart"
                    >
                      <!-- 轴标签说明行 -->
                      <div
                        v-if="slide.chart.x_label || slide.chart.y_label"
                        class="ppt-axis-labels-row"
                      >
                        <span v-if="slide.chart.y_label" class="ppt-axis-label-text"
                          >Y: {{ slide.chart.y_label }}</span
                        >
                        <span v-if="slide.chart.x_label" class="ppt-axis-label-text"
                          >X: {{ slide.chart.x_label }}</span
                        >
                      </div>
                      <div
                        class="ppt-stacked-legend"
                        v-if="getStackedBarCategoryLabels(slide.chart).length"
                      >
                        <span
                          v-for="(cat, ci) in getStackedBarCategoryLabels(slide.chart)"
                          :key="'sc' + ci"
                          class="ppt-stacked-legend-item"
                        >
                          <span
                            class="ppt-pie-dot"
                            :style="{ background: getSeriesColor(ci) }"
                          ></span>
                          {{ cat }}
                        </span>
                      </div>
                      <div
                        v-for="(d, di) in slide.chart.data"
                        :key="'sb' + di"
                        class="ppt-stacked-row"
                      >
                        <span class="ppt-stacked-label">{{ d.label }}</span>
                        <div class="ppt-stacked-bar-track">
                          <div
                            v-for="(v, vi) in getStackedBarRowValues(d)"
                            :key="'sv' + vi"
                            class="ppt-stacked-segment"
                            :style="{
                              width: (v / stackedBarMax) * 100 + '%',
                              background: getSeriesColor(vi),
                            }"
                            :title="stackedBarSegmentTitle(slide.chart, vi, v)"
                          >
                            <span v-if="v > 5" class="ppt-stacked-seg-text">{{
                              formatStackedBarSegmentLabel(slide.chart, v)
                            }}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- ═══ 饼图 pie ═══ -->
                    <svg
                      v-else-if="slide.chart.type === 'pie'"
                      class="ppt-chart-svg ppt-pie-svg"
                      :viewBox="`0 0 ${PIE_CHART_LAYOUT.viewW} ${PIE_CHART_LAYOUT.viewH}`"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <template v-for="(sl, si) in pieSlices" :key="'dp' + si">
                        <path :d="sl.path" :fill="sl.color" opacity="0.88" />
                        <line
                          :x1="sl.leaderX1"
                          :y1="sl.leaderY1"
                          :x2="sl.lx"
                          :y2="sl.ly"
                          class="ppt-pie-leader"
                        />
                        <text
                          :x="sl.tx"
                          :y="sl.ty"
                          :text-anchor="sl.anchor"
                          class="ppt-pie-label"
                          dominant-baseline="middle"
                        >
                          {{ sl.percent }}%
                        </text>
                      </template>
                      <!-- 图例 -->
                      <template v-for="(sl, si) in pieSlices" :key="'dpl' + si">
                        <rect
                          :x="PIE_CHART_LAYOUT.legendX"
                          :y="10 + si * 20"
                          width="10"
                          height="10"
                          :fill="sl.color"
                          rx="2"
                        />
                        <text
                          :x="PIE_CHART_LAYOUT.legendTextX"
                          :y="10 + si * 20 + 9"
                          class="ppt-pie-legend-text"
                        >
                          {{ sl.label }}
                        </text>
                      </template>
                    </svg>

                    <!-- ═══ 雷达图 radar（支持新旧两种格式） ═══ -->
                    <div
                      v-else-if="slide.chart.type === 'radar'"
                      class="ppt-radar-chart-wrap"
                    >
                      <div v-if="radarSeriesNorm.length > 1" class="ppt-radar-legend">
                        <span
                          v-for="s in radarSeriesNorm"
                          :key="s.name"
                          class="ppt-radar-legend-item"
                        >
                          <span
                            class="ppt-radar-legend-dot"
                            :style="{ background: s.color }"
                          ></span>
                          {{ s.name }}
                        </span>
                      </div>
                      <svg class="ppt-chart-svg ppt-radar-svg" viewBox="0 0 280 220">
                        <polygon
                          v-for="(ring, ri) in radarGridPolygons"
                          :key="'rdg' + ri"
                          :points="ring.points"
                          class="ppt-radar-grid"
                        />
                        <line
                          v-for="(ax, ai) in radarAxes"
                          :key="'rda' + ai"
                          :x1="120"
                          :y1="90"
                          :x2="ax.x"
                          :y2="ax.y"
                          class="ppt-radar-axis"
                        />
                        <text
                          v-for="(ring, ri) in radarGridPolygons"
                          :key="'rdv' + ri"
                          x="124"
                          :y="90 - 64 * ((ri + 1) / radarGridPolygons.length) + 4"
                          class="ppt-radar-tick"
                        >
                          {{ ring.value }}
                        </text>
                        <g v-for="(series, si) in radarSeriesShapes" :key="'rds' + si">
                          <polygon
                            :points="series.points"
                            class="ppt-radar-series-fill"
                            :style="{ fill: series.color, stroke: series.color }"
                          />
                          <circle
                            v-for="(dot, di) in series.dots"
                            :key="'rdd' + si + '-' + di"
                            :cx="dot.x"
                            :cy="dot.y"
                            r="3"
                            :style="{ fill: series.color }"
                          />
                        </g>
                        <text
                          v-for="(ax, ai) in radarAxes"
                          :key="'rdl' + ai"
                          :x="ax.tx"
                          :y="ax.ty"
                          :text-anchor="ax.anchor"
                          class="ppt-radar-axis-label"
                          dominant-baseline="middle"
                        >
                          {{ ax.label }}
                        </text>
                      </svg>
                    </div>

                    <!-- ═══ 漏斗图 funnel ═══ -->
                    <div v-else-if="slide.chart.type === 'funnel'" class="ppt-funnel-chart">
                      <div
                        v-for="(d, di) in slide.chart.data"
                        :key="'df' + di"
                        class="ppt-funnel-row"
                      >
                        <span class="ppt-funnel-label">{{ funnelItemLabel(d) }}</span>
                        <div class="ppt-funnel-bar-wrap">
                          <div
                            class="ppt-funnel-bar"
                            :style="{
                              width: funnelBarWidthPercent(
                                d.value,
                                maxChartValue,
                                slide.chart
                              ),
                              background: getSeriesColor(di),
                            }"
                          >
                            <span class="ppt-funnel-value">{{
                              formatChartDataValue(d.value)
                            }}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- ═══ 瀑布图 waterfall ═══ -->
                    <svg
                      v-else-if="slide.chart.type === 'waterfall'"
                      class="ppt-chart-svg"
                      :viewBox="LINE_CHART_VIEWBOX"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <text
                        v-if="slide.chart.y_label"
                        x="10"
                        y="120"
                        class="ppt-axis-label"
                        text-anchor="middle"
                        transform="rotate(-90, 10, 120)"
                      >
                        {{ slide.chart.y_label }}
                      </text>
                      <text
                        v-if="slide.chart.x_label"
                        x="265"
                        :y="LINE_CHART_X_AXIS_LABEL_Y"
                        class="ppt-axis-label"
                        text-anchor="middle"
                      >
                        {{ slide.chart.x_label }}
                      </text>
                      <!-- Y轴刻度 -->
                      <template
                        v-for="(tick, ti) in getWaterfallYTicks()"
                        :key="'dwfyt' + ti"
                      >
                        <text
                          x="48"
                          :y="mapWaterfallY(tick) + 4"
                          class="ppt-chart-label"
                          text-anchor="end"
                        >
                          {{ formatTickValue(tick) }}
                        </text>
                        <line
                          x1="52"
                          :y1="mapWaterfallY(tick)"
                          x2="460"
                          :y2="mapWaterfallY(tick)"
                          stroke="var(--ppt-chart-grid)"
                          stroke-width="0.5"
                        />
                      </template>
                      <template v-for="(bar, bi) in waterfallBars" :key="'dwf' + bi">
                        <rect
                          :x="55 + bi * (400 / waterfallBars.length) + 4"
                          :y="bar.y"
                          :width="400 / waterfallBars.length - 8"
                          :height="Math.max(2, bar.h)"
                          :class="[
                            'ppt-bar-rect',
                            bar.isTotal
                              ? 'ppt-bar-total'
                              : bar.isNegative
                              ? 'ppt-bar-negative'
                              : '',
                          ]"
                          rx="3"
                          opacity="0.88"
                        />
                        <text
                          :x="
                            55 +
                            bi * (400 / waterfallBars.length) +
                            400 / waterfallBars.length / 2
                          "
                          :y="bar.y - 5"
                          class="ppt-chart-label"
                          text-anchor="middle"
                          style="font-size: 9px"
                        >
                          {{ bar.value }}
                        </text>
                        <text
                          :x="
                            55 +
                            bi * (400 / waterfallBars.length) +
                            400 / waterfallBars.length / 2
                          "
                          :y="shouldRotateLabels ? LINE_CHART_X_CAT_Y_ROTATED : LINE_CHART_X_CAT_Y"
                          class="ppt-chart-label"
                          :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                          :transform="
                            shouldRotateLabels
                              ? chartXCatLabelTransform(
                                  55 +
                                    bi * (400 / waterfallBars.length) +
                                    400 / waterfallBars.length / 2,
                                  LINE_CHART_X_CAT_Y_ROTATED
                                )
                              : undefined
                          "
                          :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                        >
                          {{ bar.label }}
                        </text>
                      </template>
                    </svg>
                    <!-- 散点图 scatter -->
                    <svg
                      v-else-if="slide.chart.type === 'scatter'"
                      class="ppt-chart-svg"
                      :viewBox="LINE_CHART_VIEWBOX"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <text
                        v-if="slide.chart.y_label"
                        x="10"
                        y="110"
                        class="ppt-axis-label"
                        text-anchor="middle"
                        transform="rotate(-90, 10, 110)"
                      >
                        {{ slide.chart.y_label }}
                      </text>
                      <text
                        v-if="slide.chart.x_label"
                        x="255"
                        :y="LINE_CHART_X_AXIS_LABEL_Y"
                        class="ppt-axis-label"
                        text-anchor="middle"
                      >
                        {{ slide.chart.x_label }}
                      </text>
                      <template v-for="(tick, ti) in getScatterYTicks()" :key="'dsy' + ti">
                        <line
                          :x1="55"
                          :y1="mapScatterY(tick)"
                          :x2="455"
                          :y2="mapScatterY(tick)"
                          stroke="rgba(255,255,255,0.1)"
                          stroke-width="1"
                        />
                        <text
                          :x="50"
                          :y="mapScatterY(tick) + 3"
                          class="ppt-chart-label"
                          text-anchor="end"
                          style="font-size: 9px"
                        >
                          {{ formatTickValue(tick) }}
                        </text>
                      </template>
                      <template v-for="(tick, ti) in getScatterXTicks()" :key="'dsx' + ti">
                        <line
                          :x1="mapScatterX(tick)"
                          :y1="25"
                          :x2="mapScatterX(tick)"
                          :y2="195"
                          stroke="rgba(255,255,255,0.1)"
                          stroke-width="1"
                        />
                        <text
                          :x="mapScatterX(tick)"
                          :y="LINE_CHART_X_CAT_Y"
                          class="ppt-chart-label"
                          text-anchor="middle"
                          style="font-size: 9px"
                        >
                          {{ formatTickValue(tick) }}
                        </text>
                      </template>
                      <template v-for="(pt, pi) in scatterPoints" :key="'dsp' + pi">
                        <circle
                          :cx="pt.svgX"
                          :cy="pt.svgY"
                          r="5"
                          :fill="pt.color"
                          fill-opacity="0.8"
                          stroke="#fff"
                          stroke-width="0.5"
                        />
                        <text
                          :x="pt.svgX"
                          :y="pt.svgY - 8"
                          class="ppt-chart-label"
                          text-anchor="middle"
                          style="font-size: 8px"
                        >
                          {{ pt.label }}
                        </text>
                      </template>
                    </svg>
                    <!-- 热力图 heatmap -->
                    <svg
                      v-else-if="slide.chart.type === 'heatmap'"
                      class="ppt-chart-svg"
                      :viewBox="LINE_CHART_VIEWBOX"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <text
                        v-if="slide.chart.y_label"
                        x="8"
                        y="110"
                        class="ppt-axis-label"
                        text-anchor="middle"
                        transform="rotate(-90, 8, 110)"
                      >
                        {{ slide.chart.y_label }}
                      </text>
                      <text
                        v-if="slide.chart.x_label"
                        x="260"
                        :y="LINE_CHART_X_AXIS_LABEL_Y"
                        class="ppt-axis-label"
                        text-anchor="middle"
                      >
                        {{ slide.chart.x_label }}
                      </text>
                      <text
                        v-for="(col, ci) in heatmapParsed?.cols || []"
                        :key="'dhc' + ci"
                        :x="
                          60 +
                          ci * (400 / (heatmapParsed?.cols?.length || 1)) +
                          400 / (heatmapParsed?.cols?.length || 1) / 2
                        "
                        y="20"
                        class="ppt-chart-label"
                        text-anchor="middle"
                        style="font-size: 9px"
                      >
                        {{ col }}
                      </text>
                      <text
                        v-for="(row, ri) in heatmapParsed?.rows || []"
                        :key="'dhr' + ri"
                        x="56"
                        :y="
                          25 +
                          ri * (175 / (heatmapParsed?.rows?.length || 1)) +
                          175 / (heatmapParsed?.rows?.length || 1) / 2 +
                          3
                        "
                        class="ppt-chart-label"
                        text-anchor="end"
                        style="font-size: 9px"
                      >
                        {{ row }}
                      </text>
                      <template v-for="(cell, ci) in heatmapCells" :key="'dhv' + ci">
                        <rect
                          :x="cell.svgX + 1"
                          :y="cell.svgY + 1"
                          :width="Math.max(cell.width - 2, 1)"
                          :height="Math.max(cell.height - 2, 1)"
                          :fill="cell.color"
                          rx="2"
                          opacity="0.85"
                        />
                        <text
                          :x="cell.svgX + cell.width / 2"
                          :y="cell.svgY + cell.height / 2 + 3"
                          class="ppt-chart-label"
                          text-anchor="middle"
                          style="font-size: 9px; fill: #fff; font-weight: 600"
                        >
                          {{ cell.value }}
                        </text>
                      </template>
                    </svg>
                    <!-- 树形图 treemap -->
                    <svg
                      v-else-if="slide.chart.type === 'treemap'"
                      class="ppt-chart-svg"
                      :viewBox="LINE_CHART_VIEWBOX"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <template v-for="(rect, ri) in treemapRects" :key="'dtr' + ri">
                        <rect
                          :x="rect.x + 1"
                          :y="rect.y + 1"
                          :width="Math.max(rect.width - 2, 1)"
                          :height="Math.max(rect.height - 2, 1)"
                          :fill="rect.color"
                          rx="3"
                          opacity="0.88"
                        />
                        <text
                          v-if="rect.width > 30 && rect.height > 20"
                          :x="rect.x + rect.width / 2"
                          :y="rect.y + rect.height / 2 - 4"
                          class="ppt-chart-label"
                          text-anchor="middle"
                          style="font-size: 10px; fill: #fff; font-weight: 600"
                        >
                          {{ rect.label }}
                        </text>
                        <text
                          v-if="rect.width > 30 && rect.height > 30"
                          :x="rect.x + rect.width / 2"
                          :y="rect.y + rect.height / 2 + 10"
                          class="ppt-chart-label"
                          text-anchor="middle"
                          style="font-size: 9px; fill: rgba(255, 255, 255, 0.7)"
                        >
                          {{ rect.value }} ({{ rect.percent }}%)
                        </text>
                      </template>
                    </svg>
                    <div
                      v-else-if="isTimelineChart(slide.chart)"
                      class="ppt-timeline-chart"
                    >
                      <div
                        v-if="
                          slide.chart.x_label ||
                          slide.chart.xLabel ||
                          slide.chart.y_label ||
                          slide.chart.yLabel
                        "
                        class="ppt-timeline-axis-hint"
                      >
                        <span v-if="slide.chart.x_label || slide.chart.xLabel">{{
                          slide.chart.x_label || slide.chart.xLabel
                        }}</span>
                        <template
                          v-if="
                            (slide.chart.x_label || slide.chart.xLabel) &&
                            (slide.chart.y_label || slide.chart.yLabel)
                          "
                        >
                          ·
                        </template>
                        <span v-if="slide.chart.y_label || slide.chart.yLabel">{{
                          slide.chart.y_label || slide.chart.yLabel
                        }}</span>
                      </div>
                      <div
                        v-for="(d, di) in slide.chart.data || []"
                        :key="'tl-ds-' + di"
                        class="ppt-timeline-item"
                      >
                        <div class="ppt-timeline-track">
                          <div
                            class="ppt-timeline-dot"
                            :style="{ background: getSeriesColor(di) }"
                          ></div>
                          <div
                            v-if="di < (slide.chart.data?.length || 0) - 1"
                            class="ppt-timeline-line"
                          ></div>
                        </div>
                        <div class="ppt-timeline-body">
                          <div
                            v-if="d.value != null && String(d.value) !== ''"
                            class="ppt-timeline-step"
                          >
                            {{ d.value }}
                          </div>
                          <div class="ppt-timeline-date">{{ d.label }}</div>
                          <div class="ppt-timeline-desc">
                            {{ d.description || d.desc || d.text || d.title || "" }}
                          </div>
                        </div>
                      </div>
                    </div>
                    <!-- 仪表盘图 gauge -->
                    <svg
                      v-else-if="slide.chart.type === 'gauge'"
                      class="ppt-chart-svg ppt-gauge-svg"
                      viewBox="0 0 260 160"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <template v-if="gaugeData">
                        <path
                          :d="gaugeArcPath(1)"
                          fill="none"
                          stroke="rgba(255,255,255,0.12)"
                          stroke-width="16"
                          stroke-linecap="round"
                        />
                        <path
                          :d="gaugeArcPath(gaugeData.ratio)"
                          fill="none"
                          :stroke="gaugeData.color"
                          stroke-width="16"
                          stroke-linecap="round"
                        />
                        <template
                          v-for="(tick, ti) in gaugeTickMarks(gaugeData.min, gaugeData.max)"
                          :key="'dgt' + ti"
                        >
                          <line
                            :x1="tick.x1"
                            :y1="tick.y1"
                            :x2="tick.x2"
                            :y2="tick.y2"
                            stroke="rgba(255,255,255,0.3)"
                            stroke-width="1"
                          />
                          <text
                            :x="tick.x2 + (tick.x2 > 130 ? 4 : -4)"
                            :y="tick.y2 + 3"
                            class="ppt-chart-label"
                            :text-anchor="tick.x2 > 130 ? 'start' : 'end'"
                            style="font-size: 8px"
                          >
                            {{ tick.label }}
                          </text>
                        </template>
                        <text
                          x="130"
                          y="115"
                          text-anchor="middle"
                          class="ppt-gauge-value"
                          :fill="gaugeData.color"
                        >
                          {{ gaugeData.value }}{{ gaugeData.unit }}
                        </text>
                        <text x="130" y="135" text-anchor="middle" class="ppt-gauge-label">
                          {{ gaugeData.label }}
                        </text>
                        <template v-if="gaugeData.target !== undefined">
                          <line
                            :x1="
                              130 +
                              95 *
                                Math.cos(
                                  Math.PI -
                                    ((gaugeData.target - gaugeData.min) /
                                      (gaugeData.max - gaugeData.min || 1)) *
                                      Math.PI
                                )
                            "
                            :y1="
                              130 +
                              95 *
                                Math.sin(
                                  Math.PI -
                                    ((gaugeData.target - gaugeData.min) /
                                      (gaugeData.max - gaugeData.min || 1)) *
                                      Math.PI
                                )
                            "
                            :x2="
                              130 +
                              108 *
                                Math.cos(
                                  Math.PI -
                                    ((gaugeData.target - gaugeData.min) /
                                      (gaugeData.max - gaugeData.min || 1)) *
                                      Math.PI
                                )
                            "
                            :y2="
                              130 +
                              108 *
                                Math.sin(
                                  Math.PI -
                                    ((gaugeData.target - gaugeData.min) /
                                      (gaugeData.max - gaugeData.min || 1)) *
                                      Math.PI
                                )
                            "
                            stroke="#fff"
                            stroke-width="2"
                          />
                        </template>
                      </template>
                    </svg>
                  </div>
                  <PptTableBlock
                    v-if="slide.table"
                    :table="slide.table"
                    :page-references="slide.page_references"
                    @ref-click="onPptTableRefClick($event, slide)"
                  />
                </div>
              </div>
              <!-- /ppt-content-split for data page with content+chart -->

              <!-- 仅有表格、无文字的 data 页（全宽表格） -->
              <div
                v-else-if="!isHeroLeftSlide(slide) && slide.table && !slide.chart"
                class="ppt-chart-area ppt-chart-area-full ppt-table-area-full"
              >
                <PptTableBlock
                  :table="slide.table"
                  :page-references="slide.page_references"
                  @ref-click="onPptTableRefClick($event, slide)"
                />
              </div>
              <!-- 仅有图表、无文字的 data 页（全宽图表） -->
              <div
                v-else-if="slide.chart && !slide.table"
                class="ppt-chart-area ppt-chart-area-full"
                :class="{ 'ppt-chart-contained': isVisualOnlySlide(slide) }"
              >
                <div class="ppt-chart-title">{{ slide.chart.title }}</div>
                <PptChartSourceLine
                  :chart="slide.chart"
                  :page-references="slide.page_references"
                />

                <template v-if="slide.chart.type === 'bar'">
                  <div v-if="isGroupedBar" class="ppt-grouped-bar-wrap">
                    <div
                      class="ppt-grouped-bar-legend"
                      v-if="groupedBarSeriesList.length"
                    >
                      <span
                        v-for="(s, si) in groupedBarSeriesList"
                        :key="'dfgl' + si"
                        class="ppt-grouped-bar-legend-item"
                      >
                        <span
                          class="ppt-pie-dot"
                          :style="{ background: getSeriesColor(si) }"
                        ></span
                        >{{ groupedBarSeriesLabel(s) }}
                      </span>
                    </div>
                    <svg
                      class="ppt-chart-svg"
                      viewBox="0 0 500 260"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <text
                        v-if="slide.chart.y_label"
                        x="10"
                        y="110"
                        class="ppt-axis-label"
                        text-anchor="middle"
                        transform="rotate(-90, 10, 110)"
                      >
                        {{ slide.chart.y_label }}
                      </text>
                      <text
                        v-if="slide.chart.x_label"
                        x="260"
                        y="252"
                        class="ppt-axis-label"
                        text-anchor="middle"
                      >
                        {{ slide.chart.x_label }}
                      </text>
                      <!-- Y轴刻度 -->
                      <template v-for="(tick, ti) in getBarYTicks()" :key="'dfgyt' + ti">
                        <text
                          x="48"
                          :y="mapBarY(tick) + 4"
                          class="ppt-chart-label"
                          text-anchor="end"
                        >
                          {{ formatTickValue(tick) }}
                        </text>
                        <line
                          x1="52"
                          :y1="mapBarY(tick)"
                          x2="460"
                          :y2="mapBarY(tick)"
                          stroke="var(--ppt-chart-grid)"
                          stroke-width="0.5"
                        />
                      </template>
                      <line
                        v-if="barChartYRange.min < 0"
                        x1="52"
                        :y1="barZeroY"
                        x2="460"
                        :y2="barZeroY"
                        stroke="var(--ppt-chart-zero-line)"
                        stroke-width="1"
                      />
                      <template
                        v-for="(cat, ci) in groupedBarCategories"
                        :key="'dfgb-cat-' + ci"
                      >
                        <template
                          v-for="(s, si) in groupedBarSeriesList"
                          :key="'dfgb-bar-' + ci + '-' + si"
                        >
                          <rect
                            :x="groupedBarRectX(ci, si)"
                            :y="Math.min(mapBarY(groupedBarValue(ci, si)), barZeroY)"
                            :width="groupedBarRectWidth()"
                            :height="
                              Math.max(
                                1,
                                Math.abs(mapBarY(groupedBarValue(ci, si)) - barZeroY)
                              )
                            "
                            :style="groupedBarRectStyle(si, groupedBarValue(ci, si))"
                            :class="[
                              'ppt-bar-rect',
                              groupedBarValue(ci, si) < 0 ? 'ppt-bar-negative' : '',
                            ]"
                            rx="3"
                          />
                        </template>
                        <text
                          :x="groupedBarCategoryLabelX(ci)"
                          :y="shouldRotateLabels ? BAR_CHART_X_CAT_Y_ROTATED : BAR_CHART_X_CAT_Y"
                          class="ppt-chart-label"
                          :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                          :transform="
                            shouldRotateLabels
                              ? chartXCatLabelTransform(
                                  groupedBarCategoryLabelX(ci),
                                  BAR_CHART_X_CAT_Y_ROTATED
                                )
                              : undefined
                          "
                          :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                        >
                          {{ cat }}
                        </text>
                      </template>
                    </svg>
                  </div>
                  <svg
                    v-else
                    class="ppt-chart-svg"
                    viewBox="0 0 500 260"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <text
                      v-if="slide.chart.y_label"
                      x="10"
                      y="110"
                      class="ppt-axis-label"
                      text-anchor="middle"
                      transform="rotate(-90, 10, 110)"
                    >
                      {{ slide.chart.y_label }}
                    </text>
                    <text
                      v-if="slide.chart.x_label"
                      x="260"
                      y="252"
                      class="ppt-axis-label"
                      text-anchor="middle"
                    >
                      {{ slide.chart.x_label }}
                    </text>
                    <!-- Y轴刻度 -->
                    <template v-for="(tick, ti) in getBarYTicks()" :key="'dfbyt' + ti">
                      <text
                        x="48"
                        :y="mapBarY(tick) + 4"
                        class="ppt-chart-label"
                        text-anchor="end"
                      >
                        {{ formatTickValue(tick) }}
                      </text>
                      <line
                        x1="52"
                        :y1="mapBarY(tick)"
                        x2="460"
                        :y2="mapBarY(tick)"
                        stroke="var(--ppt-chart-grid)"
                        stroke-width="0.5"
                      />
                    </template>
                    <line
                      v-if="barChartYRange.min < 0"
                      x1="52"
                      :y1="barZeroY"
                      x2="460"
                      :y2="barZeroY"
                      stroke="var(--ppt-chart-zero-line)"
                      stroke-width="1"
                    />
                    <template v-for="(d, di) in slide.chart.data" :key="'dfb' + di">
                      <rect
                        :x="55 + di * (400 / slide.chart.data.length)"
                        :y="Math.min(mapBarY(d.value), barZeroY)"
                        :width="(400 / slide.chart.data.length) * 0.65"
                        :height="Math.max(1, Math.abs(mapBarY(d.value) - barZeroY))"
                        :class="['ppt-bar-rect', d.value < 0 ? 'ppt-bar-negative' : '']"
                        rx="3"
                      />
                      <!-- 柱子上方/下方显示数值 -->
                      <text
                        :x="
                          55 +
                          di * (400 / slide.chart.data.length) +
                          (400 / slide.chart.data.length) * 0.325
                        "
                        :y="
                          d.value >= 0
                            ? mapBarY(d.value) - 5
                            : mapBarY(d.value) + Math.abs(mapBarY(d.value) - barZeroY) + 12
                        "
                        class="ppt-chart-label"
                        text-anchor="middle"
                        fill="var(--ppt-chart-value)"
                      >
                        {{ formatTickValue(d.value) }}
                      </text>
                      <text
                        :x="
                          55 +
                          di * (400 / slide.chart.data.length) +
                          (400 / slide.chart.data.length) * 0.3
                        "
                        :y="shouldRotateLabels ? BAR_CHART_X_CAT_Y_ROTATED : BAR_CHART_X_CAT_Y"
                        class="ppt-chart-label"
                        :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                        :transform="
                          shouldRotateLabels
                            ? chartXCatLabelTransform(
                                55 +
                                  di * (400 / slide.chart.data.length) +
                                  (400 / slide.chart.data.length) * 0.3,
                                BAR_CHART_X_CAT_Y_ROTATED
                              )
                            : undefined
                        "
                        :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                      >
                        {{ d.label }}
                      </text>
                    </template>
                  </svg>
                </template>

                <!-- 组合图 combo（全宽 data 页） -->
                <svg
                  v-else-if="slide.chart.type === 'combo'"
                  class="ppt-chart-svg"
                  viewBox="0 0 520 240"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <text
                    v-if="slide.chart.y_label"
                    x="10"
                    y="120"
                    class="ppt-axis-label"
                    text-anchor="middle"
                    transform="rotate(-90, 10, 120)"
                  >
                    {{ slide.chart.y_label }}
                  </text>
                  <text
                    v-if="slide.chart.secondary_y_label"
                    x="510"
                    y="120"
                    class="ppt-axis-label ppt-axis-label-secondary"
                    text-anchor="middle"
                    transform="rotate(90, 510, 120)"
                  >
                    {{ slide.chart.secondary_y_label }}
                  </text>
                  <text
                    v-if="slide.chart.x_label"
                    x="275"
                    :y="COMBO_CHART_X_AXIS_LABEL_Y"
                    class="ppt-axis-label"
                    text-anchor="middle"
                  >
                    {{ slide.chart.x_label }}
                  </text>
                  <line
                    v-if="secondaryAxisStats.min < 0 && secondaryAxisStats.max > 0"
                    x1="55"
                    :y1="comboSecondaryZeroY"
                    x2="455"
                    :y2="comboSecondaryZeroY"
                    class="ppt-axis-zero-line"
                  />
                  <template v-for="(tick, ti) in getBarYTicks()" :key="'dfcyt' + ti">
                    <text
                      x="48"
                      :y="mapBarY(tick) + 4"
                      class="ppt-chart-label"
                      text-anchor="end"
                    >
                      {{ formatTickValue(tick) }}
                    </text>
                    <line
                      x1="52"
                      :y1="mapBarY(tick)"
                      x2="460"
                      :y2="mapBarY(tick)"
                      stroke="var(--ppt-chart-grid)"
                      stroke-width="0.5"
                    />
                  </template>
                  <line
                    v-if="barChartYRange.min < 0"
                    x1="52"
                    :y1="barZeroY"
                    x2="460"
                    :y2="barZeroY"
                    stroke="var(--ppt-chart-zero-line)"
                    stroke-width="1"
                  />
                  <template v-for="(pt, pi) in comboPrimaryPoints" :key="'dfcp' + pi">
                    <rect
                      :x="pt.x"
                      :y="pt.y"
                      :width="pt.w"
                      :height="pt.h"
                      :class="['ppt-bar-rect', pt.isNegative ? 'ppt-bar-negative' : '']"
                      rx="2"
                    />
                    <text
                      :x="pt.x + pt.w / 2"
                      :y="pt.isNegative ? pt.y + pt.h + 12 : pt.y - 5"
                      class="ppt-chart-label"
                      text-anchor="middle"
                      fill="var(--ppt-chart-value)"
                      style="font-size: 9px"
                    >
                      {{ formatTickValue(pt.value) }}
                    </text>
                    <text
                      :x="pt.x + pt.w / 2"
                      :y="
                        shouldRotateLabels ? LINE_CHART_X_CAT_Y_ROTATED : LINE_CHART_X_CAT_Y
                      "
                      class="ppt-chart-label"
                      :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                      :transform="
                        shouldRotateLabels
                          ? `rotate(-45, ${pt.x + pt.w / 2}, ${LINE_CHART_X_CAT_Y_ROTATED})`
                          : undefined
                      "
                      :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                    >
                      {{ pt.label }}
                    </text>
                  </template>
                  <polyline
                    :points="comboSecondaryLinePoints"
                    class="ppt-polyline ppt-line-secondary"
                    fill="none"
                  />
                  <template v-for="(dot, di) in comboSecondaryDots" :key="'dfcd' + di">
                    <circle
                      :cx="dot.cx"
                      :cy="dot.cy"
                      r="4"
                      class="ppt-line-dot ppt-dot-secondary"
                    />
                  </template>
                  <template
                    v-if="
                      slide.chart.primary_data_label || slide.chart.secondary_data_label
                    "
                  >
                    <template v-if="slide.chart.primary_data_label">
                      <rect
                        x="55"
                        y="2"
                        width="12"
                        height="4"
                        rx="1"
                        class="ppt-bar-rect"
                      />
                      <text x="71" y="7" class="ppt-chart-legend-text">
                        {{ slide.chart.primary_data_label }}
                      </text>
                    </template>
                    <template v-if="slide.chart.secondary_data_label">
                      <line
                        :x1="slide.chart.primary_data_label ? 175 : 55"
                        y1="4"
                        :x2="slide.chart.primary_data_label ? 187 : 67"
                        y2="4"
                        class="ppt-polyline ppt-line-secondary"
                      />
                      <circle
                        :cx="slide.chart.primary_data_label ? 181 : 61"
                        cy="4"
                        r="2.5"
                        class="ppt-dot-secondary"
                      />
                      <text
                        :x="slide.chart.primary_data_label ? 193 : 73"
                        y="7"
                        class="ppt-chart-legend-text"
                      >
                        {{ slide.chart.secondary_data_label }}
                      </text>
                    </template>
                  </template>
                </svg>

                <div
                  v-else-if="slide.chart.type === 'line'"
                  class="ppt-line-chart-wrap"
                >
                  <div
                    v-if="lineChartLegendItems.length"
                    class="ppt-line-legend"
                  >
                    <span
                      v-for="(sn, si) in lineChartLegendItems"
                      :key="'dfl-leg' + si"
                      class="ppt-line-legend-item"
                    >
                      <span
                        class="ppt-line-legend-dot"
                        :style="{ background: getSeriesColor(si) }"
                      ></span>
                      {{ sn }}
                    </span>
                  </div>
                  <svg
                  class="ppt-chart-svg"
                  :viewBox="LINE_CHART_VIEWBOX"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <text
                    v-if="slide.chart.y_label"
                    :x="LINE_CHART_Y_AXIS_LABEL_X"
                    :y="LINE_CHART_Y_AXIS_LABEL_Y"
                    class="ppt-axis-label"
                    text-anchor="middle"
                    :transform="`rotate(-90, ${LINE_CHART_Y_AXIS_LABEL_X}, ${LINE_CHART_Y_AXIS_LABEL_Y})`"
                  >
                    {{ slide.chart.y_label }}
                  </text>
                  <text
                    v-if="slide.chart.x_label"
                    x="265"
                    :y="LINE_CHART_X_AXIS_LABEL_Y"
                    class="ppt-axis-label"
                    text-anchor="middle"
                  >
                    {{ slide.chart.x_label }}
                  </text>
                  <!-- Y轴刻度 -->
                  <template v-for="(tick, ti) in getLineYTicks()" :key="'dflyt' + ti">
                    <text
                      x="48"
                      :y="mapLineY(tick) + 4"
                      class="ppt-chart-label"
                      text-anchor="end"
                    >
                      {{ formatTickValue(tick) }}
                    </text>
                    <line
                      x1="52"
                      :y1="mapLineY(tick)"
                      x2="460"
                      :y2="mapLineY(tick)"
                      stroke="var(--ppt-chart-grid)"
                      stroke-width="0.5"
                    />
                  </template>
                  <template v-if="isMultiSeriesLine">
                    <template
                      v-for="(s, si) in lineChartSeriesList"
                      :key="'dfml' + si"
                    >
                      <polyline
                        :points="lineSeriesPoints(si)"
                        class="ppt-polyline"
                        fill="none"
                        :style="chartStrokeStyle(si)"
                      />
                    </template>
                    <template
                      v-for="(cat, ci) in lineChartCategories"
                      :key="'dfxl' + ci"
                    >
                      <text
                        :x="lineCategoryLabelX(ci)"
                        :y="
                          shouldRotateLabels ? LINE_CHART_X_CAT_Y_ROTATED : LINE_CHART_X_CAT_Y
                        "
                        class="ppt-chart-label"
                        :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                        :transform="
                          shouldRotateLabels
                            ? `rotate(-45, ${lineCategoryLabelX(ci)}, ${LINE_CHART_X_CAT_Y_ROTATED})`
                            : undefined
                        "
                        :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                      >
                        {{ cat }}
                      </text>
                    </template>
                    <template
                      v-for="(s, si) in lineChartSeriesList"
                      :key="'dfld' + si"
                    >
                      <circle
                        v-for="(cat, ci) in lineChartCategories"
                        :key="'dfld' + si + '-' + ci"
                        :cx="lineCategoryLabelX(ci)"
                        :cy="mapLineY(lineSeriesValue(ci, si))"
                        r="4"
                        class="ppt-line-dot"
                        :style="chartFillStyle(si)"
                      />
                    </template>
                  </template>
                  <template v-else>
                  <polyline
                    :points="linePoints"
                    class="ppt-polyline"
                    fill="none"
                    :style="chartStrokeStyle(0)"
                  />
                  <polyline
                    v-if="multiLinePoints.secondary"
                    :points="multiLinePoints.secondary"
                    class="ppt-polyline ppt-line-secondary"
                    fill="none"
                    :style="chartStrokeStyle(1)"
                  />
                  <polyline
                    v-if="multiLinePoints.tertiary"
                    :points="multiLinePoints.tertiary"
                    class="ppt-polyline ppt-line-tertiary"
                    fill="none"
                    :style="chartStrokeStyle(2)"
                  />
                  <template v-for="(d, di) in slide.chart.data" :key="'dfl' + di">
                    <circle
                      :cx="55 + di * (400 / (slide.chart.data.length - 1))"
                      :cy="mapLineY(d.value)"
                      r="4"
                      class="ppt-line-dot"
                      :style="chartFillStyle(0)"
                    />
                    <circle
                      v-if="d.secondary_value !== undefined"
                      :cx="55 + di * (400 / (slide.chart.data.length - 1))"
                      :cy="mapLineY(d.secondary_value ?? 0)"
                      r="4"
                      class="ppt-line-dot ppt-line-dot-secondary"
                      :style="chartFillStyle(1)"
                    />
                    <text
                      :x="55 + di * (400 / (slide.chart.data.length - 1))"
                      :y="
                        shouldRotateLabels ? LINE_CHART_X_CAT_Y_ROTATED : LINE_CHART_X_CAT_Y
                      "
                      class="ppt-chart-label"
                      :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                      :transform="
                        shouldRotateLabels
                          ? `rotate(-45, ${
                              55 + di * (400 / (slide.chart.data.length - 1))
                            }, ${LINE_CHART_X_CAT_Y_ROTATED})`
                          : undefined
                      "
                      :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                    >
                      {{ d.label }}
                    </text>
                  </template>
                  </template>
                </svg>
                </div>

                <template v-else-if="slide.chart.type === 'pie'">
                <svg
                  class="ppt-chart-svg ppt-pie-svg"
                  :viewBox="`0 0 ${PIE_CHART_LAYOUT_WIDE.viewW} ${PIE_CHART_LAYOUT_WIDE.viewH}`"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <template v-for="(sl, si) in pieSlices" :key="'dfp' + si">
                    <path :d="sl.path" :fill="sl.color" opacity="0.88" />
                    <line
                      :x1="sl.leaderX1"
                      :y1="sl.leaderY1"
                      :x2="sl.lx"
                      :y2="sl.ly"
                      class="ppt-pie-leader"
                    />
                    <text
                      :x="sl.tx"
                      :y="sl.ty"
                      :text-anchor="sl.anchor"
                      class="ppt-pie-label"
                      dominant-baseline="middle"
                    >
                      {{ sl.percent }}%
                    </text>
                  </template>
                  <template v-for="(sl, si) in pieSlices" :key="'dfpl' + si">
                    <rect
                      :x="PIE_CHART_LAYOUT_WIDE.legendX"
                      :y="10 + si * 22"
                      width="10"
                      height="10"
                      :fill="sl.color"
                      rx="2"
                    />
                    <text
                      :x="PIE_CHART_LAYOUT_WIDE.legendTextX"
                      :y="10 + si * 22 + 9"
                      class="ppt-pie-legend-text"
                    >
                      {{ sl.label }}
                    </text>
                  </template>
                </svg>
                </template>

                <!-- ═══ 雷达图 radar (full-width data) ═══ -->
                <div v-else-if="slide.chart.type === 'radar'" class="ppt-radar-chart-wrap">
                  <div v-if="radarSeriesNorm.length > 1" class="ppt-radar-legend">
                    <span
                      v-for="s in radarSeriesNorm"
                      :key="s.name"
                      class="ppt-radar-legend-item"
                    >
                      <span
                        class="ppt-radar-legend-dot"
                        :style="{ background: s.color }"
                      ></span>
                      {{ s.name }}
                    </span>
                  </div>
                  <svg class="ppt-chart-svg ppt-radar-svg" viewBox="0 0 280 220">
                    <polygon
                      v-for="(ring, ri) in radarGridPolygons"
                      :key="'dfrg' + ri"
                      :points="ring.points"
                      class="ppt-radar-grid"
                    />
                    <line
                      v-for="(ax, ai) in radarAxes"
                      :key="'dfra' + ai"
                      :x1="120"
                      :y1="90"
                      :x2="ax.x"
                      :y2="ax.y"
                      class="ppt-radar-axis"
                    />
                    <text
                      v-for="(ring, ri) in radarGridPolygons"
                      :key="'dfrv' + ri"
                      x="124"
                      :y="90 - 64 * ((ri + 1) / radarGridPolygons.length) + 4"
                      class="ppt-radar-tick"
                    >
                      {{ ring.value }}
                    </text>
                    <g v-for="(series, si) in radarSeriesShapes" :key="'dfrs' + si">
                      <polygon
                        :points="series.points"
                        class="ppt-radar-series-fill"
                        :style="{ fill: series.color, stroke: series.color }"
                      />
                      <circle
                        v-for="(dot, di) in series.dots"
                        :key="'dfrd' + si + '-' + di"
                        :cx="dot.x"
                        :cy="dot.y"
                        r="3"
                        :style="{ fill: series.color }"
                      />
                    </g>
                    <text
                      v-for="(ax, ai) in radarAxes"
                      :key="'dfrl' + ai"
                      :x="ax.tx"
                      :y="ax.ty"
                      :text-anchor="ax.anchor"
                      class="ppt-radar-axis-label"
                      dominant-baseline="middle"
                    >
                      {{ ax.label }}
                    </text>
                  </svg>
                </div>

                <!-- ═══ 瀑布图 waterfall (full-width data) ═══ -->
                <svg
                  v-else-if="slide.chart.type === 'waterfall'"
                  class="ppt-chart-svg"
                  :viewBox="LINE_CHART_VIEWBOX"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <text
                    v-if="slide.chart.y_label"
                    :x="LINE_CHART_Y_AXIS_LABEL_X"
                    :y="LINE_CHART_Y_AXIS_LABEL_Y"
                    class="ppt-axis-label"
                    text-anchor="middle"
                    :transform="`rotate(-90, ${LINE_CHART_Y_AXIS_LABEL_X}, ${LINE_CHART_Y_AXIS_LABEL_Y})`"
                  >
                    {{ slide.chart.y_label }}
                  </text>
                  <text
                    v-if="slide.chart.x_label"
                    x="265"
                    :y="LINE_CHART_X_AXIS_LABEL_Y"
                    class="ppt-axis-label"
                    text-anchor="middle"
                  >
                    {{ slide.chart.x_label }}
                  </text>
                  <!-- Y轴刻度 -->
                  <template v-for="(tick, ti) in getWaterfallYTicks()" :key="'dfwfyt' + ti">
                    <text
                      x="48"
                      :y="mapWaterfallY(tick) + 4"
                      class="ppt-chart-label"
                      text-anchor="end"
                    >
                      {{ formatTickValue(tick) }}
                    </text>
                    <line
                      x1="52"
                      :y1="mapWaterfallY(tick)"
                      x2="460"
                      :y2="mapWaterfallY(tick)"
                      stroke="var(--ppt-chart-grid)"
                      stroke-width="0.5"
                    />
                  </template>
                  <template v-for="(bar, bi) in waterfallBars" :key="'dfwf' + bi">
                    <rect
                      :x="55 + bi * (400 / waterfallBars.length) + 4"
                      :y="bar.y"
                      :width="400 / waterfallBars.length - 8"
                      :height="Math.max(2, bar.h)"
                      :class="[
                        'ppt-bar-rect',
                        bar.isTotal
                          ? 'ppt-bar-total'
                          : bar.isNegative
                          ? 'ppt-bar-negative'
                          : '',
                      ]"
                      rx="3"
                      opacity="0.88"
                    />
                    <text
                      :x="
                        55 +
                        bi * (400 / waterfallBars.length) +
                        400 / waterfallBars.length / 2
                      "
                      :y="bar.y - 5"
                      class="ppt-chart-label"
                      text-anchor="middle"
                      style="font-size: 9px"
                    >
                      {{ bar.value }}
                    </text>
                    <text
                      :x="
                        55 +
                        bi * (400 / waterfallBars.length) +
                        400 / waterfallBars.length / 2
                      "
                      :y="shouldRotateLabels ? LINE_CHART_X_CAT_Y_ROTATED : LINE_CHART_X_CAT_Y"
                      class="ppt-chart-label"
                      :text-anchor="shouldRotateLabels ? 'end' : 'middle'"
                      :transform="
                        shouldRotateLabels
                          ? chartXCatLabelTransform(
                              55 +
                                bi * (400 / waterfallBars.length) +
                                400 / waterfallBars.length / 2,
                              LINE_CHART_X_CAT_Y_ROTATED
                            )
                          : undefined
                      "
                      :style="shouldRotateLabels ? 'font-size: 8px' : ''"
                    >
                      {{ bar.label }}
                    </text>
                  </template>
                </svg>

                <!-- 散点图 scatter (full-width data) -->
                <svg
                  v-else-if="slide.chart.type === 'scatter'"
                  class="ppt-chart-svg"
                  :viewBox="LINE_CHART_VIEWBOX"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <text
                    v-if="slide.chart.y_label"
                    x="10"
                    y="110"
                    class="ppt-axis-label"
                    text-anchor="middle"
                    transform="rotate(-90, 10, 110)"
                  >
                    {{ slide.chart.y_label }}
                  </text>
                  <text
                    v-if="slide.chart.x_label"
                    x="255"
                    :y="LINE_CHART_X_AXIS_LABEL_Y"
                    class="ppt-axis-label"
                    text-anchor="middle"
                  >
                    {{ slide.chart.x_label }}
                  </text>
                  <template v-for="(tick, ti) in getScatterYTicks()" :key="'dfsy' + ti">
                    <line
                      :x1="55"
                      :y1="mapScatterY(tick)"
                      :x2="455"
                      :y2="mapScatterY(tick)"
                      stroke="rgba(255,255,255,0.1)"
                      stroke-width="1"
                    />
                    <text
                      :x="50"
                      :y="mapScatterY(tick) + 3"
                      class="ppt-chart-label"
                      text-anchor="end"
                      style="font-size: 9px"
                    >
                      {{ formatTickValue(tick) }}
                    </text>
                  </template>
                  <template v-for="(tick, ti) in getScatterXTicks()" :key="'dfsx' + ti">
                    <line
                      :x1="mapScatterX(tick)"
                      :y1="25"
                      :x2="mapScatterX(tick)"
                      :y2="195"
                      stroke="rgba(255,255,255,0.1)"
                      stroke-width="1"
                    />
                    <text
                      :x="mapScatterX(tick)"
                      :y="LINE_CHART_X_CAT_Y"
                      class="ppt-chart-label"
                      text-anchor="middle"
                      style="font-size: 9px"
                    >
                      {{ formatTickValue(tick) }}
                    </text>
                  </template>
                  <template v-for="(pt, pi) in scatterPoints" :key="'dfsp' + pi">
                    <circle
                      :cx="pt.svgX"
                      :cy="pt.svgY"
                      r="5"
                      :fill="pt.color"
                      fill-opacity="0.8"
                      stroke="#fff"
                      stroke-width="0.5"
                    />
                    <text
                      :x="pt.svgX"
                      :y="pt.svgY - 8"
                      class="ppt-chart-label"
                      text-anchor="middle"
                      style="font-size: 8px"
                    >
                      {{ pt.label }}
                    </text>
                  </template>
                </svg>
                <!-- 热力图 heatmap (full-width data) -->
                <svg
                  v-else-if="slide.chart.type === 'heatmap'"
                  class="ppt-chart-svg"
                  :viewBox="LINE_CHART_VIEWBOX"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <text
                    v-if="slide.chart.y_label"
                    x="8"
                    y="110"
                    class="ppt-axis-label"
                    text-anchor="middle"
                    transform="rotate(-90, 8, 110)"
                  >
                    {{ slide.chart.y_label }}
                  </text>
                  <text
                    v-if="slide.chart.x_label"
                    x="260"
                    :y="LINE_CHART_X_AXIS_LABEL_Y"
                    class="ppt-axis-label"
                    text-anchor="middle"
                  >
                    {{ slide.chart.x_label }}
                  </text>
                  <text
                    v-for="(col, ci) in heatmapParsed?.cols || []"
                    :key="'dfhc' + ci"
                    :x="
                      60 +
                      ci * (400 / (heatmapParsed?.cols?.length || 1)) +
                      400 / (heatmapParsed?.cols?.length || 1) / 2
                    "
                    y="20"
                    class="ppt-chart-label"
                    text-anchor="middle"
                    style="font-size: 9px"
                  >
                    {{ col }}
                  </text>
                  <text
                    v-for="(row, ri) in heatmapParsed?.rows || []"
                    :key="'dfhr' + ri"
                    x="56"
                    :y="
                      25 +
                      ri * (175 / (heatmapParsed?.rows?.length || 1)) +
                      175 / (heatmapParsed?.rows?.length || 1) / 2 +
                      3
                    "
                    class="ppt-chart-label"
                    text-anchor="end"
                    style="font-size: 9px"
                  >
                    {{ row }}
                  </text>
                  <template v-for="(cell, ci) in heatmapCells" :key="'dfhv' + ci">
                    <rect
                      :x="cell.svgX + 1"
                      :y="cell.svgY + 1"
                      :width="Math.max(cell.width - 2, 1)"
                      :height="Math.max(cell.height - 2, 1)"
                      :fill="cell.color"
                      rx="2"
                      opacity="0.85"
                    />
                    <text
                      :x="cell.svgX + cell.width / 2"
                      :y="cell.svgY + cell.height / 2 + 3"
                      class="ppt-chart-label"
                      text-anchor="middle"
                      style="font-size: 9px; fill: #fff; font-weight: 600"
                    >
                      {{ cell.value }}
                    </text>
                  </template>
                </svg>
                <!-- 树形图 treemap (full-width data) -->
                <svg
                  v-else-if="slide.chart.type === 'treemap'"
                  class="ppt-chart-svg"
                  :viewBox="LINE_CHART_VIEWBOX"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <template v-for="(rect, ri) in treemapRects" :key="'dftr' + ri">
                    <rect
                      :x="rect.x + 1"
                      :y="rect.y + 1"
                      :width="Math.max(rect.width - 2, 1)"
                      :height="Math.max(rect.height - 2, 1)"
                      :fill="rect.color"
                      rx="3"
                      opacity="0.88"
                    />
                    <text
                      v-if="rect.width > 30 && rect.height > 20"
                      :x="rect.x + rect.width / 2"
                      :y="rect.y + rect.height / 2 - 4"
                      class="ppt-chart-label"
                      text-anchor="middle"
                      style="font-size: 10px; fill: #fff; font-weight: 600"
                    >
                      {{ rect.label }}
                    </text>
                    <text
                      v-if="rect.width > 30 && rect.height > 30"
                      :x="rect.x + rect.width / 2"
                      :y="rect.y + rect.height / 2 + 10"
                      class="ppt-chart-label"
                      text-anchor="middle"
                      style="font-size: 9px; fill: rgba(255, 255, 255, 0.7)"
                    >
                      {{ rect.value }} ({{ rect.percent }}%)
                    </text>
                  </template>
                </svg>
                <div
                  v-else-if="isTimelineChart(slide.chart)"
                  class="ppt-timeline-chart ppt-timeline-chart--full"
                >
                  <div
                    v-if="
                      slide.chart.x_label ||
                      slide.chart.xLabel ||
                      slide.chart.y_label ||
                      slide.chart.yLabel
                    "
                    class="ppt-timeline-axis-hint"
                  >
                    <span v-if="slide.chart.x_label || slide.chart.xLabel">{{
                      slide.chart.x_label || slide.chart.xLabel
                    }}</span>
                    <template
                      v-if="
                        (slide.chart.x_label || slide.chart.xLabel) &&
                        (slide.chart.y_label || slide.chart.yLabel)
                      "
                    >
                      ·
                    </template>
                    <span v-if="slide.chart.y_label || slide.chart.yLabel">{{
                      slide.chart.y_label || slide.chart.yLabel
                    }}</span>
                  </div>
                  <div
                    v-for="(d, di) in slide.chart.data || []"
                    :key="'tl-df-' + di"
                    class="ppt-timeline-item"
                  >
                    <div class="ppt-timeline-track">
                      <div
                        class="ppt-timeline-dot"
                        :style="{ background: getSeriesColor(di) }"
                      ></div>
                      <div
                        v-if="di < (slide.chart.data?.length || 0) - 1"
                        class="ppt-timeline-line"
                      ></div>
                    </div>
                    <div class="ppt-timeline-body">
                      <div
                        v-if="d.value != null && String(d.value) !== ''"
                        class="ppt-timeline-step"
                      >
                        {{ d.value }}
                      </div>
                      <div class="ppt-timeline-date">{{ d.label }}</div>
                      <div class="ppt-timeline-desc">
                        {{ d.description || d.desc || d.text || d.title || "" }}
                      </div>
                    </div>
                  </div>
                </div>
                <!-- 仪表盘图 gauge (full-width data) -->
                <svg
                  v-else-if="slide.chart.type === 'gauge'"
                  class="ppt-chart-svg ppt-gauge-svg"
                  viewBox="0 0 260 160"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <template v-if="gaugeData">
                    <path
                      :d="gaugeArcPath(1)"
                      fill="none"
                      stroke="rgba(255,255,255,0.12)"
                      stroke-width="16"
                      stroke-linecap="round"
                    />
                    <path
                      :d="gaugeArcPath(gaugeData.ratio)"
                      fill="none"
                      :stroke="gaugeData.color"
                      stroke-width="16"
                      stroke-linecap="round"
                    />
                    <template
                      v-for="(tick, ti) in gaugeTickMarks(gaugeData.min, gaugeData.max)"
                      :key="'dfgt' + ti"
                    >
                      <line
                        :x1="tick.x1"
                        :y1="tick.y1"
                        :x2="tick.x2"
                        :y2="tick.y2"
                        stroke="rgba(255,255,255,0.3)"
                        stroke-width="1"
                      />
                      <text
                        :x="tick.x2 + (tick.x2 > 130 ? 4 : -4)"
                        :y="tick.y2 + 3"
                        class="ppt-chart-label"
                        :text-anchor="tick.x2 > 130 ? 'start' : 'end'"
                        style="font-size: 8px"
                      >
                        {{ tick.label }}
                      </text>
                    </template>
                    <text
                      x="130"
                      y="115"
                      text-anchor="middle"
                      class="ppt-gauge-value"
                      :fill="gaugeData.color"
                    >
                      {{ gaugeData.value }}{{ gaugeData.unit }}
                    </text>
                    <text x="130" y="135" text-anchor="middle" class="ppt-gauge-label">
                      {{ gaugeData.label }}
                    </text>
                    <template v-if="gaugeData.target !== undefined">
                      <line
                        :x1="
                          130 +
                          95 *
                            Math.cos(
                              Math.PI -
                                ((gaugeData.target - gaugeData.min) /
                                  (gaugeData.max - gaugeData.min || 1)) *
                                  Math.PI
                            )
                        "
                        :y1="
                          130 +
                          95 *
                            Math.sin(
                              Math.PI -
                                ((gaugeData.target - gaugeData.min) /
                                  (gaugeData.max - gaugeData.min || 1)) *
                                  Math.PI
                            )
                        "
                        :x2="
                          130 +
                          108 *
                            Math.cos(
                              Math.PI -
                                ((gaugeData.target - gaugeData.min) /
                                  (gaugeData.max - gaugeData.min || 1)) *
                                  Math.PI
                            )
                        "
                        :y2="
                          130 +
                          108 *
                            Math.sin(
                              Math.PI -
                                ((gaugeData.target - gaugeData.min) /
                                  (gaugeData.max - gaugeData.min || 1)) *
                                  Math.PI
                            )
                        "
                        stroke="#fff"
                        stroke-width="2"
                      />
                    </template>
                  </template>
                </svg>
              </div>

              <!-- 仅有 content、无 chart/table 的 data 页 -->
              <ul
                v-else-if="shouldShowContentBullets(slide) && !hasBodyPrimaryVisual(slide)"
                class="ppt-bullet-list ppt-data-notes"
                v-bind="classicBulletListTypography(slide)"
              >
                <li
                  v-for="(item, bi) in resolveSlideBulletItems(slide)"
                  :key="bi"
                  class="ppt-bullet-item"
                >
                  <span class="ppt-bullet-dot"></span>
                  <PptMarkdownInline
                    :text="displayText(item)"
                    :editable="isEditing"
                    @blur="onContentItemBlur($event, currentSlide, bi)"
                  />
                </li>
              </ul>

              <PptMarkdownInline
                v-if="slide.data_source_line || isEditing"
                class="ppt-data-source-line"
                :text="slide.data_source_line || ''"
                :page-references="slide.page_references"
                :editable="isEditing"
                @blur="onDataSourceLineBlur($event, currentSlide)"
                @ref-click="onPptTableRefClick($event, slide)"
              />
              <div v-if="currentBrandFooter" class="ppt-brand-footer">{{ currentBrandFooter }}</div>
            </div>

            <!-- quote 引言页 -->
            <div
              v-else-if="slide.layout === 'quote'"
              class="ppt-slide ppt-quote"
            >
              <div class="ppt-quote-mark">"</div>
              <PptMarkdownInline
                class="ppt-quote-text"
                :text="
                  slide.quote || (slide.content && slide.content[0]) || slide.title || ''
                "
                :editable="isEditing"
                @blur="onCellBlur($event, `slides.${currentSlide}.quote`)"
              />
              <div
                v-if="slide.quote_author || slide.author || isEditing"
                class="ppt-quote-author"
                :contenteditable="isEditing"
                @blur="onCellBlur($event, `slides.${currentSlide}.quote_author`)"
              >
                — {{ slide.quote_author || slide.author }}
              </div>
              <div v-if="currentBrandFooter" class="ppt-brand-footer">{{ currentBrandFooter }}</div>
            </div>

            <!-- end 结束页 -->
            <div
              v-else-if="slide.layout === 'end'"
              class="ppt-slide ppt-end"
            >
              <div class="ppt-end-icon">🎉</div>
              <h2 class="ppt-end-title">
                <PptMarkdownInline
                  :text="slide.title || ''"
                  :editable="isEditing"
                  @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
                />
              </h2>
              <p v-if="slide.subtitle || isEditing" class="ppt-end-sub">
                <PptMarkdownInline
                  :text="slide.subtitle || ''"
                  :editable="isEditing"
                  @blur="onCellBlur($event, `slides.${currentSlide}.subtitle`)"
                />
              </p>
              <div v-if="currentBrandFooter" class="ppt-brand-footer">{{ currentBrandFooter }}</div>
            </div>

            <!-- 兜底：未知 layout -->
            <div
              v-else
              class="ppt-slide ppt-content"
            >
              <h2 class="ppt-slide-title">
                <PptMarkdownInline
                  :text="slide.title || ''"
                  :editable="isEditing"
                  @blur="onCellBlur($event, `slides.${currentSlide}.title`)"
                />
              </h2>
              <ul class="ppt-bullet-list">
                <li
                  v-for="(item, bi) in slide.content || []"
                  :key="bi"
                  class="ppt-bullet-item"
                >
                  <span class="ppt-bullet-dot"></span>
                  <PptMarkdownInline
                    :text="displayText(item)"
                    :editable="isEditing"
                    @blur="onContentItemBlur($event, currentSlide, bi)"
                  />
                </li>
              </ul>
              <div v-if="currentBrandFooter" class="ppt-brand-footer">{{ currentBrandFooter }}</div>
            </div>
</template>

<style lang="scss">
@import "./classic.scss";
</style>

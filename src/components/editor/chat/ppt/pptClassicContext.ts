import type { ComputedRef, InjectionKey } from "vue";
import type { ChartDataItem, PptChart, PptSlide } from "./types";
import type { DocumentFigure } from "@/utils/pptChapterImages";
import type { PptTocEntry } from "./types";

/** Classic/default theme slide rendering APIs provided by PptViewer shell. */
export interface PptClassicContext {
  coverBackdropUrl: ComputedRef<string | undefined>;
  sectionBackdropUrl: ComputedRef<string | undefined>;
  coverDecorationSvg: ComputedRef<string>;
  sectionDecorationSvg: ComputedRef<string>;
  twoColumnBackdropUrl: ComputedRef<string | undefined>;
  chapterImagePageDecorationSvg: ComputedRef<string>;
  twoColumnSlideBackgroundStyle: ComputedRef<Record<string, string>>;

  contentPointStyle: (index: number) => Record<string, string>;
  metricCardStyle: (
    card: { accent_color?: string },
    index: number,
  ) => Record<string, string>;
  metricCardValueStyle: (
    card: { accent_color?: string },
    index: number,
  ) => Record<string, string>;
  heroRightCardStyle: (
    item: { accent_color?: string },
    index: number,
  ) => Record<string, string>;
  heroMetricStyle: (hm: PptSlide["hero_metric"] | undefined) => Record<string, string>;
  normalizeAccentColor: (raw: unknown) => string | undefined;
  rightItemAccentColor: (
    item: { accent_color?: string },
    index: number,
  ) => string;
  rightItemTitle: (ri: { title?: unknown }) => string;
  rightItemDescription: (ri: { description?: unknown }) => string;
  formatRightItemIndex: (
    ri: { index?: unknown; number?: unknown },
    idx: number,
  ) => string;
  topicGridFillStyle: (slide: PptSlide | undefined) => Record<string, string>;
  documentFigureColumnStyle: (s: PptSlide) => Record<string, string> | undefined;
  documentFigureImgStyle: (fig: DocumentFigure) => Record<string, string>;

  hasBodyPrimaryVisual: (slide: PptSlide | undefined) => boolean;
  hasTableAndChart: (slide: PptSlide | undefined) => boolean;
  isContentWithRightItemsSlide: (slide: PptSlide | undefined) => boolean;
  isMetricCardsOnlySlide: (slide: PptSlide | undefined) => boolean;
  isVisualOnlySlide: (slide: PptSlide | undefined) => boolean;
  shouldShowChapterSideImage: (slide?: PptSlide | null) => boolean;
  shouldShowContentBullets: (slide: PptSlide | undefined) => boolean;
  shouldShowHeroLeftContentItems: (slide: PptSlide | undefined) => boolean;
  shouldShowHeroLeftMetricCards: (slide: PptSlide | undefined) => boolean;
  shouldShowHeroLeftTable: (slide: PptSlide | undefined) => boolean;
  shouldShowHeroMetricBanner: (slide: PptSlide | undefined) => boolean;
  shouldShowMetricCardInline: (slide: PptSlide | undefined) => boolean;
  shouldShowMetricCardsCompactGrid: (slide: PptSlide | undefined) => boolean;
  shouldShowMetricCardsPrimaryGrid: (slide: PptSlide | undefined) => boolean;
  shouldFillMetricCards: (slide: PptSlide | undefined) => boolean;
  shouldUsePrimaryMetricCards: (slide: PptSlide | undefined) => boolean;
  heroLeftContentRightItems: (slide: PptSlide | undefined) => PptSlide["right_items"];
  tocIconIndex: (entry: PptTocEntry, ti: number) => number;
  resolveReferencesSlideItemUrl: (
    item: string,
    slide: PptSlide,
  ) => string | undefined;
  isTimelineChart: (chart: { type?: unknown } | null | undefined) => boolean;

  getStackedBarCategoryLabels: (chart: PptChart | undefined) => string[];
  getStackedBarRowValues: (d: ChartDataItem) => number[];
  formatStackedBarSegmentLabel: (chart: PptChart | undefined, v: number) => string;
  stackedBarSegmentTitle: (
    chart: PptChart | undefined,
    vi: number,
    v: number,
  ) => string;
  horizontalBarWidthPx: (
    value: number,
    max: number,
    chartWidth?: number,
  ) => number;
  horizontalBarViewBoxHeight: (count: number, rowH: number, pad?: number) => number;
  horizontalBarValueTextX: (barX: number, barWidth: number, gap?: number) => number;
  funnelBarWidthPercent: (value: number, max: number, chart?: PptChart) => string;
  funnelItemLabel: (item: ChartDataItem) => string;
  getWaterfallYTicks: () => number[];
  mapWaterfallY: (value: number) => number;
  getScatterXTicks: () => number[];
  getScatterYTicks: () => number[];
  mapScatterX: (val: number) => number;
  mapScatterY: (val: number) => number;
  gaugeArcPath: (
    ratio: number,
    cx?: number,
    cy?: number,
    r?: number,
  ) => string;
  gaugeTickMarks: (
    min: number,
    max: number,
    cx?: number,
    cy?: number,
    r?: number,
  ) => Array<{ x1: number; y1: number; x2: number; y2: number; label: string }>;

  onDataSourceLineBlur: (event: Event, slideIdx: number) => void;
  onListItemBlur: (
    event: Event,
    slideIdx: number,
    field: string,
    itemIdx: number,
  ) => void;
  onRightItemFieldBlur: (
    event: Event,
    slideIdx: number,
    itemIdx: number,
    field: "title" | "description",
  ) => void;
  onHeroMetricBlur: (event: Event, slideIdx: number, field: string) => void;
  onDocumentFigureLeftItemBlur: (
    event: Event,
    slideIdx: number,
    itemIdx: number,
  ) => void;
}

export const pptClassicContextKey: InjectionKey<PptClassicContext> = Symbol("pptClassicContext");

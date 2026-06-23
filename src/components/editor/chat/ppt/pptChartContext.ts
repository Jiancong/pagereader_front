import type { ComputedRef, InjectionKey } from "vue";
import type { ChartDataItem } from "./types";

export interface PptChartContext {
  isMultiSeriesLine: ComputedRef<boolean>;
  isGroupedBar: ComputedRef<boolean>;
  lineChartLegendItems: ComputedRef<string[]>;
  lineChartSeriesList: ComputedRef<ChartDataItem[]>;
  lineChartCategories: ComputedRef<string[]>;
  groupedBarSeriesList: ComputedRef<ChartDataItem[]>;
  groupedBarCategories: ComputedRef<string[]>;
  linePoints: ComputedRef<string>;
  multiLinePoints: ComputedRef<{ secondary?: string; tertiary?: string }>;
  shouldRotateLabels: ComputedRef<boolean>;
  barChartYRange: ComputedRef<{ min: number; max: number; range: number }>;
  barZeroY: ComputedRef<number>;
  LINE_CHART_VIEWBOX: string;
  LINE_CHART_X_CAT_Y_ROTATED: number;
  LINE_CHART_X_CAT_Y: number;
  BAR_CHART_X_CAT_Y_ROTATED: number;
  BAR_CHART_X_CAT_Y: number;
  getSeriesColor: (index: number) => string;
  getLineYTicks: () => number[];
  getBarYTicks: () => number[];
  mapLineY: (value: number) => number;
  mapBarY: (value: number) => number;
  mapBarYSmall: (value: number) => number;
  formatTickValue: (value: number) => string;
  lineSeriesPoints: (seriesIndex: number, layout?: "full" | "compact") => string;
  lineSeriesValue: (catIndex: number, seriesIndex: number) => number;
  lineCategoryLabelX: (catIndex: number, layout?: "full" | "compact") => number;
  chartStrokeStyle: (seriesIndex: number) => Record<string, string>;
  chartFillStyle: (seriesIndex: number) => Record<string, string>;
  groupedBarSeriesLabel: (series: ChartDataItem) => string;
  groupedBarRectX: (catIndex: number, seriesIndex: number, layout?: "full" | "compact") => number;
  groupedBarRectWidth: (layout?: "full" | "compact") => number;
  groupedBarValue: (catIndex: number, seriesIndex: number) => number;
  groupedBarRectStyle: (seriesIndex: number, value: number) => Record<string, string>;
  groupedBarCategoryLabelX: (catIndex: number, layout?: "full" | "compact") => number;
  chartXCatLabelTransform: (x: number, y: number) => string;
}

export const pptChartContextKey: InjectionKey<PptChartContext> = Symbol("pptChartContext");

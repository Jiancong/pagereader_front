import type { ChartDataItem, PptChart } from "../types";

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

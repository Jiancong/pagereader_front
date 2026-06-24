import type { ChartDataItem, PptChart, SecondaryDataItem } from "../types";
import { normalizeAccentColor } from "./paletteHelpers";

export function toNumericSeries(raw: unknown): number[] {
  if (typeof raw === "number" && Number.isFinite(raw)) return [raw];
  if (Array.isArray(raw)) {
    return raw
      .map((v) => (typeof v === "number" ? v : Number(v)))
      .filter((n) => Number.isFinite(n));
  }
  if (raw && typeof raw === "object") {
    return Object.values(raw as Record<string, unknown>)
      .map((v) => (typeof v === "number" ? v : Number(v)))
      .filter((n) => Number.isFinite(n));
  }
  const n = Number(raw);
  return Number.isFinite(n) ? [n] : [];
}

/** 将后端 chart.data 统一转为数组，避免非数组上调用 .map */
export function coerceToUnknownArray(raw: unknown): unknown[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") return [];
  if (typeof raw !== "object") return [];

  if ("length" in raw && typeof (raw as { length: unknown }).length === "number") {
    try {
      return Array.from(raw as ArrayLike<unknown>);
    } catch {
      return [];
    }
  }

  const o = raw as Record<string, unknown>;

  for (const key of ["items", "series", "datasets", "points", "entries"] as const) {
    if (Array.isArray(o[key])) return o[key] as unknown[];
  }
  if (Array.isArray(o.data)) return o.data;

  const labels = o.labels ?? o.categories;
  const values = o.values;
  if (Array.isArray(labels) && Array.isArray(values)) {
    return values.map((v, i) => ({
      label: labels[i] ?? String(i + 1),
      value: v,
    }));
  }

  if (
    "value" in o ||
    "values" in o ||
    "label" in o ||
    "stage" in o ||
    "name" in o
  ) {
    return [o];
  }

  const entries = Object.entries(o);
  if (
    entries.length > 0 &&
    entries.every(
      ([, v]) =>
        v == null ||
        typeof v === "number" ||
        typeof v === "string" ||
        typeof v === "boolean"
    )
  ) {
    return entries.map(([label, value]) => ({ label, value }));
  }

  return [];
}

/** 是否为「labels + 平行数值数组」格式（后端常见：data: [35, 1.6, 2.1]） */
export function chartSecondarySeries(chart: PptChart | undefined): SecondaryDataItem[] {
  const raw = coerceToUnknownArray(chart?.secondary_data);
  if (!raw.length) return [];
  const first = raw[0] as unknown;
  if (typeof first === "number" || typeof first === "string") {
    const labels =
      chart?.data?.map((d) => d.label) ??
      chart?.categories ??
      chart?.labels ??
      [];
    return (raw as unknown[]).map((v, i) => {
      const n = typeof v === "number" ? v : Number(v);
      return {
        label: labels[i] ?? String(i + 1),
        value: Number.isFinite(n) ? n : 0,
      };
    });
  }
  return raw as SecondaryDataItem[];
}

export function isPrimitiveChartDataArray(data: unknown): boolean {
  if (!Array.isArray(data) || !data.length) return false;
  return data.every((d) => {
    if (d == null) return true;
    const t = typeof d;
    return t === "number" || t === "string" || t === "boolean";
  });
}

/** combo 等图：后端 categories + primary_data 时，应优先用 primary_data 重建 data */
export function shouldRebuildChartDataFromPrimary(
  chart: PptChart,
  axisLabels: string[],
  dataRows: unknown[]
): boolean {
  if (!chart.primary_data?.length) return false;
  const expectedLen = axisLabels.length || chart.primary_data.length;
  if (!dataRows.length) return true;
  if (dataRows.length !== expectedLen) return true;
  if (!isPrimitiveChartDataArray(chart.primary_data)) return false;
  if (isPrimitiveChartDataArray(dataRows)) return true;
  return dataRows.every((d) => {
    const n = Number((d as ChartDataItem).value);
    return !Number.isFinite(n) || n === 0;
  });
}

export function normalizeChartSeriesArray(
  raw: unknown,
  labels: string[]
): SecondaryDataItem[] | undefined {
  const arr = coerceToUnknownArray(raw);
  if (!arr.length) return undefined;
  if (isPrimitiveChartDataArray(arr)) {
    return arr.map((v, i) => {
      const n = typeof v === "number" ? v : Number(v);
      return {
        label: labels[i] ?? String(i + 1),
        value: Number.isFinite(n) ? n : 0,
      };
    });
  }
  return arr.map((d, i) => {
    const item = d as SecondaryDataItem;
    const n = Number(item?.value);
    return {
      label: item?.label?.trim() ? item.label : labels[i] ?? String(i + 1),
      value: Number.isFinite(n) ? n : 0,
    };
  });
}

/** 从 series / datasets 条目中读取平行数值数组（支持 values 或 Chart.js 的 data） */
export function seriesRowNumericValues(row: Record<string, unknown>): number[] {
  const raw = row.values ?? row.data;
  if (!Array.isArray(raw)) return [];
  return raw.map((v) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  });
}

/** 解开嵌套的 chart.data.data（部分后端将 labels/datasets 放在内层） */
export function unwrapChartDataRecord(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
    try {
      return unwrapChartDataRecord(JSON.parse(trimmed));
    } catch {
      return null;
    }
  }
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const inner = o.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    const nested = inner as Record<string, unknown>;
    const hasAxis =
      Array.isArray(nested.labels) ||
      Array.isArray(nested.categories);
    const hasSeries =
      Array.isArray(nested.datasets) ||
      Array.isArray(nested.series);
    if (hasAxis && hasSeries) return nested;
  }
  return o;
}

/** 解析 chart.data（含 JSON 字符串）或 chart 根上的 labels + series/datasets */
export function resolveChartSeriesContainer(chart: PptChart): Record<string, unknown> | null {
  let raw: unknown = chart.data;
  const unwrapped = unwrapChartDataRecord(raw);
  if (unwrapped) raw = unwrapped;

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const labels = o.labels ?? o.categories;
    const series = o.series ?? o.datasets;
    if (Array.isArray(labels) && Array.isArray(series) && series.length) {
      return {
        ...o,
        labels,
        categories: labels,
        series,
        datasets: series,
      };
    }
    if (Array.isArray(labels) || Array.isArray(series)) return o;
    return o;
  }

  if (Array.isArray(raw) && raw.length) {
    const extra = chart as unknown as Record<string, unknown>;
    const labels =
      chart.labels ??
      chart.categories ??
      extra.labels ??
      extra.categories;
    if (Array.isArray(labels)) {
      return {
        labels,
        categories: labels,
        series: raw,
        datasets: raw,
      };
    }
  }

  const extra = chart as unknown as Record<string, unknown>;
  const labels = chart.labels ?? chart.categories ?? extra.labels ?? extra.categories;
  const series = extra.series ?? extra.datasets;
  if (Array.isArray(labels) && Array.isArray(series) && series.length) {
    return {
      labels,
      categories: labels,
      series,
      datasets: series,
    };
  }
  return null;
}

/** coerce 只拿到 datasets[0] 时，单系列展开为逐条 { label, value } */
export function expandSingleSeriesBarRows(
  chart: PptChart,
  axisLabels: string[],
  chartDataRaw: unknown[]
): ChartDataItem[] | undefined {
  const singleSeriesTypes = [
    "bar",
    "line",
    "area",
    "pie",
    "funnel",
    "horizontal_bar",
    "waterfall",
  ] as const;
  if (
    !singleSeriesTypes.includes(chart.type as (typeof singleSeriesTypes)[number]) ||
    !axisLabels.length ||
    chartDataRaw.length !== 1
  ) {
    return undefined;
  }
  const row = chartDataRaw[0];
  if (!row || typeof row !== "object") return undefined;
  const values = seriesRowNumericValues(row as Record<string, unknown>);
  if (!values.length) return undefined;
  return axisLabels.map((label, i) => ({
    label,
    value: values[i] ?? 0,
  }));
}

/**
 * 后端多系列图：{ labels|categories, series|datasets: [{ name, values[]|data[] }] }
 * - radar / 多系列 bar：保留 series 形态供分组渲染
 * - combo：柱+折线合并为 { label, value, secondary_value }[]
 * - 单系列 line / area / pie / funnel / horizontal_bar / waterfall：展开为 { label, value }[]
 * - 多系列 line / area：合并为 value + secondary_value (+ tertiary_value)
 */
export function normalizeCategoriesSeriesChart(
  chart: PptChart,
  dataContainer: Record<string, unknown>
): PptChart | undefined {
  const categories = dataContainer.categories ?? dataContainer.labels;
  const seriesList = dataContainer.series ?? dataContainer.datasets;
  if (!Array.isArray(categories) || !Array.isArray(seriesList) || !seriesList.length) {
    return undefined;
  }
  const first = seriesList[0];
  if (!first || typeof first !== "object") {
    return undefined;
  }
  const firstValues = seriesRowNumericValues(first as Record<string, unknown>);
  if (!firstValues.length) {
    return undefined;
  }

  const axisLabels = categories.map((c) => String(c));
  const data = seriesList.map((s, i) => {
    const row = s as Record<string, unknown>;
    const values = seriesRowNumericValues(row);
    return {
      name: String(row.name ?? row.label ?? `Series ${i + 1}`),
      values,
    };
  });

  if (chart.type === "radar") {
    return {
      ...chart,
      categories: axisLabels,
      labels: axisLabels,
      data: data as ChartDataItem[],
    };
  }

  if (chart.type === "bar") {
    if (seriesList.length === 1) {
      const values = data[0]?.values ?? [];
      const rows: ChartDataItem[] = axisLabels.map((label, i) => ({
        label,
        value: values[i] ?? 0,
      }));
      const seriesName = data[0]?.name;
      return {
        ...chart,
        categories: axisLabels,
        labels: axisLabels,
        data: rows,
        ...(seriesName ? { series_names: [seriesName], y_label: chart.y_label || seriesName } : {}),
      };
    }
    return {
      ...chart,
      categories: axisLabels,
      labels: axisLabels,
      data: data as ChartDataItem[],
    };
  }

  if (chart.type === "combo") {
    const combo = buildComboChartFromSeriesList(axisLabels, seriesList);
    if (combo) return { ...chart, categories: axisLabels, labels: axisLabels, ...combo };
  }

  if (chart.type === "line" || chart.type === "area") {
    if (seriesList.length === 1) {
      const built = buildLineAreaChartFromSeriesList(axisLabels, seriesList);
      if (built) {
        const names = built.series_names ?? [];
        return {
          ...chart,
          categories: axisLabels,
          labels: axisLabels,
          data: built.data,
          ...(names.length ? { series_names: names } : {}),
          ...(chart.y_label?.trim() || chart.yLabel?.trim()
            ? { y_label: chart.y_label?.trim() || chart.yLabel?.trim() }
            : built.y_label
              ? { y_label: built.y_label }
              : {}),
        };
      }
    }
    const names = data.map((s) => s.name).filter(Boolean);
    return {
      ...chart,
      categories: axisLabels,
      labels: axisLabels,
      data: data as ChartDataItem[],
      ...(names.length ? { series_names: names } : {}),
      ...(chart.y_label?.trim() || chart.yLabel?.trim()
        ? { y_label: chart.y_label?.trim() || chart.yLabel?.trim() }
        : {}),
    };
  }

  const rowChartTypes = ["pie", "funnel", "horizontal_bar", "waterfall"] as const;
  if (rowChartTypes.includes(chart.type as (typeof rowChartTypes)[number])) {
    const values = data[0]?.values ?? [];
    const rows: ChartDataItem[] = axisLabels.map((label, i) => ({
      label,
      value: values[i] ?? 0,
    }));
    return {
      ...chart,
      categories: axisLabels,
      labels: axisLabels,
      data: rows,
    };
  }

  return undefined;
}

/** line / area：labels + datasets → [{ label, value, secondary_value? }] */
export function buildLineAreaChartFromSeriesList(
  axisLabels: string[],
  seriesList: unknown[]
): {
  data: ChartDataItem[];
  series_names?: string[];
  y_label?: string;
  secondary_data_label?: string;
} | undefined {
  const rows = seriesList.filter((s) => s && typeof s === "object") as Record<string, unknown>[];
  if (!rows.length) return undefined;
  const series = rows.map((row, i) => ({
    name: String(row.name ?? row.label ?? `Series ${i + 1}`),
    values: seriesRowNumericValues(row),
  }));
  if (!series.some((s) => s.values.length)) return undefined;

  if (series.length === 1) {
    const data: ChartDataItem[] = axisLabels.map((label, i) => ({
      label,
      value: series[0].values[i] ?? 0,
    }));
    const name = series[0].name.trim();
    return {
      data,
      ...(name ? { series_names: [name], y_label: name } : {}),
    };
  }

  const data: ChartDataItem[] = axisLabels.map((label, i) => {
    const item: ChartDataItem = {
      label,
      value: series[0].values[i] ?? 0,
    };
    if (series[1]) item.secondary_value = series[1].values[i] ?? 0;
    if (series[2]) item.tertiary_value = series[2].values[i] ?? 0;
    return item;
  });
  const names = series.map((s) => s.name).filter(Boolean);
  return {
    data,
    series_names: names,
    ...(names[0] ? { y_label: names[0] } : {}),
    ...(names[1] ? { secondary_data_label: names[1] } : {}),
  };
}

export function normalizeLineAreaFromLabelsDatasets(chart: PptChart): PptChart | undefined {
  if (chart.type !== "line" && chart.type !== "area") return undefined;
  const pack = readChartLabelsAndDatasets(chart);
  if (!pack?.labels.length || !pack.datasets.length) return undefined;
  if (pack.datasets.length > 1) {
    return normalizeCategoriesSeriesChart(chart, {
      labels: pack.labels,
      categories: pack.labels,
      datasets: pack.datasets,
      series: pack.datasets,
    });
  }
  const built = buildLineAreaChartFromSeriesList(pack.labels, pack.datasets);
  if (!built) return undefined;
  return {
    ...chart,
    labels: pack.labels,
    categories: pack.labels,
    data: built.data,
    ...(built.series_names?.length ? { series_names: built.series_names } : {}),
    ...(chart.y_label?.trim() || chart.yLabel?.trim()
      ? { y_label: chart.y_label?.trim() || chart.yLabel?.trim() }
      : built.y_label
        ? { y_label: built.y_label }
        : {}),
    ...(chart.secondary_data_label?.trim()
      ? { secondary_data_label: chart.secondary_data_label.trim() }
      : built.secondary_data_label
        ? { secondary_data_label: built.secondary_data_label }
        : {}),
  };
}

interface ComboSeriesPick {
  primary: { name: string; values: number[] };
  secondary?: { name: string; values: number[] };
}

/** 从 datasets 中识别柱（bar）与折线（line）系列 */
export function pickComboSeriesFromRows(
  seriesList: Record<string, unknown>[]
): ComboSeriesPick | undefined {
  if (!seriesList.length) return undefined;
  const mapped = seriesList.map((row) => ({
    name: String(row.name ?? row.label ?? ""),
    type: String(row.type ?? "")
      .trim()
      .toLowerCase(),
    values: seriesRowNumericValues(row),
  }));
  let primary = mapped.find((s) => s.type === "bar" && s.values.length);
  let secondary = mapped.find((s) => s.type === "line" && s.values.length);
  if (!primary && mapped.length >= 1 && mapped[0].values.length) {
    primary = mapped[0];
    secondary =
      secondary ??
      mapped.find((s) => s !== primary && s.values.length) ??
      mapped[1];
  }
  if (!primary?.values.length) return undefined;
  if (secondary && !secondary.values.length) secondary = undefined;
  return {
    primary: { name: primary.name, values: primary.values },
    ...(secondary ? { secondary: { name: secondary.name, values: secondary.values } } : {}),
  };
}

export function buildComboChartFromSeriesList(
  axisLabels: string[],
  seriesList: unknown[]
): { data: ChartDataItem[]; primary_data_label?: string; secondary_data_label?: string; y_label?: string; secondary_y_label?: string } | undefined {
  const rows = seriesList.filter((s) => s && typeof s === "object") as Record<string, unknown>[];
  const picked = pickComboSeriesFromRows(rows);
  if (!picked) return undefined;
  const data: ChartDataItem[] = axisLabels.map((label, i) => ({
    label,
    value: picked.primary.values[i] ?? 0,
    ...(picked.secondary
      ? { secondary_value: picked.secondary.values[i] ?? 0 }
      : {}),
  }));
  const primaryName = picked.primary.name.trim();
  const secondaryName = picked.secondary?.name.trim();
  return {
    data,
    ...(primaryName ? { primary_data_label: primaryName, y_label: primaryName } : {}),
    ...(secondaryName
      ? { secondary_data_label: secondaryName, secondary_y_label: secondaryName }
      : {}),
  };
}

/** labels + datasets → combo 柱+折线（data[].value + secondary_value） */
export function normalizeComboFromLabelsDatasets(chart: PptChart): PptChart | undefined {
  if (chart.type !== "combo") return undefined;
  const pack = readChartLabelsAndDatasets(chart);
  if (!pack?.labels.length || !pack.datasets.length) return undefined;
  const built = buildComboChartFromSeriesList(pack.labels, pack.datasets);
  if (!built) return undefined;
  return {
    ...chart,
    labels: pack.labels,
    categories: pack.labels,
    data: built.data,
    ...(chart.primary_data_label?.trim()
      ? { primary_data_label: chart.primary_data_label.trim() }
      : built.primary_data_label
        ? { primary_data_label: built.primary_data_label }
        : {}),
    ...(chart.secondary_data_label?.trim()
      ? { secondary_data_label: chart.secondary_data_label.trim() }
      : built.secondary_data_label
        ? { secondary_data_label: built.secondary_data_label }
        : {}),
    ...(chart.y_label?.trim() || chart.yLabel?.trim()
      ? { y_label: chart.y_label?.trim() || chart.yLabel?.trim() }
      : built.y_label
        ? { y_label: built.y_label }
        : {}),
    ...(chart.secondary_y_label?.trim()
      ? { secondary_y_label: chart.secondary_y_label.trim() }
      : built.secondary_y_label
        ? { secondary_y_label: built.secondary_y_label }
        : {}),
  };
}

/** labels + datasets 单系列 → [{ label, value }[]（pie 等兜底） */
export function normalizePieFromLabelsDatasets(chart: PptChart): PptChart | undefined {
  if (chart.type !== "pie") return undefined;
  const pack = readChartLabelsAndDatasets(chart);
  if (!pack?.labels.length || !pack.datasets.length) return undefined;
  const values = datasetNumericValues(pack.datasets[0]);
  if (!values.length) return undefined;
  const rows: ChartDataItem[] = pack.labels.map((label, i) => ({
    label,
    value: values[i] ?? 0,
  }));
  return { ...chart, data: rows };
}

/** bar：labels + datasets[{ name, values }] → [{ label, value }] 或分组柱 */
export function normalizeBarFromLabelsDatasets(chart: PptChart): PptChart | undefined {
  if (chart.type !== "bar") return undefined;
  const container = resolveChartSeriesContainer(chart);
  if (container) {
    return normalizeCategoriesSeriesChart(chart, container);
  }
  const pack = readChartLabelsAndDatasets(chart);
  if (!pack?.labels.length || !pack.datasets.length) return undefined;
  return normalizeCategoriesSeriesChart(chart, {
    labels: pack.labels,
    categories: pack.labels,
    datasets: pack.datasets,
    series: pack.datasets,
  });
}

/** 读取 Chart.js 风格 labels + datasets（可在 chart 根或 chart.data 内） */
export function readChartLabelsAndDatasets(
  chart: PptChart
): { labels: string[]; datasets: Record<string, unknown>[] } | undefined {
  const extra = chart as unknown as Record<string, unknown>;
  const fromRootLabels = chart.labels ?? chart.categories ?? extra.labels ?? extra.categories;
  const fromRootDatasets = extra.datasets;

  const tryPair = (labelsRaw: unknown, datasetsRaw: unknown) => {
    if (!Array.isArray(labelsRaw) || !Array.isArray(datasetsRaw) || !datasetsRaw.length) {
      return undefined;
    }
    return {
      labels: labelsRaw.map((l) => String(l)),
      datasets: datasetsRaw.filter(
        (d) => d && typeof d === "object"
      ) as Record<string, unknown>[],
    };
  };

  const root = tryPair(fromRootLabels, fromRootDatasets);
  if (root) return root;

  const data = chart.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const o = data as Record<string, unknown>;
    return tryPair(o.labels ?? o.categories, o.datasets ?? o.series);
  }
  return undefined;
}

export function datasetNumericValues(row: Record<string, unknown>): number[] {
  const raw = row.data ?? row.values ?? row.points;
  if (!Array.isArray(raw)) return [];
  return raw.map((v) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  });
}

/**
 * scatter：labels + datasets[{ label, data: x[] }, { label, data: y[] }]
 * 双系列时第一条为 X、第二条为 Y，与标题「自由度 vs 学习成本」一致。
 */
export function normalizeLabelsDatasetsChart(chart: PptChart): PptChart | undefined {
  if (chart.type !== "scatter") return undefined;
  const pack = readChartLabelsAndDatasets(chart);
  if (!pack) return undefined;

  const series = pack.datasets.map((row, i) => ({
    name: String(row.label ?? row.name ?? `Series ${i + 1}`),
    values: datasetNumericValues(row),
  }));
  if (!series.length) return undefined;

  const n = Math.max(
    pack.labels.length,
    ...series.map((s) => s.values.length)
  );
  if (!n) return undefined;

  const xSeries = series[0];
  const ySeries = series.length > 1 ? series[1] : series[0];

  const points: ChartDataItem[] = Array.from({ length: n }, (_, i) => {
    const x = xSeries.values[i] ?? 0;
    const y = series.length > 1 ? (ySeries.values[i] ?? 0) : 0;
    return {
      label: pack.labels[i] ?? String(i + 1),
      x,
      y,
      value: x,
      secondary_value: y,
    };
  });

  return {
    ...chart,
    labels: pack.labels,
    data: points,
    x_label: chart.x_label?.trim() || chart.xLabel?.trim() || xSeries.name,
    y_label:
      chart.y_label?.trim() ||
      chart.yLabel?.trim() ||
      (series.length > 1 ? ySeries.name : undefined),
  };
}

/**
 * 将 chart 规范为 data: { label, value }[]。
 * 支持 labels[] + data[]（数值）、secondary_data[]（数值）与对象数组等后端格式。
 */
export function normalizeChartType(type: unknown): string | undefined {
  if (type == null || type === "") return undefined;
  return String(type).trim().toLowerCase().replace(/\s+/g, "_");
}

export type NormalizeChartOptions = { comboPrimaryDefaultLabel?: string };

export function normalizeChart(
  chart: PptChart | undefined,
  options: NormalizeChartOptions = {},
): PptChart | undefined {
  const comboPrimaryDefaultLabel = options.comboPrimaryDefaultLabel ?? "Primary";
  if (!chart) return chart;
  const typeNorm = normalizeChartType(chart.type);
  const chartNorm =
    typeNorm && typeNorm !== chart.type ? ({ ...chart, type: typeNorm } as PptChart) : chart;

  const scatterNorm = normalizeLabelsDatasetsChart(chartNorm);
  if (scatterNorm) return scatterNorm;

  const barNorm = normalizeBarFromLabelsDatasets(chartNorm);
  if (barNorm) return barNorm;

  const dataContainer = resolveChartSeriesContainer(chartNorm);

  if (dataContainer) {
    const multiSeries = normalizeCategoriesSeriesChart(chartNorm, dataContainer);
    if (multiSeries) return multiSeries;
    const pieNorm = normalizePieFromLabelsDatasets(chartNorm);
    if (pieNorm) return pieNorm;
    const comboNorm = normalizeComboFromLabelsDatasets(chartNorm);
    if (comboNorm) return comboNorm;
    const lineAreaNorm = normalizeLineAreaFromLabelsDatasets(chartNorm);
    if (lineAreaNorm) return lineAreaNorm;
    if (chartNorm.type === "radar") {
      const pack = readChartLabelsAndDatasets(chartNorm);
      if (pack) {
        const axisLabels = pack.labels;
        const rows = pack.datasets.map((row, i) => ({
          name: String(row.name ?? row.label ?? `Series ${i + 1}`),
          values: datasetNumericValues(row),
        }));
        if (axisLabels.length && rows.some((r) => r.values.length)) {
          return {
            ...chartNorm,
            categories: axisLabels,
            labels: axisLabels,
            data: rows as ChartDataItem[],
          };
        }
      }
    }
  }
  const axisLabels =
    chartNorm.labels ??
    chartNorm.categories ??
    (Array.isArray(dataContainer?.categories)
      ? (dataContainer!.categories as string[])
      : undefined) ??
    (Array.isArray(dataContainer?.labels)
      ? (dataContainer!.labels as string[])
      : undefined) ??
    [];
  const chartDataRaw = coerceToUnknownArray(chartNorm.data ?? dataContainer);

  const barRowsEarly = expandSingleSeriesBarRows(chartNorm, axisLabels, chartDataRaw);
  if (barRowsEarly?.length) {
    const seriesName = String(
      (chartDataRaw[0] as Record<string, unknown>)?.name ??
        (chartDataRaw[0] as Record<string, unknown>)?.label ??
        ""
    ).trim();
    return {
      ...chartNorm,
      categories: axisLabels,
      labels: axisLabels,
      data: barRowsEarly,
      ...(seriesName ? { series_names: [seriesName], y_label: chartNorm.y_label || seriesName } : {}),
    };
  }
  let primarySeriesRaw: unknown[] | undefined =
    chartDataRaw.length
      ? chartDataRaw
      : chartNorm.primary_data?.length
        ? chartNorm.primary_data
        : undefined;
  if (shouldRebuildChartDataFromPrimary(chartNorm, axisLabels, chartDataRaw)) {
    primarySeriesRaw = chartNorm.primary_data;
  }

  let data: ChartDataItem[] = chartDataRaw as ChartDataItem[];

  if (primarySeriesRaw?.length && isPrimitiveChartDataArray(primarySeriesRaw)) {
    data = primarySeriesRaw.map((raw, i) => {
      const n = typeof raw === "number" ? raw : Number(raw);
      return {
        label: axisLabels[i] ?? String(i + 1),
        value: Number.isFinite(n) ? n : 0,
      };
    });
  } else if (chartDataRaw.length && isPrimitiveChartDataArray(chartDataRaw)) {
    data = chartDataRaw.map((raw, i) => {
      const n = typeof raw === "number" ? raw : Number(raw);
      return {
        label: axisLabels[i] ?? String(i + 1),
        value: Number.isFinite(n) ? n : 0,
      };
    });
  } else if (chartDataRaw.length) {
    const barRows = expandSingleSeriesBarRows(chartNorm, axisLabels, chartDataRaw);
    if (barRows?.length) {
      data = barRows;
    } else {
      const mapItem =
        chartNorm.type === "stacked_bar" ? normalizeStackedBarChartItem : normalizeChartItem;
      data = chartDataRaw.map((d) => mapItem(d as ChartDataItem));
      if (axisLabels.length) {
        data = data.map((d, i) => ({
          ...d,
          label: d.label?.trim() ? d.label : axisLabels[i] ?? String(i + 1),
        }));
      }
    }
  }

  const rowLabels: string[] = data.some((d) => d.label?.trim())
    ? data.map((d, i) => d.label?.trim() || axisLabels[i] || String(i + 1))
    : axisLabels;
  const secondaryRaw =
    chartNorm.secondary_data ??
    (chartNorm as { secondaryData?: unknown[] }).secondaryData;
  const secondary_data = normalizeChartSeriesArray(secondaryRaw, rowLabels);

  const secondary_data_label =
    chartNorm.secondary_data_label?.trim() ||
    chartNorm.secondary_label?.trim() ||
    undefined;
  let primary_data_label =
    chartNorm.primary_data_label?.trim() ||
    chartNorm.primary_label?.trim() ||
    chartNorm.y_label?.trim() ||
    chartNorm.yLabel?.trim() ||
    undefined;
  if (chartNorm.type === "combo" && !primary_data_label && secondary_data_label) {
    primary_data_label = comboPrimaryDefaultLabel;
  }

  const y_label =
    chartNorm.y_label?.trim() ||
    chartNorm.yLabel?.trim() ||
    (chartNorm.type === "combo" ? chartNorm.primary_label?.trim() : undefined) ||
    undefined;
  const x_label = chartNorm.x_label?.trim() || chartNorm.xLabel?.trim() || undefined;
  const secondary_y_label =
    chartNorm.secondary_y_label?.trim() || secondary_data_label || undefined;

  const colors = chartNorm.colors
    ?.map((c) => normalizeAccentColor(c))
    .filter(Boolean) as string[] | undefined;

  const next: PptChart = {
    ...chartNorm,
    data,
    ...(axisLabels.length && chartNorm.type === "bar" && !chartNorm.categories?.length
      ? { categories: axisLabels, labels: axisLabels }
      : {}),
    ...(colors?.length ? { colors } : {}),
    ...(secondary_data?.length ? { secondary_data } : {}),
    ...(secondary_data_label ? { secondary_data_label } : {}),
    ...(primary_data_label ? { primary_data_label } : {}),
    ...(y_label ? { y_label } : {}),
    ...(x_label ? { x_label } : {}),
    ...(secondary_y_label ? { secondary_y_label } : {}),
  };

  return next;
}

export function extractStackedBarValues(item: ChartDataItem): number[] {
  const raw = item as unknown as Record<string, unknown>;
  if (Array.isArray(item.values) && item.values.length) {
    return item.values.map((v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    });
  }
  const keys = Object.keys(raw)
    .filter((k) => /^value\d+$/i.test(k))
    .sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, ""), 10) || 0;
      const nb = parseInt(b.replace(/\D/g, ""), 10) || 0;
      return na - nb;
    });
  if (!keys.length) return [];
  return keys.map((k) => {
    const n = Number(raw[k]);
    return Number.isFinite(n) ? n : 0;
  });
}

export function normalizeStackedBarChartItem(item: ChartDataItem): ChartDataItem {
  const base = normalizeChartItem(item);
  const values = extractStackedBarValues(item);
  if (!values.length) return base;
  return {
    ...base,
    values,
    value: values.reduce((a, b) => a + b, 0),
  };
}

export function getStackedBarRowValues(d: ChartDataItem): number[] {
  return extractStackedBarValues(d);
}

export function normalizeChartItem(item: ChartDataItem): ChartDataItem {
  const next: ChartDataItem = { ...item };
  const rawValue = (item as any).value;
  const series = toNumericSeries(rawValue);

  if (series.length) {
    next.value = series[0];
    if (next.secondary_value === undefined && series.length > 1) {
      next.secondary_value = series[1];
    }
    if (next.tertiary_value === undefined && series.length > 2) {
      next.tertiary_value = series[2];
    }
    return next;
  }

  // radar/fallback：当没有 value 但有 values 数组时，用第一个值兜底，避免 NaN
  if (Array.isArray(next.values) && next.values.length > 0) {
    next.value = Number(next.values[0]) || 0;
    return next;
  }

  next.value = 0;
  return next;
}

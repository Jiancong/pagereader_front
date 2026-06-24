import type { PptTable } from "@/components/editor/chat/PptTableBlock.vue";
import type { NormalizeChartOptions } from "./normalizeChart";
import type { PptData, PptSlide } from "../types";
import {
  coerceContentItemText,
  normalizeSlideContent,
  pickDisplayString,
  resolveSlideBulletItemsRaw,
} from "./contentHelpers";
import { normalizeAccentColor } from "./paletteHelpers";
import { normalizeChart } from "./normalizeChart";

function isMetricCardsContentItem(item: unknown): boolean {
  if (!item || typeof item !== "object") return false;
  const o = item as Record<string, unknown>;
  const type = String(o.type ?? o.layout ?? o.block ?? "")
    .trim()
    .toLowerCase();
  if (type === "metric_cards" || type === "metric_cards_row") return true;
  return Array.isArray(o.metric_cards) && !pickDisplayString(o.title ?? o.text);
}

/** 从 content 数组中的 { type: metric_cards, metric_cards: [...] } 提取 KPI 卡 */
export function metricCardsFromContent(raw: unknown): PptSlide["metric_cards"] | undefined {
  if (!Array.isArray(raw)) return undefined;
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (!isMetricCardsContentItem(item)) continue;
    const cards = normalizeMetricCards(o.metric_cards);
    if (cards?.length) return cards;
  }
  return undefined;
}

export function normalizeMetricCardSourceRefs(raw: unknown): number[] | undefined {
  if (raw == null) return undefined;
  const list = Array.isArray(raw) ? raw : [raw];
  const refs = list.map((id) => Number(id)).filter((id) => Number.isFinite(id));
  return refs.length ? refs : undefined;
}

export function normalizeMetricCards(
  raw: unknown
): PptSlide["metric_cards"] | undefined {
  if (!Array.isArray(raw) || !raw.length) return undefined;
  const cards = raw
    .map((c) => {
      if (!c || typeof c !== "object") return null;
      const o = c as Record<string, unknown>;
      const value = String(o.value ?? "").trim();
      const label = String(o.label ?? "").trim();
      const detail = String(o.detail ?? "").trim();
      if (!value && !label) return null;
      const accent_color = normalizeAccentColor(o.accent_color);
      const source = String(o.source ?? "").trim();
      const sourceRefs = normalizeMetricCardSourceRefs(o.source_ref ?? o.source_refs);
      return {
        value,
        label,
        detail: detail || undefined,
        ...(source ? { source } : {}),
        ...(sourceRefs?.length
          ? { source_ref: sourceRefs.length === 1 ? sourceRefs[0] : sourceRefs }
          : {}),
        ...(accent_color ? { accent_color } : {}),
      };
    })
    .filter(Boolean) as NonNullable<PptSlide["metric_cards"]>;
  return cards.length ? cards : undefined;
}

export function metricCardsFromHeroMetric(
  slide: PptSlide
): PptSlide["metric_cards"] | undefined {
  const hm = slide.hero_metric;
  if (!hm) return undefined;
  const value = String(hm.value ?? "").trim();
  const caption = String(hm.caption ?? "").trim();
  if (!value && !caption) return undefined;
  const accent_color = normalizeAccentColor(hm.accent_color);
  return [
    {
      value: value || caption,
      label: value ? caption : "",
      ...(accent_color ? { accent_color } : {}),
    },
  ];
}

export function normalizeStringList(raw: unknown): string[] | undefined {
  const items = normalizeSlideContent(raw);
  return items?.length ? items : undefined;
}

/** 页底来源：后端可能发 string 或 page_reference[] */
export function normalizeDataSourceLine(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "string") {
    const t = raw.trim();
    return t || undefined;
  }
  if (!Array.isArray(raw) || !raw.length) return undefined;
  const segments: string[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      const t = item.trim();
      if (t) segments.push(t);
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const refId = o.ref_id ?? o.refId;
    const doc = pickDisplayString(o.document_name ?? o.title);
    const page = pickDisplayString(o.page_label);
    let seg = doc;
    if (page) seg = seg ? `${seg} — ${page}` : page;
    if (refId != null && refId !== "") seg = seg ? `${seg} [${refId}]` : `[${refId}]`;
    if (seg.trim()) segments.push(seg.trim());
  }
  return segments.length ? segments.join(" · ") : undefined;
}

export function normalizeRightItems(raw: unknown): PptSlide["right_items"] | undefined {
  if (!Array.isArray(raw) || !raw.length) return undefined;
  const out = raw
    .map((item) => {
      if (typeof item === "string") {
        const text = item.trim();
        return text ? { title: text } : null;
      }
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const title = pickDisplayString(o.title);
      const description = pickDisplayString(
        o.description ?? o.desc ?? o.body ?? o.text ?? o.content,
      );
      const index = pickDisplayString(o.index);
      const accent_color = pickDisplayString(o.accent_color);
      const icon = pickDisplayString(o.icon);
      if (!title && !description) return null;
      return {
        ...(index ? { index } : {}),
        ...(title ? { title } : {}),
        ...(description ? { description } : {}),
        ...(accent_color ? { accent_color } : {}),
        ...(icon ? { icon } : {}),
      };
    })
    .filter(Boolean) as NonNullable<PptSlide["right_items"]>;
  return out.length ? out : undefined;
}

export function resolveSlideSpeakerNotes(s?: PptSlide | null): string {
  if (!s) return "";
  const raw = s as unknown as Record<string, unknown>;
  const notes = s.speaker_notes ?? raw.speakerNotes ?? raw.speaker_note;
  return typeof notes === "string" ? notes.trim() : "";
}

export function enrichSlideSpeakerNotes(input: PptSlide): PptSlide {
  const notes = resolveSlideSpeakerNotes(input);
  if (!notes || input.speaker_notes === notes) return input;
  return { ...input, speaker_notes: notes };
}

export function normalizeTable(table: PptTable | undefined): PptTable | undefined {
  if (!table) return undefined;
  const cols = Array.isArray(table.columns)
    ? table.columns.map((c) => String(c ?? "").trim()).filter(Boolean)
    : [];
  if (cols.length < 2 || cols.length > 8) return undefined;

  const colCount = cols.length;
  const rows = (Array.isArray(table.rows) ? table.rows : [])
    .slice(0, 12)
    .map((row) => {
      const cells = Array.isArray(row) ? row.map((c) => String(c ?? "")) : [];
      while (cells.length < colCount) cells.push("");
      return cells.slice(0, colCount);
    })
    .filter((row) => row.some((c) => c.trim()));
  if (!rows.length) return undefined;

  const notes = String(table.notes ?? table.note ?? "").trim();
  let highlight_column = table.highlight_column;
  if (
    highlight_column != null &&
    (!Number.isInteger(highlight_column) ||
      highlight_column < 0 ||
      highlight_column >= colCount)
  ) {
    highlight_column = undefined;
  }

  const sourceRefs = Array.isArray(table.source_refs)
    ? table.source_refs.filter((id) => id != null && !Number.isNaN(Number(id)))
    : undefined;

  return {
    ...table,
    columns: cols,
    rows,
    ...(notes ? { notes, note: notes } : {}),
    ...(highlight_column != null ? { highlight_column } : {}),
    ...(sourceRefs?.length ? { source_refs: sourceRefs } : {}),
  };
}

export function normalizeSlideData(
  input: PptSlide | null,
  normalizeChartOptions?: NormalizeChartOptions,
): PptSlide | null {
  if (!input) return input;
  let withNotes = enrichSlideSpeakerNotes(input);
  const data_source_line = normalizeDataSourceLine(
    (withNotes as { data_source_line?: unknown }).data_source_line
  );
  if (data_source_line) {
    withNotes = { ...withNotes, data_source_line };
  }
  let chart = withNotes.chart
    ? normalizeChart(withNotes.chart, normalizeChartOptions)
    : undefined;
  let table = withNotes.table ? normalizeTable(withNotes.table) : undefined;
  let metric_cards = normalizeMetricCards(
    (withNotes as { metric_cards?: unknown }).metric_cards
  );
  let metricCardsFromContentBlock = false;
  if (!metric_cards?.length) {
    const fromContent = metricCardsFromContent(withNotes.content);
    if (fromContent?.length) {
      metric_cards = fromContent;
      metricCardsFromContentBlock = true;
    }
  }
  if (!metric_cards?.length) {
    const layout = String(withNotes.emphasis_layout ?? "")
      .trim()
      .toLowerCase();
    if (layout !== "hero_left") {
      metric_cards = metricCardsFromHeroMetric(withNotes);
    }
  }
  const content = resolveSlideBulletItemsRaw(withNotes);
  const left_content = normalizeStringList(withNotes.left_content);
  const right_content = normalizeStringList(withNotes.right_content);
  const right_items = normalizeRightItems(withNotes.right_items);
  const hero_metric = withNotes.hero_metric;
  if (
    !chart &&
    !table &&
    !metric_cards?.length &&
    !content?.length &&
    !left_content?.length &&
    !right_content?.length &&
    !right_items?.length &&
    !hero_metric
  ) {
    return withNotes;
  }
  const next: PptSlide = { ...withNotes };
  if (chart) next.chart = chart;
  if (table) next.table = table;
  if (metric_cards?.length) next.metric_cards = metric_cards;
  if (metricCardsFromContentBlock && !next.emphasis_layout) {
    next.emphasis_layout = "metric_cards_row";
  }
  if (content?.length) {
    next.content = content;
  } else if (Array.isArray(withNotes.content) && withNotes.content.length > 0) {
    const fallback = withNotes.content
      .filter((item) => !isMetricCardsContentItem(item))
      .map((item) =>
        typeof item === "string" ? item.trim() : coerceContentItemText(item)
      )
      .filter(Boolean);
    if (fallback.length) next.content = fallback;
  }
  if (Array.isArray(withNotes.left_content) || left_content?.length) {
    next.left_content = left_content ?? [];
  }
  if (Array.isArray(withNotes.right_content) || right_content?.length) {
    next.right_content = right_content ?? [];
  }
  if (Array.isArray(withNotes.right_items) || right_items?.length) {
    next.right_items = right_items ?? [];
  }
  if (hero_metric) next.hero_metric = hero_metric;
  return next;
}

export function normalizePptData(
  data: PptData,
  normalizeChartOptions?: NormalizeChartOptions,
): PptData {
  return {
    ...data,
    slides: data.slides.map(
      (s) => normalizeSlideData(s, normalizeChartOptions) ?? enrichSlideSpeakerNotes(s),
    ),
  };
}

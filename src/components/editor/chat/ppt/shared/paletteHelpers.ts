import type { PptChart, PptPalette } from "../types";

export function parseCssColorToRgb(color: string): [number, number, number] | null {
  const c = color.trim();
  const hex = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
  const rgb = c.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return null;
}

export function colorRelativeLuminance(color: string): number {
  const rgb = parseCssColorToRgb(color);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 对比度（1~21）；任一颜色无法解析时返回 21（视为安全，不强改） */
export function colorContrastRatio(a: string, b: string): number {
  if (!parseCssColorToRgb(a) || !parseCssColorToRgb(b)) return 21;
  const la = colorRelativeLuminance(a);
  const lb = colorRelativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** 按背景亮度选可读的文字色 */
export function readableTextOn(bg: string): string {
  return colorRelativeLuminance(bg) > 0.5 ? "#0a0a0a" : "#f5f5f5";
}

/**
 * 兜底修正 palette 自相矛盾的情况（如后端把 text_color 与 bg_color 设成同色），
 * 保证正文/次要文字与背景有足够对比度，避免「黑底黑字」完全不可读。
 */
export function ensureReadablePaletteVars(vars: Record<string, string>): void {
  const bg = vars["--ppt-bg"];
  if (!bg || !parseCssColorToRgb(bg)) return;
  const fallbackText = readableTextOn(bg);
  const text = vars["--ppt-text"];
  if (!text || colorContrastRatio(text, bg) < 3) {
    vars["--ppt-text"] = fallbackText;
  }
  const textSecondary = vars["--ppt-text-secondary"];
  if (textSecondary && colorContrastRatio(textSecondary, bg) < 2.5) {
    vars["--ppt-text-secondary"] = fallbackText;
  }
}

/** 将 Y 轴上限取整到「好看」的刻度，避免柱子超出最顶网格线 */
export function ceilToNiceAxisMax(value: number, tickCount = 5): number {
  if (value <= 0) return 1;
  const rawStep = value / tickCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalizedStep = rawStep / magnitude;
  let step: number;
  if (normalizedStep <= 1.5) step = magnitude;
  else if (normalizedStep <= 3) step = 2 * magnitude;
  else if (normalizedStep <= 7) step = 5 * magnitude;
  else step = 10 * magnitude;
  return Math.ceil(value / step) * step;
}

const DEFAULT_ACCENT = "#4a90e2";
const DEFAULT_HERO_GOLD = "#d4af37";

const PIE_COLORS = [
  "#4a90e2",
  "#f5a623",
  "#50e3c2",
  "#e25c5c",
  "#b8e986",
  "#7c5cfc",
  "#34c78a",
  "#e2b34a",
  "#9b59b6",
  "#1abc9c",
];

export function normalizeAccentColor(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const c = raw.trim();
  return c || undefined;
}

/** 单色盘展开为多色（后端重复同一 hex 时仍按索引区分 KPI/系列） */
export function expandMonochromeAccentPalette(base: string, count: number): string[] {
  const n = Math.max(1, count);
  const rgb = parseCssColorToRgb(base);
  if (!rgb) {
    return Array.from({ length: n }, (_, i) => PIE_COLORS[i % PIE_COLORS.length]);
  }
  const [r, g, b] = rgb.map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const d = max - min;
  if (d > 0.001) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = d < 0.001 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return Array.from({ length: n }, (_, i) => {
    const hue = (h + (i * 360) / n) % 360;
    const sat = Math.min(1, Math.max(0.35, s));
    const lit = Math.min(0.72, Math.max(0.42, l + (i % 2 === 0 ? 0.06 : -0.04)));
    const c = (1 - Math.abs(2 * lit - 1)) * sat;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = lit - c / 2;
    let rp = 0;
    let gp = 0;
    let bp = 0;
    if (hue < 60) {
      rp = c;
      gp = x;
    } else if (hue < 120) {
      rp = x;
      gp = c;
    } else if (hue < 180) {
      gp = c;
      bp = x;
    } else if (hue < 240) {
      gp = x;
      bp = c;
    } else if (hue < 300) {
      rp = x;
      bp = c;
    } else {
      rp = c;
      bp = x;
    }
    const toHex = (v: number) =>
      Math.round((v + m) * 255)
        .toString(16)
        .padStart(2, "0");
    return `#${toHex(rp)}${toHex(gp)}${toHex(bp)}`;
  });
}

/** 文稿级强调色列表：accent_colors → accent_color → 空 */
export function resolveDeckAccentColors(palette?: PptPalette, minSlots = 4): string[] {
  const list = palette?.accent_colors;
  let colors: string[] = [];
  if (Array.isArray(list) && list.length) {
    colors = list.map((c) => normalizeAccentColor(c)).filter(Boolean) as string[];
  } else {
    const single = normalizeAccentColor(palette?.accent_color);
    if (single) colors = [single];
  }
  if (!colors.length) return [];
  const norm = colors.map((c) => c.toLowerCase());
  const unique = [...new Set(norm)];
  if (unique.length <= 1) {
    const base = colors[0] || unique[0] || DEFAULT_ACCENT;
    const slots = Math.max(minSlots, colors.length, 4);
    return expandMonochromeAccentPalette(base, slots);
  }
  return colors;
}

export function accentColorAt(colors: string[], index: number, fallback = DEFAULT_ACCENT): string {
  if (!colors.length) return fallback;
  return colors[((index % colors.length) + colors.length) % colors.length] || fallback;
}

export function resolveMetricCardAccent(
  card: { accent_color?: string },
  index: number,
  palette?: PptPalette,
): string {
  const cardColor = normalizeAccentColor(card.accent_color);
  if (cardColor) return cardColor;
  const deck = resolveDeckAccentColors(palette);
  return accentColorAt(deck, index, normalizeAccentColor(palette?.accent_color) || DEFAULT_ACCENT);
}

export function padChartColorList(colors: string[], count: number): string[] {
  if (!colors.length || count <= colors.length) return colors.slice(0, count || colors.length);
  const out = [...colors];
  while (out.length < count) {
    out.push(colors[out.length % colors.length]);
  }
  return out;
}

/** chart.colors 全同色时回退 deck 多色或按色相展开 */
export function resolveChartColorList(
  chart?: PptChart,
  palette?: PptPalette,
  minCount = 4,
): string[] {
  const fromChart = chart?.colors
    ?.map((c) => normalizeAccentColor(c))
    .filter(Boolean) as string[] | undefined;
  const deck = resolveDeckAccentColors(palette, minCount);
  const need = Math.max(minCount, fromChart?.length ?? 0, 4);

  if (fromChart?.length) {
    const uniqueChart = [...new Set(fromChart.map((c) => c.toLowerCase()))];
    if (uniqueChart.length > 1) {
      return padChartColorList(fromChart, need);
    }
    const uniqueDeck = [...new Set(deck.map((c) => c.toLowerCase()))];
    if (uniqueDeck.length > 1) {
      return padChartColorList(deck, Math.max(need, fromChart.length));
    }
    const base =
      uniqueChart[0] || deck[0] || normalizeAccentColor(palette?.accent_color) || DEFAULT_ACCENT;
    return expandMonochromeAccentPalette(base, Math.max(need, fromChart.length));
  }
  if (deck.length) return padChartColorList(deck, need);
  return padChartColorList([...PIE_COLORS], need);
}

export { DEFAULT_ACCENT, DEFAULT_HERO_GOLD, PIE_COLORS };

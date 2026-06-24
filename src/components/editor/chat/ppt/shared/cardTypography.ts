/**
 * Card typography: font size scales with item count + text length + container (cqi).
 *
 * Tier rules (inspect DOM: data-typo-count / data-typo-chars / data-typo-density):
 * | density | max items | max total chars | max single item | scale |
 * |---------|-----------|-----------------|-----------------|-------|
 * | sparse  | 2         | 90              | 55              | 1.00  |
 * | normal  | 3         | 180             | 90              | 0.84  |
 * | dense   | 4         | 320             | 120             | 0.68  |
 * | compact | beyond dense thresholds                         | 0.52  |
 */

export type CardTypographyDensity = "sparse" | "normal" | "dense" | "compact";

export interface CardTypographyTier {
  maxCount: number;
  maxTotalChars: number;
  maxItemChars: number;
  scale: number;
}

export const CARD_TYPOGRAPHY_TIERS: Record<CardTypographyDensity, CardTypographyTier> = {
  sparse: { maxCount: 2, maxTotalChars: 90, maxItemChars: 55, scale: 1 },
  normal: { maxCount: 3, maxTotalChars: 180, maxItemChars: 90, scale: 0.84 },
  dense: { maxCount: 4, maxTotalChars: 320, maxItemChars: 120, scale: 0.68 },
  compact: { maxCount: Infinity, maxTotalChars: Infinity, maxItemChars: Infinity, scale: 0.52 },
};

export interface CardTypographyMetrics {
  count: number;
  totalLen: number;
  maxLen: number;
  avgLen: number;
  density: CardTypographyDensity;
  /** 0.52 (smallest) – 1.0 (largest), derived from tier + within-tier load */
  scale: number;
}

function clampScale(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function measureCardText(text: string): number {
  return text
    .replace(/\[\d+\]/g, "")
    .replace(/\s*—\s*来源:.*$/i, "")
    .replace(/\s+/g, "")
    .length;
}

/** Pick density tier from item count and measured char lengths. */
export function resolveCardTypographyDensity(
  count: number,
  totalLen: number,
  maxLen: number,
): CardTypographyDensity {
  const { sparse, normal, dense } = CARD_TYPOGRAPHY_TIERS;
  if (count <= sparse.maxCount && totalLen <= sparse.maxTotalChars && maxLen <= sparse.maxItemChars) {
    return "sparse";
  }
  if (count <= normal.maxCount && totalLen <= normal.maxTotalChars && maxLen <= normal.maxItemChars) {
    return "normal";
  }
  if (count <= dense.maxCount && totalLen <= dense.maxTotalChars && maxLen <= dense.maxItemChars) {
    return "dense";
  }
  return "compact";
}

function withinTierLoad(
  density: CardTypographyDensity,
  count: number,
  totalLen: number,
  maxLen: number,
): number {
  const tier = CARD_TYPOGRAPHY_TIERS[density];
  const countRatio = tier.maxCount > 0 && Number.isFinite(tier.maxCount) ? count / tier.maxCount : 0;
  const totalRatio =
    tier.maxTotalChars > 0 && Number.isFinite(tier.maxTotalChars)
      ? totalLen / tier.maxTotalChars
      : 0;
  const maxRatio =
    tier.maxItemChars > 0 && Number.isFinite(tier.maxItemChars) ? maxLen / tier.maxItemChars : 0;
  return Math.max(countRatio, totalRatio, maxRatio);
}

export function analyzeCardTypography(texts: string[]): CardTypographyMetrics {
  const count = texts.length;

  if (!count) {
    return {
      count: 0,
      totalLen: 0,
      maxLen: 0,
      avgLen: 0,
      density: "sparse",
      scale: CARD_TYPOGRAPHY_TIERS.sparse.scale,
    };
  }

  const lengths = texts.map(measureCardText);
  const totalLen = lengths.reduce((sum, len) => sum + len, 0);
  const maxLen = Math.max(...lengths);
  const avgLen = totalLen / count;
  const density = resolveCardTypographyDensity(count, totalLen, maxLen);
  const tierScale = CARD_TYPOGRAPHY_TIERS[density].scale;
  const load = withinTierLoad(density, count, totalLen, maxLen);
  const scale = clampScale(tierScale * (1.06 - load * 0.1), tierScale * 0.88, tierScale);

  return { count, totalLen, maxLen, avgLen, density, scale };
}

export function cardTypographyStyle(metrics: CardTypographyMetrics): Record<string, string> {
  const { scale } = metrics;

  const bodyMin = Math.round(10 + scale * 8);
  const bodyCqi = (0.82 + scale * 1.02).toFixed(2);
  const bodyMax = Math.round(12 + scale * 14);
  const titleMin = Math.round(15 + scale * 11);
  const titleCqi = (1.15 + scale * 1.15).toFixed(2);
  const titleMax = Math.round(20 + scale * 20);
  const gap = Math.round(7 + scale * 9);
  const lineHeight = scale >= 0.82 ? 1.42 : scale >= 0.62 ? 1.36 : 1.3;

  return {
    "--ppt-card-typo-body-fs": `clamp(${bodyMin}px, ${bodyCqi}cqi, ${bodyMax}px)`,
    "--ppt-card-typo-title-fs": `clamp(${titleMin}px, ${titleCqi}cqi, ${titleMax}px)`,
    "--ppt-card-typo-body-lh": String(lineHeight),
    "--ppt-card-typo-gap": `${gap}px`,
  };
}

export function cardTypographyClass(
  metrics: CardTypographyMetrics,
): Record<string, boolean> {
  return {
    "ppt-card-typography": true,
    [`ppt-card-typography--${metrics.density}`]: true,
  };
}

export function cardTypographyBindings(texts: string[]): {
  class: Record<string, boolean>;
  style: Record<string, string>;
  "data-typo-count": string;
  "data-typo-chars": string;
  "data-typo-max-chars": string;
  "data-typo-density": CardTypographyDensity;
  "data-typo-scale": string;
} {
  const metrics = analyzeCardTypography(texts);

  return {
    class: cardTypographyClass(metrics),
    style: cardTypographyStyle(metrics),
    "data-typo-count": String(metrics.count),
    "data-typo-chars": String(metrics.totalLen),
    "data-typo-max-chars": String(metrics.maxLen),
    "data-typo-density": metrics.density,
    "data-typo-scale": metrics.scale.toFixed(2),
  };
}

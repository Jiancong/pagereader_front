import { buildFontFamilyCss } from "@/composables/useFontLoader";

/**
 * PPT 全文统一字体：隶书 / 宋体 / 楷体 / 黑体 / 魏碑（按文稿稳定择一，同一份 PPT 内标题与正文一致）。
 * `family` 为 CSS / pptxgenjs `fontFace` 主字体名。
 */
export const PPT_DECK_FONT_OPTIONS = [
  { label: "隶书", family: "LiSu" },
  { label: "宋体", family: "SimSun" },
  { label: "楷体", family: "KaiTi" },
  { label: "黑体", family: "SimHei" },
  { label: "魏碑", family: "STXinwei" },
] as const;

export type PptDeckFontFamily = (typeof PPT_DECK_FONT_OPTIONS)[number]["family"];

const PPT_DECK_FONT_FAMILIES: readonly PptDeckFontFamily[] = PPT_DECK_FONT_OPTIONS.map(
  (o) => o.family
);

/** @deprecated 请使用 resolvePptDeckFontFamilyFromData；保留以免旧引用报错 */
export const PPT_BODY_FONT: PptDeckFontFamily = "SimHei";

function stableHash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 按种子字符串从五种传统字体中稳定择一 */
export function resolvePptDeckFontFamily(seed: string): PptDeckFontFamily {
  const trimmed = (seed ?? "").trim();
  if (!trimmed) return PPT_DECK_FONT_FAMILIES[0];
  return PPT_DECK_FONT_FAMILIES[stableHash(trimmed) % PPT_DECK_FONT_FAMILIES.length];
}

export function resolvePptDeckFontFamilyFromData(data: {
  title?: string;
  subtitle?: string;
  theme?: string;
}): PptDeckFontFamily {
  const seed = [data.title, data.subtitle, data.theme]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join("|");
  return resolvePptDeckFontFamily(seed || "ppt");
}

export function buildPptDeckFontCss(data: {
  title?: string;
  subtitle?: string;
  theme?: string;
}): string {
  return buildFontFamilyCss(resolvePptDeckFontFamilyFromData(data));
}

/** 章节标题与正文同源字体（整份 PPT 统一） */
export function resolvePptSectionTitleFontFamily(
  _title: string,
  deck?: { title?: string; subtitle?: string; theme?: string }
): PptDeckFontFamily {
  if (deck) return resolvePptDeckFontFamilyFromData(deck);
  return resolvePptDeckFontFamily(_title);
}

export function buildPptSectionTitleFontCss(
  _title: string,
  deck?: { title?: string; subtitle?: string; theme?: string }
): string {
  return buildPptDeckFontCss(deck ?? { title: _title });
}

/** PPTX 原生文本 fontFace：与在线 deck 主字体一致 */
export function resolvePptxFontFace(deckFont: PptDeckFontFamily): string {
  return deckFont;
}

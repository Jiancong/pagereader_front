/** 后端 palette.theme_tokens（HTML 模板方案 C） */
export interface PptThemeTypography {
  font_body?: string;
  font_heading?: string;
  google_fonts_urls?: string[];
  heading_letter_spacing?: string | number;
  tagline?: string;
}

export interface PptThemeShape {
  card_border_radius_px?: number;
  border_width_px?: number;
}

export interface PptThemeTokens {
  scheme?: string;
  typography?: PptThemeTypography;
  shape?: PptThemeShape;
  tagline?: string;
}

export interface PptPaletteThemeSource {
  bg_color?: string;
  bg_color_secondary?: string;
  accent_color?: string;
  accent_colors?: string[];
  text_color?: string;
  text_secondary?: string;
  css_variables?: Record<string, string>;
  theme_tokens?: PptThemeTokens;
}

const PPT_GOOGLE_FONT_LINK_ATTR = "data-ppt-google-font";

/** 动态注入 Google Fonts（ppt_complete 后调用） */
export function syncPptGoogleFontLinks(urls: string[] | undefined): void {
  if (typeof document === "undefined") return;
  document
    .querySelectorAll(`link[${PPT_GOOGLE_FONT_LINK_ATTR}]`)
    .forEach((el) => el.remove());

  const wanted = [...new Set((urls ?? []).map((u) => String(u).trim()).filter(Boolean))];
  for (const href of wanted) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute(PPT_GOOGLE_FONT_LINK_ATTR, "1");
    document.head.appendChild(link);
  }
}

/** theme_tokens.scheme 优先；无 scheme 时返回 null 由调用方按背景亮度推断 */
export function resolvePptSchemeIsLight(palette?: PptPaletteThemeSource): boolean | null {
  const scheme = palette?.theme_tokens?.scheme?.trim().toLowerCase();
  if (scheme === "light") return true;
  if (scheme === "dark") return false;
  return null;
}

function formatLetterSpacing(raw: string | number | undefined): string | undefined {
  if (raw == null || raw === "") return undefined;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return `${raw}px`;
  }
  const s = String(raw).trim();
  return s || undefined;
}

/**
 * 将 palette + theme_tokens 转为幻灯片容器内联 CSS 变量（保留原有 5 色逻辑）。
 */
export function buildPptThemeStyleVars(
  palette: PptPaletteThemeSource | undefined,
  fallbackDeckFontCss: string
): Record<string, string> {
  const vars: Record<string, string> = {};
  const tt = palette?.theme_tokens;
  const ty = tt?.typography ?? {};

  const bodyFont = (ty.font_body ?? "").trim();
  const headingFont = (ty.font_heading ?? bodyFont).trim();
  const bodyCss = bodyFont || fallbackDeckFontCss;
  const headingCss = headingFont || bodyCss;

  vars["--ppt-font-body"] = bodyCss;
  vars["--ppt-font-heading"] = headingCss;
  vars["--ppt-font-family"] = bodyCss;
  vars["--ppt-quote-font-family"] = bodyCss;
  vars.fontFamily = bodyCss;

  const spacing = formatLetterSpacing(ty.heading_letter_spacing);
  if (spacing) vars["--ppt-heading-letter-spacing"] = spacing;

  const radius = tt?.shape?.card_border_radius_px;
  if (radius != null && Number.isFinite(Number(radius))) {
    vars["--ppt-radius-card"] = `${Number(radius)}px`;
  }

  const borderW = tt?.shape?.border_width_px;
  if (borderW != null && Number.isFinite(Number(borderW))) {
    vars["--ppt-card-border-width"] = `${Number(borderW)}px`;
  }

  if (palette?.bg_color) vars["--ppt-bg"] = palette.bg_color;
  if (palette?.accent_color) vars["--ppt-accent"] = palette.accent_color;
  if (palette?.text_color) vars["--ppt-text"] = palette.text_color;
  if (palette?.text_secondary) vars["--ppt-text-secondary"] = palette.text_secondary;
  if (palette?.bg_color_secondary) vars["--ppt-bg-secondary"] = palette.bg_color_secondary;

  const accentList = palette?.accent_colors;
  if (Array.isArray(accentList)) {
    accentList.forEach((c, i) => {
      if (c) vars[`--ppt-accent-${i + 1}`] = String(c);
    });
  }

  if (palette?.css_variables) {
    for (const [key, val] of Object.entries(palette.css_variables)) {
      if (val == null || val === "") continue;
      const k = key.trim().startsWith("--") ? key.trim() : `--${key.trim()}`;
      vars[k] = String(val);
    }
  }

  return vars;
}

/** 工具栏/调试：当前 HTML 模板选版摘要 */
export function formatPptTemplateDebugLabel(
  templateId?: string,
  pickSource?: string,
  tagline?: string
): string {
  const parts: string[] = [];
  if (templateId) parts.push(templateId);
  if (pickSource) parts.push(`(${pickSource})`);
  if (tagline && !parts.length) parts.push(tagline);
  else if (tagline) parts.push(`· ${tagline}`);
  return parts.join(" ").trim();
}

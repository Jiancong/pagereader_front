import type { PptSlide } from "../types";

function isMetricCardsContentItem(item: unknown): boolean {
  if (!item || typeof item !== "object") return false;
  const o = item as Record<string, unknown>;
  const type = String(o.type ?? o.layout ?? o.block ?? "").trim().toLowerCase();
  if (type === "metric_cards" || type === "metric_cards_row") return true;
  return Array.isArray(o.metric_cards) && !pickDisplayString(o.title ?? o.text);
}

function isSummaryItem(item: unknown): boolean {
  const text = coerceContentItemText(item);
  return /^(总结|结论|核心洞察|核心观点|小结|Summary|Conclusion|Key Insights|Key Takeaways)[：:]/i.test(
    text,
  );
}

export function parseTocTitle(item: string): string {
  // 去掉开头的序号（如 "01 " 或 "01. "）
  const stripped = item.replace(/^\d{1,2}[\.\s]\s*/, "");
  // 按中文破折号或英文长短破折号分割（排除数字之间的连字符，如 2026-2030）
  const sep = stripped.search(/\s*[—–]\s*|\s+\-\s+|(?<!\d)\-(?!\d)/);
  return sep > 0 ? stripped.slice(0, sep).trim() : stripped.trim();
}

/**
 * 解析 TOC 条目的描述部分（破折号后面的文字）
 */
export function parseTocDesc(item: string): string {
  const stripped = item.replace(/^\d{1,2}[\.\s]\s*/, "");
  // 排除数字之间的连字符（如 2026-2030）
  const sep = stripped.search(/\s*[—–]\s*|\s+\-\s+|(?<!\d)\-(?!\d)/);
  if (sep <= 0) return "";
  const match = stripped.slice(sep).match(/^[\s—–\-]+(.*)$/);
  return match ? match[1].trim() : "";
}
export const CONTENT_LIST_KEYS = [
  "items",
  "bullets",
  "bullet_points",
  "points",
  "entries",
  "list",
  "rows",
] as const;

/** 将任意后端字段安全转为展示用字符串，避免 [object Object] */
export function pickDisplayString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const text = pickDisplayString(entry);
      if (text) return text;
    }
    return "";
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    for (const key of [
      "text",
      "value",
      "label",
      "title",
      "content",
      "description",
      "body",
      "en",
      "zh",
      "name",
    ]) {
      const text = pickDisplayString(o[key]);
      if (text) return text;
    }
  }
  const fallback = String(value).trim();
  return fallback === "[object Object]" ? "" : fallback;
}

/** 将 content 单项统一为字符串（支持后端对象形态） */
export function coerceContentItemText(item: unknown): string {
  if (typeof item === "string") return item.trim();
  if (Array.isArray(item)) {
    const nested = normalizeSlideContent(item);
    if (nested?.length === 1) return nested[0];
    if (nested?.length) return nested.join("\n");
    return "";
  }
  if (item && typeof item === "object") {
    if (isMetricCardsContentItem(item)) return "";
    const o = item as Record<string, unknown>;
    const title = pickDisplayString(
      o.title ?? o.heading ?? o.label ?? o.name ?? o.feature ?? o.module ?? o.point
    );
    const body = pickDisplayString(
      o.description ??
        o.body ??
        o.text ??
        o.detail ??
        o.content ??
        o.desc ??
        o.summary ??
        o.markdown ??
        o.md
    );
    if (title && body) return `${title} — ${body}`;
    if (title) return title;
    if (body) return body;
  }
  return pickDisplayString(item);
}

export function displayText(item: unknown): string {
  return coerceContentItemText(item);
}

export function modernLiteraryCleanText(item: unknown): string {
  return displayText(item)
    .replace(/(^|\s)\((\/resource\/[^)]+|https?:\/\/[^)\s]+#page=[^)]+)\)/g, "$1")
    .replace(/\bhttps?:\/\/\S+#page=\S+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** 标题与正文之间的分隔符（含多种 Unicode 破折号） */
export const CONTENT_TITLE_SEP_RE =
  /\s*([—–\-－―‒−]|[：:])\s*/;

/** 拆分「标题 + 正文」：支持 **标题** — 正文 / 冒号 / 破折号 */
export function splitContentItem(item: unknown): { title: string; body: string } {
  const text = coerceContentItemText(item);
  if (!text) return { title: "", body: "" };

  const stripped = text.replace(/^\d{1,2}[\.\s]\s*/, "");

  const boldLine = stripped.match(
    /^\*\*([^*]+)\*\*\s*(?:[—–\-－―‒−]|[：:])\s*([\s\S]+)$/
  );
  if (boldLine) {
    return {
      title: `**${boldLine[1].trim()}**`,
      body: boldLine[2].trim(),
    };
  }

  const sep = stripped.search(CONTENT_TITLE_SEP_RE);
  if (sep > 0) {
    const title = stripped.slice(0, sep).trim();
    const body = stripped
      .slice(sep)
      .replace(CONTENT_TITLE_SEP_RE, "")
      .trim();
    return { title, body };
  }

  const colon = stripped.match(/^(.{1,48}?)[：:]\s+([\s\S]+)$/);
  if (colon) {
    return { title: colon[1].trim(), body: colon[2].trim() };
  }

  return { title: stripped.trim(), body: "" };
}

export function stripContentPointTitleMarkdown(title: string): string {
  return title.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
}

export function parseContentHeading(item: unknown): string {
  return splitContentItem(item).title;
}

export function parseContentBody(item: unknown): string {
  const { title, body } = splitContentItem(item);
  return body || coerceContentItemText(item);
}

export function contentPointTitle(item: unknown): string {
  const { title, body } = splitContentItem(item);
  const raw = title || parseTocTitle(coerceContentItemText(item)) || body || coerceContentItemText(item);
  return stripContentPointTitleMarkdown(raw);
}

export function contentPointBody(item: unknown): string {
  return parseContentBody(item);
}

export function hasContentPointBody(item: unknown): boolean {
  const title = contentPointTitle(item).trim();
  const body = contentPointBody(item).trim();
  return body.length > 0 && body !== title;
}

export function normalizeSlideContent(raw: unknown): string[] | undefined {
  if (raw == null) return undefined;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const nested = normalizeSlideContent(JSON.parse(trimmed));
        if (nested?.length) return nested;
      } catch {
        /* 非 JSON 字符串，按正文处理 */
      }
    }
    const lines = trimmed
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return lines.length ? lines : [trimmed];
  }

  if (Array.isArray(raw)) {
    const out: string[] = [];
    for (const item of raw) {
      if (isMetricCardsContentItem(item)) continue;
      if (Array.isArray(item)) {
        const nested = normalizeSlideContent(item);
        if (nested?.length) out.push(...nested);
        continue;
      }
      const text = coerceContentItemText(item);
      if (text) out.push(text);
    }
    return out.length ? out : undefined;
  }

  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    for (const key of CONTENT_LIST_KEYS) {
      if (Array.isArray(o[key])) {
        return normalizeSlideContent(o[key]);
      }
    }
    const single = coerceContentItemText(raw);
    return single ? [single] : undefined;
  }

  return undefined;
}

/** 解析幻灯片要点列表（content / left_content / 嵌套 items 等） */
export function resolveSlideBulletItemsRaw(slide: PptSlide | undefined): string[] | undefined {
  if (!slide) return undefined;
  const extra = slide as unknown as Record<string, unknown>;
  const candidates: unknown[] = [
    slide.content,
    slide.left_content,
    extra.bullets,
    extra.bullet_points,
    extra.points,
  ];
  for (const raw of candidates) {
    const items = normalizeSlideContent(raw);
    if (items?.length) return items;
  }
  return undefined;
}

export function resolveSlideBulletItems(slide: PptSlide | undefined): string[] {
  return getContentItems(resolveSlideBulletItemsRaw(slide));
}

export function getContentItems(content: string[] | undefined): string[] {
  if (!content?.length) return [];
  const items = content.map(coerceContentItemText).filter(Boolean);
  const last = items[items.length - 1];
  if (last && isSummaryItem(last)) return items.slice(0, -1);
  return items;
}

export function getSummaryItem(content: string[] | undefined): string | null {
  if (!content?.length) return null;
  const items = content.map(coerceContentItemText).filter(Boolean);
  const last = items[items.length - 1];
  return last && isSummaryItem(last) ? last : null;
}

export function isPredominantlyLatin(text: string): boolean {
  const latin = (text.match(/[a-zA-Z]/g) ?? []).length;
  const cjk = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g) ?? []).length;
  if (!latin) return false;
  return latin >= cjk;
}

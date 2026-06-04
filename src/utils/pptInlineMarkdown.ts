/**
 * PPT 行内 Markdown：**粗体**、*斜体*、`代码`（不解析块级语法）。
 */

/** 全角星号 → ASCII，避免 LLM 输出不可解析字符 */
function normalizeAsterisks(text: string): string {
  return text.replace(/\uFF0A/g, "*");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 将 **内容** 转为 &lt;strong&gt;…&lt;/strong&gt;。
 * 不依赖 marked，避免 bundler / 中英文混排时 emphasis 解析失败。
 */
function convertDoubleAsteriskBoldToStrongHtml(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf("**", i);
    if (open === -1) {
      out += escapeHtml(text.slice(i));
      break;
    }
    out += escapeHtml(text.slice(i, open));
    const close = text.indexOf("**", open + 2);
    if (close === -1) {
      out += escapeHtml(text.slice(open));
      break;
    }
    const inner = text.slice(open + 2, close);
    if (!inner) {
      out += "**";
      i = open + 2;
      continue;
    }
    out += `<strong>${escapeHtml(inner)}</strong>`;
    i = close + 2;
  }
  return out;
}

/** 单星号斜体（排除已处理的 **） */
function convertSingleAsteriskItalicToEmHtml(html: string): string {
  return html.replace(
    /(?<!\*)\*([^*\n]+?)\*(?!\*)/g,
    (_m, inner: string) => `<em>${escapeHtml(inner)}</em>`
  );
}

function convertBacktickCodeToHtml(html: string): string {
  return html.replace(/`([^`\n]+?)`/g, (_m, inner: string) => `<code>${escapeHtml(inner)}</code>`);
}

/** 去掉行内标记，供字体选择等逻辑使用 */
export function stripPptInlineMarkdown(source: string): string {
  if (source == null || source === "") return "";
  return normalizeAsterisks(String(source))
    .replace(/\*\*([^*]+?)\*\*/g, "$1")
    .replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, "$1")
    .replace(/`([^`\n]+?)`/g, "$1");
}

export type PptxInlineTextOptions = Record<string, unknown>;

export interface PptxTextRun {
  text: string;
  options?: PptxInlineTextOptions;
}

/** 行内 Markdown → pptxgenjs 富文本 runs（**粗体**、*斜体*、`代码`） */
export function pptInlineMarkdownToPptxRuns(
  source: string,
  baseOptions: PptxInlineTextOptions = {}
): PptxTextRun[] {
  if (source == null || source === "") return [];
  const text = normalizeAsterisks(String(source));
  const runs: PptxTextRun[] = [];

  const pushPlain = (chunk: string) => {
    if (!chunk) return;
    const last = runs[runs.length - 1];
    const plainOpts = { ...baseOptions };
    const lastPlain =
      last &&
      !last.options?.bold &&
      !last.options?.italic &&
      last.options?.fontFace === plainOpts.fontFace &&
      last.options?.fontSize === plainOpts.fontSize &&
      last.options?.color === plainOpts.color;
    if (lastPlain) {
      last.text += chunk;
    } else {
      runs.push({ text: chunk, options: { ...plainOpts } });
    }
  };

  let i = 0;
  while (i < text.length) {
    if (text.startsWith("**", i)) {
      const close = text.indexOf("**", i + 2);
      if (close !== -1) {
        const inner = text.slice(i + 2, close);
        if (inner) {
          runs.push({ text: inner, options: { ...baseOptions, bold: true } });
          i = close + 2;
          continue;
        }
      }
    }
    if (text[i] === "*" && text[i + 1] !== "*") {
      const close = text.indexOf("*", i + 1);
      if (close !== -1 && text[close + 1] !== "*") {
        const inner = text.slice(i + 1, close);
        if (inner && !inner.includes("\n")) {
          runs.push({ text: inner, options: { ...baseOptions, italic: true } });
          i = close + 1;
          continue;
        }
      }
    }
    if (text[i] === "`") {
      const close = text.indexOf("`", i + 1);
      if (close !== -1) {
        const inner = text.slice(i + 1, close);
        if (inner && !inner.includes("\n")) {
          runs.push({
            text: inner,
            options: { ...baseOptions, fontFace: "Consolas" },
          });
          i = close + 1;
          continue;
        }
      }
    }

    let next = text.length;
    for (const marker of ["**", "*", "`"]) {
      const idx = text.indexOf(marker, i);
      if (idx !== -1 && idx < next) next = idx;
    }
    pushPlain(text.slice(i, next));
    i = next;
  }

  return runs.length ? runs : [{ text: stripPptInlineMarkdown(source), options: { ...baseOptions } }];
}

/** 多条要点（每条可含行内 Markdown）→ 带项目符号的 pptx runs */
export function buildPptxBulletTextRuns(
  items: string[],
  baseOptions: PptxInlineTextOptions
): PptxTextRun[] {
  const out: PptxTextRun[] = [];
  items.forEach((item, idx) => {
    const runs = pptInlineMarkdownToPptxRuns(item, baseOptions);
    if (!runs.length) return;
    runs[0].options = {
      ...(runs[0].options ?? baseOptions),
      bullet: { code: "2022" },
      paraSpaceAfter: baseOptions.paraSpaceAfter ?? 5,
      breakLine: idx < items.length - 1,
    };
    out.push(...runs);
  });
  return out;
}

export function formatPptInlineMarkdown(source: unknown): string {
  if (source == null || source === "") return "";
  if (typeof source === "object") {
    const o = source as Record<string, unknown>;
    for (const key of ["text", "value", "content", "title", "en", "zh"]) {
      const nested = o[key];
      if (typeof nested === "string" && nested.trim()) {
        return formatPptInlineMarkdown(nested);
      }
    }
    return "";
  }
  const text = normalizeAsterisks(String(source));
  if (text.trim() === "[object Object]") return "";
  let html = convertDoubleAsteriskBoldToStrongHtml(text);
  html = convertSingleAsteriskItalicToEmHtml(html);
  html = convertBacktickCodeToHtml(html);
  return html;
}

export interface PptPageReference {
  ref_id?: number | string;
  url?: string;
  title?: string;
}

/** 表格单元格：**粗体** + [N] 引用角标（可点击） */
export function formatPptTableCellMarkdown(
  source: string,
  pageReferences?: PptPageReference[]
): string {
  let html = formatPptInlineMarkdown(source);
  html = html.replace(/\[(\d+)\]/g, (_m, refId: string) => {
    const info = (pageReferences || []).find(
      (r) => String(r.ref_id) === refId || r.ref_id === Number(refId)
    );
    if (info?.url) {
      const title = info.title ? ` title="${escapeHtml(info.title)}"` : "";
      return `<a href="#" class="ppt-table-ref" data-ppt-ref-id="${escapeHtml(refId)}"${title} role="button">[${escapeHtml(refId)}]</a>`;
    }
    return `<sup class="ppt-table-ref ppt-table-ref--muted">[${escapeHtml(refId)}]</sup>`;
  });
  return html;
}

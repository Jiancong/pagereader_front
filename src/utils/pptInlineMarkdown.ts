/**
 * PPT 行内 Markdown：**粗体**、*斜体*、`代码`、$...$ / $$...$$ 数学公式（不解析块级语法）。
 */

import katex from "katex";

/** 全角星号 → ASCII，避免 LLM 输出不可解析字符 */
function normalizeAsterisks(text: string): string {
  return text.replace(/\uFF0A/g, "*");
}

/** Wrap common paper/ML parameter tokens in $...$ for inline KaTeX inside prose. */
function wrapInlineMathTokens(text: string): string {
  let s = text;
  s = s.replace(/\bd\s+model\b/gi, "$d_{\\text{model}}$");
  s = s.replace(/\bdmodel\b/gi, "$d_{\\text{model}}$");
  s = s.replace(/\bd_model\b/gi, "$d_{\\text{model}}$");
  s = s.replace(/\bd\s+ff\b/gi, "$d_{\\text{ff}}$");
  s = s.replace(/\bdff\b/gi, "$d_{\\text{ff}}$");
  s = s.replace(/\bd\s*([kKvV])\b/g, (_m, sub: string) => `$d_${sub.toLowerCase()}$`);
  s = s.replace(/\bPdrop\b/gi, "$P_{\\text{drop}}$");
  s = s.replace(/\bPPL\b/g, "$\\text{PPL}$");
  s = s.replace(/[ϵε]\s*ls\b/gi, "$\\epsilon_{\\text{ls}}$");
  s = s.replace(/O\(\s*n\s*²\s*\)/g, "$O(n^2)$");
  s = s.replace(/O\(n²\)/g, "$O(n^2)$");
  return s;
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

function renderKatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: "ignore",
      trust: false,
    });
  } catch {
    return escapeHtml(latex);
  }
}

function plainMathToLatex(expr: string): string {
  return plainAcademicMathToLatex(expr);
}

/** 将 LLM/原文摘录中的半结构化公式转为 KaTeX 可渲染的 LaTeX */
function plainAcademicMathToLatex(expr: string): string {
  let s = expr.trim();
  s = s.replace(/dimension\s*d\s*model/gi, "d_{\\text{model}}");
  s = s.replace(/dmodel/gi, "d_{\\text{model}}");
  s = s.replace(/\bd_model\b/gi, "d_{\\text{model}}");
  s = s.replace(/\bMultiHead\s*\(\s*Q\s*,\s*K\s*,\s*V\s*\)/gi, "\\text{MultiHead}(Q, K, V)");
  s = s.replace(/\bConcat\s*\(/gi, "\\text{Concat}(");
  s = s.replace(/\bAttention\s*\(/gi, "\\text{Attention}(");
  s = s.replace(/\bLayerNorm\s*\(/gi, "\\text{LayerNorm}(");
  s = s.replace(/\bSublayer\s*\(/gi, "\\text{Sublayer}(");
  s = s.replace(/\bSoftmax\s*\(/gi, "\\text{Softmax}(");
  s = s.replace(/\bW\s+O\b/g, "W^O");
  s = s.replace(/\bQW\s+Q\s+i\b/gi, "QW^Q_i");
  s = s.replace(/\bKW\s+K\s+i\b/gi, "KW^K_i");
  s = s.replace(/\bVW\s+V\s+i\b/gi, "VW^V_i");
  s = s.replace(/\bhead\s+(\d+)/gi, "head_$1");
  s = s.replace(/\bheadh\b/gi, "head_h");
  s = s.replace(/\bheadi\b/gi, "head_i");
  s = s.replace(/\s+where\s+/gi, " \\text{ where } ");
  s = s.replace(/\^(\([^)]+\))/g, (_m, inner: string) => `^{${inner.slice(1, -1)}}`);
  s = s.replace(/\^([A-Za-z0-9_/+\-]+)/g, "^{$1}");
  s = s.replace(/\bsin\b/g, "\\sin");
  s = s.replace(/\bcos\b/g, "\\cos");
  s = s.replace(/\btan\b/g, "\\tan");
  s = s.replace(/\blog\b/g, "\\log");
  s = s.replace(/\bln\b/g, "\\ln");
  return s;
}

function looksLikeNamedMathCall(text: string): boolean {
  return /\b(?:MultiHead|LayerNorm|Attention|Concat|Sublayer|Softmax)\s*\(/i.test(text);
}

/** English prose with spaces — not a compact formula even if it mentions "attention". */
function looksLikeNaturalLanguageProse(text: string): boolean {
  const t = text.trim();
  if (!/\s/.test(t) || t.length < 24) return false;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 5) return false;
  return /\b(?:the|this|we|is|are|in|or|and|a|an|of|to|for)\b/i.test(t);
}

function looksLikeAcademicMath(text: string): boolean {
  const t = text.trim();
  if (t.length < 6) return false;
  if (looksLikeNaturalLanguageProse(t)) return false;
  if (/\$[^$]+\$/.test(t)) return true;
  if (/d\s*model|dmodel|d_model/i.test(t)) return true;
  if (looksLikeNamedMathCall(t) && /[=+\-*/()]/.test(t)) return true;
  return /\b[A-Z][a-zA-Z]+\([^)]{2,}\)\s*=/.test(t);
}

function escapeLatexText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/([{}%&#_$])/g, (_m, ch: string) => {
    if (ch === "_") return "\\_";
    if (ch === "%") return "\\%";
    if (ch === "&") return "\\&";
    if (ch === "#") return "\\#";
    if (ch === "$") return "\\$";
    return `\\${ch}`;
  });
}

function readBalancedParenGroup(text: string, openIndex: number): string | null {
  if (text[openIndex] !== "(") return null;
  let depth = 0;
  for (let i = openIndex; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return text.slice(openIndex, i + 1);
    }
  }
  return null;
}

function readPlainMathExpression(text: string, start: number): string | null {
  const fnMatch = text.slice(start).match(/^[A-Za-z]+(?:\([^)]*\))?\s*=\s*(?:sin|cos|tan|log|ln|exp)\(/);
  if (!fnMatch) return null;
  let cursor = start + fnMatch[0].length - 1;
  const fnArgs = readBalancedParenGroup(text, cursor);
  if (!fnArgs) return null;
  cursor += fnArgs.length;
  return text.slice(start, cursor);
}

function findBigOSpans(text: string): Array<{ start: number; end: number; raw: string }> {
  const spans: Array<{ start: number; end: number; raw: string }> = [];
  const trigger = /O\(/g;
  let match: RegExpExecArray | null;
  while ((match = trigger.exec(text)) !== null) {
    const start = match.index;
    const group = readBalancedParenGroup(text, start + 1);
    if (!group) continue;
    spans.push({
      start,
      end: start + 1 + group.length,
      raw: text.slice(start, start + 1 + group.length),
    });
  }
  return spans;
}

function mergeMathSpans(
  ...lists: Array<Array<{ start: number; end: number; raw: string }>>
): Array<{ start: number; end: number; raw: string }> {
  const merged = lists.flat().sort((a, b) => a.start - b.start || a.end - b.end);
  const out: Array<{ start: number; end: number; raw: string }> = [];
  for (const span of merged) {
    const last = out[out.length - 1];
    if (!last || span.start >= last.end) out.push(span);
    else if (span.end > last.end) last.end = span.end;
  }
  return out;
}

function plainBigOToLatex(expr: string): string {
  const body = expr.startsWith("O(") ? expr.slice(2, -1) : expr;
  const normalized = body
    .replace(/²/g, "^{2}")
    .replace(/³/g, "^{3}")
    .replace(/·/g, " \\cdot ")
    .replace(/log_k/g, "\\log_k")
    .replace(/_k/g, "_{k}");
  return `O(${normalized})`;
}

function segmentValueToLatex(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("O(")) return plainBigOToLatex(trimmed);
  if (looksLikeAcademicMath(trimmed)) return plainAcademicMathToLatex(trimmed);
  if (trimmed.includes("\\") || trimmed.includes("$")) return trimmed;
  if (looksLikeNaturalLanguageProse(trimmed)) return `\\text{${escapeLatexText(trimmed)}}`;
  return plainAcademicMathToLatex(trimmed);
}

function findQuotedAcademicSpans(text: string): Array<{ start: number; end: number; raw: string }> {
  const spans: Array<{ start: number; end: number; raw: string }> = [];
  const re = /「([^」]+)」/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const inner = match[1].trim();
    if (looksLikeAcademicMath(inner)) {
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        raw: inner,
      });
    }
  }
  return spans;
}

function findAcademicFormulaSpans(text: string): Array<{ start: number; end: number; raw: string }> {
  const spans: Array<{ start: number; end: number; raw: string }> = [];
  const patterns = [
    /MultiHead\([^)]+\)\s*=\s*[^。，；\n—\[]+/gi,
    /LayerNorm\([^)]+\)(?:\s*=\s*[^。，；\n—\[]+)?/gi,
    /dimension?\s*d\s*model\s*=\s*\d+|dmodel\s*=\s*\d+/gi,
  ];
  for (const re of patterns) {
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        raw: match[0].trim(),
      });
    }
  }
  return spans;
}

function findPlainMathSpans(text: string): Array<{ start: number; end: number; raw: string }> {
  const spans: Array<{ start: number; end: number; raw: string }> = [];
  const trigger = /[A-Za-z]+\([^)]*\)\s*=\s*(?:sin|cos|tan|log|ln|exp)\(/g;
  let match: RegExpExecArray | null;
  while ((match = trigger.exec(text)) !== null) {
    const start = match.index;
    const first = readPlainMathExpression(text, start);
    if (!first) continue;
    let end = start + first.length;
    while (text[end] === " " || text[end] === "，" || text[end] === ",") {
      const sep = text[end];
      let nextStart = end + 1;
      if (sep !== " ") nextStart = end + 1;
      else {
        while (text[nextStart] === " ") nextStart += 1;
      }
      const next = readPlainMathExpression(text, nextStart);
      if (!next) break;
      end = nextStart + next.length;
      if (text[end - 1] !== ")" && text[end] !== "，" && text[end] !== ",") break;
      if (sep === " " && text[end] !== "，" && text[end] !== ",") break;
    }
    spans.push({ start, end, raw: text.slice(start, end) });
    trigger.lastIndex = end;
  }
  return spans;
}

type InlineSegment =
  | { kind: "text"; value: string }
  | { kind: "math"; value: string; display?: boolean };

function tokenizeInlineSegments(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  if (text.includes("$")) {
    let cursor = 0;
    const re = /\$\$[\s\S]*?\$\$|\$(?:\\.|[^$\\])+\$/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      if (match.index > cursor) {
        segments.push(...tokenizePlainMathSegments(text.slice(cursor, match.index)));
      }
      const token = match[0];
      if (token.startsWith("$$")) {
        segments.push({ kind: "math", value: token.slice(2, -2).trim(), display: true });
      } else {
        segments.push({ kind: "math", value: token.slice(1, -1).trim() });
      }
      cursor = match.index + token.length;
    }
    if (cursor < text.length) segments.push(...tokenizePlainMathSegments(text.slice(cursor)));
    return segments.length ? segments : [{ kind: "text", value: text }];
  }
  return tokenizePlainMathSegments(text);
}

function tokenizePlainMathSegments(text: string): InlineSegment[] {
  const spans = mergeMathSpans(
    findPlainMathSpans(text),
    findBigOSpans(text),
    findQuotedAcademicSpans(text),
    findAcademicFormulaSpans(text),
  );
  if (!spans.length) return [{ kind: "text", value: text }];
  const segments: InlineSegment[] = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start > cursor) segments.push({ kind: "text", value: text.slice(cursor, span.start) });
    segments.push({ kind: "math", value: span.raw });
    cursor = span.end;
  }
  if (cursor < text.length) segments.push({ kind: "text", value: text.slice(cursor) });
  return segments;
}

function applyInlineMarkdownToText(text: string): string {
  let html = convertDoubleAsteriskBoldToStrongHtml(text);
  html = convertSingleAsteriskItalicToEmHtml(html);
  html = convertBacktickCodeToHtml(html);
  return html;
}

function renderInlineSegments(segments: InlineSegment[]): string {
  return segments
    .map((segment) => {
      if (segment.kind === "text") {
        return applyInlineMarkdownToText(segment.value);
      }
      const parts =
        segment.value.startsWith("O(") ||
        !/=\s*(?:sin|cos|tan|log|ln|exp)\(/.test(segment.value)
          ? [segment.value]
          : segment.value.split(
              /(?<=[)])\s*[，,]\s*(?=[A-Za-z]+\([^)]*\)\s*=\s*(?:sin|cos|tan|log|ln|exp)\()/
            );
      return parts
        .map((part, index) => {
          const latex = segmentValueToLatex(part);
          const isLongFormula =
            looksLikeAcademicMath(part) &&
            (part.length > 48 || looksLikeNamedMathCall(part));
          const rendered = renderKatex(latex, !!segment.display || isLongFormula);
          const prefix = index > 0 ? "，" : "";
          return `${prefix}<span class="ppt-inline-math${segment.display || isLongFormula ? " ppt-inline-math--display" : ""}">${rendered}</span>`;
        })
        .join("");
    })
    .join("");
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
  const text = wrapInlineMathTokens(normalizeAsterisks(String(source)));
  if (text.trim() === "[object Object]") return "";
  return renderInlineSegments(tokenizeInlineSegments(text));
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

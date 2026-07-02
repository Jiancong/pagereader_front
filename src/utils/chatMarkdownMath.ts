import katex from "katex";

const SLOT_PREFIX = "CHAT_MATH_SLOT_";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function renderChatKatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex.trim(), {
      displayMode,
      throwOnError: false,
      strict: "ignore",
      trust: false,
    });
  } catch {
    return escapeHtml(latex);
  }
}

function looksLikeLatex(inner: string): boolean {
  const t = inner.trim();
  if (!t) return false;
  return (
    /\\(?:frac|theta|pi|text|sum|int|left|right|begin|mathbf|sqrt|alpha|beta|gamma|cdot|times|leq|geq|neq|approx|infty|partial|nabla|epsilon|mathbb|mathcal|mathrm|operatorname)/.test(
      t,
    ) ||
    (t.includes("_") && /[_^{}]/.test(t)) ||
    /\^[\{\w(]/.test(t)
  );
}

/** Block `[ ... ]` with LaTeX (common LLM output) — skip short numeric intervals. */
function looksLikeDisplayLatexBlock(inner: string): boolean {
  const t = inner.trim();
  if (!looksLikeLatex(t)) return false;
  if (t.includes("\\frac") || t.includes("\\pi") || t.includes("\\theta")) return true;
  if (/=\s*\\?frac/.test(t)) return true;
  if (t.includes("=") && t.includes("\\")) return true;
  if (t.includes("\n")) return true;
  // e.g. [1-\epsilon, 1+\epsilon]
  if (t.length < 64 && /^\d[^\\]*[,，][^\\]*$/.test(t.replace(/\\epsilon/g, "e"))) return false;
  return t.length > 24;
}

export type ChatMathSlotMap = Map<string, string>;

function stashMath(slots: ChatMathSlotMap, counter: { n: number }, html: string): string {
  const key = `%%${SLOT_PREFIX}${counter.n++}%%`;
  slots.set(key, html);
  return key;
}

/** Extract math delimiters before marked; replace with restorable placeholders. */
export function preprocessChatMarkdownMath(md: string): { markdown: string; slots: ChatMathSlotMap } {
  const slots: ChatMathSlotMap = new Map();
  const counter = { n: 0 };
  let s = md;

  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_m, latex: string) =>
    stashMath(slots, counter, renderChatKatex(latex, true)),
  );

  s = s.replace(/\\\[([\s\S]+?)\\\]/g, (_m, latex: string) =>
    stashMath(slots, counter, renderChatKatex(latex, true)),
  );

  s = s.replace(/\[\s*\n([\s\S]*?)\n\s*\]/g, (match, inner: string) => {
    if (!looksLikeDisplayLatexBlock(inner)) return match;
    return `\n\n${stashMath(slots, counter, renderChatKatex(inner, true))}\n\n`;
  });

  s = s.replace(/\$(?!\$)(?:\\.|[^$\\])+\$/g, (match) =>
    stashMath(slots, counter, renderChatKatex(match.slice(1, -1), false)),
  );

  s = s.replace(/\\\(([\s\S]+?)\\\)/g, (_m, latex: string) =>
    stashMath(slots, counter, renderChatKatex(latex, false)),
  );

  s = s.replace(/\[\s*([^\[\]\n]+(?:\\.[^\[\]\n]*)*)\s*\]/g, (match, inner: string) => {
    if (!looksLikeDisplayLatexBlock(inner)) return match;
    return stashMath(slots, counter, renderChatKatex(inner, true));
  });

  return { markdown: s, slots };
}

function wrapMathHtml(mathHtml: string): string {
  const display = mathHtml.includes("katex-display");
  if (display) {
    return `<div class="chat-md-math chat-md-math--display">${mathHtml}</div>`;
  }
  return `<span class="chat-md-math">${mathHtml}</span>`;
}

/** Restore KaTeX HTML after marked has run. */
export function applyChatMarkdownMathSlots(html: string, slots: ChatMathSlotMap): string {
  if (!slots.size) return html;
  let out = html;
  for (const [key, mathHtml] of slots) {
    const wrapped = wrapMathHtml(mathHtml);
    const keyRe = escapeRegExp(key);
    out = out.replace(new RegExp(`<p>\\s*${keyRe}\\s*</p>`, "gi"), wrapped);
    out = out.replaceAll(key, wrapped);
  }
  return out;
}

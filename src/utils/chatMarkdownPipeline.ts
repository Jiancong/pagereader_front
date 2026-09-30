import { marked } from "marked";
import {
  preprocessChatMarkdownMath,
  applyChatMarkdownMathSlots,
} from "@/utils/chatMarkdownMath";

/** 与 ChatPanel.renderMarkdown 一致：裸 URL → markdown 链接 */
export function linkifyPlainUrlsForChat(rawText: string): string {
  return rawText.replace(
    /(^|[\s\u3000])((https?:\/\/[^\s<>"']+))/g,
    (_match, prefix: string, url: string) => {
      let cleanUrl = url;
      let suffix = "";
      while (/[),.;!?。，、；：]$/.test(cleanUrl)) {
        suffix = cleanUrl.slice(-1) + suffix;
        cleanUrl = cleanUrl.slice(0, -1);
      }
      return `${prefix}[${cleanUrl}](${cleanUrl})${suffix}`;
    }
  );
}

/** 链接新标签打开 */
export function postprocessMarkdownAnchors(html: string): string {
  return html.replace(/<a\s+([^>]*?)>/gi, (_fullMatch: string, attrs: string) => {
    if (/target\s*=/.test(attrs)) {
      return `<a ${attrs}>`;
    }
    return `<a ${attrs} target="_blank" rel="noopener noreferrer">`;
  });
}

/** 单段 markdown（不含 mermaid 围栏）→ 与聊天一致的 HTML */
export function markdownFragmentToChatHtml(mdFragment: string): string {
  const { markdown: withMathSlots, slots } = preprocessChatMarkdownMath(mdFragment);
  const linked = linkifyPlainUrlsForChat(withMathSlots);
  const html =
    typeof (marked as { parse?: (s: string) => string }).parse === "function"
      ? (marked as { parse: (s: string) => string }).parse(linked)
      : String((marked as (s: string) => string)(linked));
  return applyChatMarkdownMathSlots(postprocessMarkdownAnchors(html), slots);
}

/** LLM 偶发 ``## ## 标题``，去掉重复 # 以便正确渲染为单个 heading */
export function normalizeChatMarkdownSource(md: string): string {
  let s = String(md ?? "");
  s = s.replace(/^(#{1,6})\s+(#{1,6})\s+/gm, "$1 ");
  return s;
}

export function normalizeChatMessageContent(content: unknown): string {
  if (content == null) return "";
  if (typeof content === "object") {
    try {
      return JSON.stringify(content, null, 2);
    } catch {
      return String(content);
    }
  }
  return normalizeChatMarkdownSource(String(content));
}

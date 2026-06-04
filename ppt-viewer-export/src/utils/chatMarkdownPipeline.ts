import { marked } from "marked";

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
  const linked = linkifyPlainUrlsForChat(mdFragment);
  const html =
    typeof (marked as { parse?: (s: string) => string }).parse === "function"
      ? (marked as { parse: (s: string) => string }).parse(linked)
      : String((marked as (s: string) => string)(linked));
  return postprocessMarkdownAnchors(html);
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
  return String(content);
}

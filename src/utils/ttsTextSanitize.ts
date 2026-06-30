/** Strip http/https URLs from audiobook narration text. */
export function stripUrlsForTts(text: string): string {
  if (!text) return ""

  return text
    .replace(/!\[[^\]]*\]\(\s*https?:\/\/[^)\s]+\s*\)/gi, "")
    .replace(/\[([^\]]*)\]\(\s*https?:\/\/[^)\s]+\s*\)/gi, "$1")
    .replace(/<\s*https?:\/\/[^>\s]+>/gi, "")
    .replace(/https?:\/\/[^\s)\]>"']+/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

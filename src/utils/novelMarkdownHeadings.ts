/** Demote ## headings to ### inside a section body (e.g. 摘要 / 分析 under a chapter). */
export function demoteH2ToH3InSectionBody(body: string): string {
  return body.replace(/^##(?!#)\s+/gm, "### ")
}

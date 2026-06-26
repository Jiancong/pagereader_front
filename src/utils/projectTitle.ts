export function pickString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function pickPptDataTitle(pptData: unknown): string {
  if (!pptData || typeof pptData !== "object") return "";
  const record = pptData as Record<string, unknown>;
  return pickString(record.title);
}

export function pickGeneratedDeckTitleFromContent(content: unknown): string {
  const text = pickString(content);
  if (!text) return "";

  try {
    const parsed = JSON.parse(text);
    const title =
      pickString(parsed?.title) ||
      pickString(parsed?.pptData?.title) ||
      pickString(parsed?.ppt_data?.title);
    if (title) return title;
  } catch {
    /* history content is often plain progress text rather than JSON */
  }

  const generatedTitle =
    text.match(/Generated presentation\s+[«"“](.+?)[»"”]/i)?.[1] ||
    text.match(/(?:生成|Generated).*?(?:presentation|演示文稿|PPT)?\s*[«《"“](.+?)[»》"”]/i)?.[1];
  if (generatedTitle) return generatedTitle.trim();

  const slideOneTitle = text.match(/(?:^|\n)\s*(?:🎯\s*)?Slide\s*1\s*:\s*(.+?)(?:\n|$)/i)?.[1];
  return slideOneTitle ? slideOneTitle.trim() : "";
}

export function pickProjectFallbackTitle(project: unknown): string {
  if (!project || typeof project !== "object") return "";
  const record = project as Record<string, unknown>;
  return pickString(record.name) || pickString(record.title);
}

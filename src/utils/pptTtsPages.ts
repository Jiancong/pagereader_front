import type { PptData, PptSlide } from "@/components/editor/chat/ppt/types";
import { displayText } from "@/components/editor/chat/ppt/shared/contentHelpers";
import { resolveSlideSpeakerNotes } from "@/components/editor/chat/ppt/shared/normalizePptSlide";
import type { TtsPageInput } from "@/api/agent";

function buildSlideTtsText(slide: PptSlide): string {
  const notes = resolveSlideSpeakerNotes(slide);
  if (notes) return notes;

  const parts: string[] = [];
  if (slide.title?.trim()) parts.push(slide.title.trim());
  if (slide.subtitle?.trim()) parts.push(slide.subtitle.trim());
  if (slide.subtitle_en?.trim()) parts.push(slide.subtitle_en.trim());

  for (const item of slide.content ?? []) {
    const text = displayText(item).trim();
    if (text) parts.push(text);
  }

  return parts.join("\n");
}

export function buildTtsPagesFromPptData(pptData: PptData): TtsPageInput[] {
  return pptData.slides.map((slide, index) => {
    const text = buildSlideTtsText(slide);
    const content = (slide.content ?? [])
      .map((item) => displayText(item).trim())
      .filter(Boolean);

    return {
      index: index + 1,
      title: slide.title,
      text: text || slide.title || "",
      ...(content.length ? { content } : {}),
    };
  });
}

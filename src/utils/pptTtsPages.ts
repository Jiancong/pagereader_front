import type { PptData, PptSlide } from "@/components/editor/chat/ppt/types";
import {
  contentPointBodyForDisplay,
  contentPointTitle,
  displayText,
  isPredominantlyLatin,
  modernLiteraryCleanText,
} from "@/components/editor/chat/ppt/shared/contentHelpers";
import { resolveSlideSpeakerNotes } from "@/components/editor/chat/ppt/shared/normalizePptSlide";
import { getTocEntries } from "@/components/editor/chat/ppt/shared/slideLayoutHelpers";
import {
  modernLiteraryCompareTitleDuplicatesSlide,
  modernLiteraryRightItems,
  modernLiteraryTwoColumnFooter,
} from "@/components/editor/chat/ppt/themes/modernLiterary/modernLiteraryHelpers";
import { TTS_VOICE_EN, TTS_VOICE_ZH, type TtsPageInput } from "@/api/agent";

function cleanTtsText(value: string | undefined): string {
  return (value ?? "").trim();
}

function pushUniqueText(parts: string[], value: string | undefined): void {
  const text = cleanTtsText(value);
  if (text && !parts.includes(text)) parts.push(text);
}

function resolvePageTitleAndSubtitle(
  pptData: PptData,
  slide: PptSlide,
  index: number
): { title: string; subtitle: string } {
  const isCover = slide.layout === "cover" || index === 0;

  if (isCover) {
    return {
      title: cleanTtsText(slide.title) || cleanTtsText(pptData.title),
      subtitle:
        cleanTtsText(slide.subtitle) ||
        cleanTtsText(pptData.subtitle) ||
        cleanTtsText(slide.subtitle_en),
    };
  }

  return {
    title: cleanTtsText(slide.title),
    subtitle: cleanTtsText(slide.subtitle) || cleanTtsText(slide.subtitle_en),
  };
}

function buildTocCardTexts(slide: PptSlide): string[] {
  if (slide.layout !== "toc") return [];

  return getTocEntries(slide)
    .map((entry) => {
      const heading = [entry.number, entry.title]
        .map((value) => cleanTtsText(value))
        .filter(Boolean)
        .join(" ");
      const description = cleanTtsText(entry.description);
      return [heading, description].filter(Boolean).join(": ");
    })
    .filter(Boolean);
}

function buildModernQuadCardTexts(slide: PptSlide): string[] {
  if (slide.layout !== "content") return [];

  const cardTexts = (slide.content ?? [])
    .filter((item) => !!modernLiteraryCleanText(item))
    .slice(0, 4)
    .map((item, index) => {
      const number = String(index + 1).padStart(2, "0");
      const title = cleanTtsText(contentPointTitle(item));
      const body = cleanTtsText(contentPointBodyForDisplay(item));
      const heading = [number, title].filter(Boolean).join(" ");
      return [heading, body].filter(Boolean).join(": ");
    })
    .filter(Boolean);

  if (cardTexts.length < 4) return [];

  pushUniqueText(cardTexts, slide.key_insight);
  return cardTexts;
}

function buildTwoColumnCompareTexts(slide: PptSlide): string[] {
  if (slide.layout !== "two_column") return [];

  const texts: string[] = [];
  const leftTitle = cleanTtsText(slide.left_title);
  const rightTitle = cleanTtsText(slide.right_title);

  if (
    leftTitle &&
    !modernLiteraryCompareTitleDuplicatesSlide(slide.left_title, slide.title)
  ) {
    pushUniqueText(texts, leftTitle);
  }

  for (const item of slide.left_content ?? []) {
    pushUniqueText(texts, displayText(item));
  }

  pushUniqueText(texts, rightTitle);

  for (const item of modernLiteraryRightItems(slide)) {
    pushUniqueText(texts, item);
  }

  pushUniqueText(texts, modernLiteraryTwoColumnFooter(slide));
  return texts;
}

function buildStructuredTexts(slide: PptSlide): string[] {
  return [
    ...buildTocCardTexts(slide),
    ...buildModernQuadCardTexts(slide),
    ...buildTwoColumnCompareTexts(slide),
  ];
}

function resolveTtsVoiceForTitle(title: string): string {
  return isPredominantlyLatin(title) ? TTS_VOICE_EN : TTS_VOICE_ZH;
}

function buildSlideTtsText(
  slide: PptSlide,
  title: string,
  subtitle: string,
  structuredTexts: string[],
  includeStructuredTextBeforeNotes: boolean
): string {
  const notes = resolveSlideSpeakerNotes(slide);
  if (notes && !includeStructuredTextBeforeNotes) return notes;

  const parts: string[] = [];
  pushUniqueText(parts, title);
  pushUniqueText(parts, subtitle);
  structuredTexts.forEach((item) => pushUniqueText(parts, item));
  if (notes) return [...parts, notes].join("\n");
  pushUniqueText(parts, slide.subtitle_en);

  if (!structuredTexts.length) {
    for (const item of slide.content ?? []) {
      const text = displayText(item).trim();
      if (text) parts.push(text);
    }
  }

  return parts.join("\n");
}

export function buildTtsPagesFromPptData(pptData: PptData): TtsPageInput[] {
  return pptData.slides.map((slide, index) => {
    const { title, subtitle } = resolvePageTitleAndSubtitle(pptData, slide, index);
    const isCover = slide.layout === "cover" || index === 0;
    const structuredTexts = buildStructuredTexts(slide);
    const content = (structuredTexts.length ? structuredTexts : slide.content ?? [])
      .map((item) => displayText(item).trim())
      .filter(Boolean);
    const text = buildSlideTtsText(
      slide,
      title,
      subtitle,
      structuredTexts,
      isCover || structuredTexts.length > 0
    );

    return {
      index: index + 1,
      title,
      ...(subtitle ? { subtitle } : {}),
      text: text || title || "",
      voice: resolveTtsVoiceForTitle(title),
      ...(content.length ? { content } : {}),
    };
  });
}

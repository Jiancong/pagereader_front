import type { PptSlide } from "../types";
import { cardTypographyBindings } from "./cardTypography";
import {
  contentPointBodyForDisplay,
  contentPointTitle,
  displayText,
  modernLiteraryCleanText,
  resolveSlideBulletItems,
  rightItemDescription,
  rightItemTitle,
} from "./contentHelpers";
import { isMetricCardsChartSplitSlide } from "./slideLayoutHelpers";

function cleanTexts(texts: string[]): string[] {
  return texts.map((text) => modernLiteraryCleanText(text)).filter(Boolean);
}

export function textsFromRightItems(
  items: Array<{ title?: unknown; description?: unknown }> | undefined,
): string[] {
  return cleanTexts(
    (items ?? []).map((item) => {
      const title = rightItemTitle(item);
      const desc = rightItemDescription(item);
      return title && desc ? `${title} ${desc}` : title || desc;
    }),
  );
}

export function textsFromMetricCards(
  cards: Array<{ value?: string; label?: string; detail?: string }> | undefined,
): string[] {
  return cleanTexts(
    (cards ?? []).map((card) => [card.value, card.label, card.detail].filter(Boolean).join(" ")),
  );
}

export function textsFromContentItems(items: unknown[]): string[] {
  return cleanTexts(
    items.map((item) => {
      const title = contentPointTitle(item);
      const body = contentPointBodyForDisplay(item);
      return title && body ? `${title} ${body}` : title || body || displayText(item);
    }),
  );
}

export function classicHeroRightColumnTypography(
  slide: PptSlide,
  fallbackRightItems?: PptSlide["right_items"],
) {
  let texts: string[] = [];
  if (slide.right_items?.length) {
    texts = textsFromRightItems(slide.right_items);
  } else {
    texts = [...textsFromMetricCards(slide.metric_cards), ...textsFromRightItems(fallbackRightItems)];
  }
  return cardTypographyBindings(texts);
}

export function classicTopicGridTypography(slide: PptSlide) {
  return cardTypographyBindings(
    cleanTexts(resolveSlideBulletItems(slide).map((item) => displayText(item))),
  );
}

export function classicContentPointsTypography(items: unknown[]) {
  return cardTypographyBindings(textsFromContentItems(items));
}

export function classicBulletListTypography(slide: PptSlide) {
  return cardTypographyBindings(
    cleanTexts(resolveSlideBulletItems(slide).map((item) => displayText(item))),
  );
}

export function classicDataContentLeftTypography(slide: PptSlide) {
  if (isMetricCardsChartSplitSlide(slide)) {
    return cardTypographyBindings(textsFromMetricCards(slide.metric_cards));
  }
  return classicContentPointsTypography(resolveSlideBulletItems(slide));
}

import type { PptSlide } from "../../types";
import { cardTypographyBindings } from "../../shared/cardTypography";
import { textsFromContentItems } from "../../shared/classicTypographyHelpers";
import {
  contentPointBodyForDisplay,
  contentPointTitle,
  displayText,
  modernLiteraryCleanText,
  resolveSlideBulletItems,
} from "../../shared/contentHelpers";
import type { EditorialBrutalistCard } from "./editorialBrutalistHelpers";
import {
  editorialBrutalistQuoteItems,
  editorialBrutalistSplitLeft,
} from "./editorialBrutalistHelpers";

function cleanText(text: string): string {
  return modernLiteraryCleanText(text);
}

function textsFromBrutalistCard(card: EditorialBrutalistCard): string[] {
  const title = cleanText(card.title);
  const body = cleanText(card.body);
  if (title && body) return [title, body];
  return [title || body].filter(Boolean);
}

function textsFromBrutalistCards(cards: EditorialBrutalistCard[]): string[] {
  return cards.flatMap((card) => textsFromBrutalistCard(card));
}

function textsFromUnknownItems(items: unknown[]): string[] {
  return textsFromContentItems(items);
}

function textsFromStringItems(items: string[]): string[] {
  return items
    .map((item) => {
      const title = contentPointTitle(item);
      const body = contentPointBodyForDisplay(item);
      const text = title && body ? `${title} ${body}` : title || body || displayText(item);
      return cleanText(text);
    })
    .filter(Boolean);
}

/** Grid-level typography from all cards (gap + shared debug attrs). */
export function editorialBrutalistCardGridTypography(cards: EditorialBrutalistCard[]) {
  return cardTypographyBindings(textsFromBrutalistCards(cards));
}

/** Per-card typography: title + body measured separately for fairer scaling. */
export function editorialBrutalistCardTypography(card: EditorialBrutalistCard) {
  return cardTypographyBindings(textsFromBrutalistCard(card));
}

export function editorialBrutalistPointListTypography(items: unknown[]) {
  return cardTypographyBindings(textsFromUnknownItems(items));
}

export function editorialBrutalistSlideBulletTypography(slide: PptSlide) {
  return editorialBrutalistPointListTypography(resolveSlideBulletItems(slide));
}

export function editorialBrutalistSplitLeftTypography(slide: PptSlide) {
  return cardTypographyBindings(textsFromStringItems(editorialBrutalistSplitLeft(slide)));
}

export function editorialBrutalistQuoteListTypography(slide: PptSlide) {
  return editorialBrutalistPointListTypography(editorialBrutalistQuoteItems(slide));
}

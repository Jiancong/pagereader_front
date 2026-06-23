import type { ComputedRef, InjectionKey, Ref } from "vue";
import type { Composer } from "vue-i18n";
import type { PptData, PptSlide } from "./types";

export interface PptSlideEditorContext {
  isEditing: Ref<boolean>;
  currentSlideIndex: Ref<number>;
  pptSource: Ref<PptData>;
  brandFooter: ComputedRef<string | undefined>;
  modernLiteraryCoverTagline: ComputedRef<string>;
  sectionChapterNum: Ref<number>;
  t: Composer["t"];
  onCellBlur: (event: Event, path: string) => void;
  onContentItemBlur: (event: Event, slideIdx: number, itemIdx: number) => void;
  onPptTableRefClick: (refId: string, slide: PptSlide) => void;
}

export const pptSlideEditorKey: InjectionKey<PptSlideEditorContext> = Symbol("pptSlideEditor");

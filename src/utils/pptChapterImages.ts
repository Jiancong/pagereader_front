/** 联网搜索配图（章节内容图，非 AI 背景） */
export interface PptSearchImage {
  url: string;
  thumbnail?: string;
  title?: string;
  source?: string;
  query?: string;
}

/** PDF/RAG 原文插图（右栏 figure，非全页背景） */
export interface DocumentFigure {
  url: string;
  page?: number;
  page_label?: string;
  document_name?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export type SlideVisualKind = "document_figure" | "chapter_images" | "slide_background" | "none";

export interface SlideVisualDocumentFigure {
  kind: "document_figure";
  figure: DocumentFigure;
}

export interface SlideVisualChapterImages {
  kind: "chapter_images";
  url?: string;
  images?: PptSearchImage[];
}

export interface SlideVisualSlideBackground {
  kind: "slide_background";
  url: string;
}

export interface SlideVisualNone {
  kind: "none";
}

export type SlideVisual =
  | SlideVisualDocumentFigure
  | SlideVisualChapterImages
  | SlideVisualSlideBackground
  | SlideVisualNone;

/** ppt_data.chapter_images 结构化块（历史/流式合并用，展示不再依赖全局索引） */
export interface PptChapterImages {
  chapter_number: string;
  chapter_index: number;
  section_slide_index: number;
  chapter_title: string;
  images: PptSearchImage[];
}

export type ChapterImageIndex = Map<string, PptSearchImage[]>;

export interface SlideChapterLookup {
  layout?: string;
  index?: number;
  chapter_number?: string;
  chapter_images?: PptSearchImage[];
  /** 章节配图页 images[]（与 image_url 配合） */
  images?: PptSearchImage[] | string[];
  subtitle?: string;
  subtitle_en?: string;
  image_url?: string;
  image_urls?: string[];
  chapter_image_page?: boolean;
  document_figure?: DocumentFigure | null;
  /** @deprecated 过渡期：归一化到 document_figure */
  source_document_image?: boolean | Record<string, unknown>;
  /** @deprecated 过渡期：图注见 document_figure.caption */
  image_caption?: string;
  column_split?: number | string;
  right_items?: unknown[];
  left_content?: unknown[];
  right_content?: unknown[];
}

interface PptChapterImageSource {
  chapter_images?: PptChapterImages[];
  slides?: SlideChapterLookup[];
}

export function resolvePptSearchImageSrc(img: PptSearchImage): string {
  return (img.thumbnail || img.url || "").trim();
}

/** 过渡期：source_document_image + image_url → document_figure */
export function normalizeDocumentFigure(
  slide: SlideChapterLookup | null | undefined
): DocumentFigure | null {
  if (!slide) return null;

  const raw = slide as Record<string, unknown>;
  const direct = raw.document_figure as DocumentFigure | undefined;
  if (direct?.url) {
    const url = String(direct.url).trim();
    return url ? { ...direct, url } : null;
  }

  const legacy = raw.source_document_image;
  if (legacy && typeof legacy === "object") {
    const leg = legacy as Record<string, unknown>;
    const url = String(leg.url ?? slide.image_url ?? "").trim();
    if (url) {
      return {
        url,
        page: typeof leg.page === "number" ? leg.page : undefined,
        page_label: String(leg.page_label ?? "").trim() || undefined,
        document_name: String(leg.document_name ?? "").trim() || undefined,
        caption:
          String(leg.caption ?? slide.image_caption ?? "").trim() || undefined,
      };
    }
  }

  if (
    legacy != null &&
    legacy !== false &&
    slide.layout === "two_column"
  ) {
    const url = String(slide.image_url ?? "").trim();
    if (url) {
      return {
        url,
        caption: String(slide.image_caption ?? "").trim() || undefined,
      };
    }
  }

  return null;
}

export function hasDocumentFigurePage(
  slide: SlideChapterLookup | null | undefined
): boolean {
  return normalizeDocumentFigure(slide) != null;
}

/** two_column 双栏宽度比，如 "55-45" → [55, 45] */
export function parseColumnSplit(split: unknown): [number, number] {
  if (typeof split === "string" && split.includes("-")) {
    const [a, b] = split.split("-").map((n) => Number(n.trim()));
    if (a > 0 && b > 0) return [a, b];
  }
  return [50, 50];
}

/** 旧式 content 数组切分索引（数字 column_split）；字符串比例返回 null */
export function resolveContentSplitIndex(
  split: unknown,
  contentLength: number
): number | null {
  if (typeof split !== "number" || split <= 0 || contentLength <= 0) return null;
  return Math.max(1, Math.min(split, contentLength));
}

/** 幻灯片视觉类型：document_figure 右栏图 / chapter_images / cover·section 背景 / 无图 */
export function resolveSlideVisual(
  slide: SlideChapterLookup | null | undefined
): SlideVisual {
  if (!slide) return { kind: "none" };

  const figure = normalizeDocumentFigure(slide);
  if (figure?.url) {
    return { kind: "document_figure", figure };
  }

  if (isChapterImagePage(slide)) {
    const images = resolveSlideChapterImages(slide);
    const url = String(slide.image_url ?? "").trim();
    return {
      kind: "chapter_images",
      url: url || undefined,
      images: images.length ? images : undefined,
    };
  }

  const bgUrl = String(slide.image_url ?? "").trim();
  if (bgUrl && (slide.layout === "cover" || slide.layout === "section")) {
    return { kind: "slide_background", url: bgUrl };
  }

  return { kind: "none" };
}

/** 章节页全屏背景：优先 AI 背景图，否则取本章首张联网配图 */
export function resolveChapterSlideBackdropUrl(
  slide: SlideChapterLookup | null | undefined
): string {
  if (!slide || hasDocumentFigurePage(slide)) return "";
  const ai = String(slide.image_url ?? "").trim();
  if (ai) return ai;
  const imgs = resolveSlideChapterImages(slide);
  const first = imgs[0];
  return first ? resolvePptSearchImageSrc(first) : "";
}

/** section 页英文/中文副标题 */
export function resolveSectionSubtitle(slide: SlideChapterLookup | null | undefined): string {
  if (!slide) return "";
  return (slide.subtitle_en ?? slide.subtitle ?? "").trim();
}

/** 后端独立章节配图页（two_column + chapter_image_page） */
export function isChapterImagePage(slide: SlideChapterLookup | null | undefined): boolean {
  if (!slide) return false;
  if (hasDocumentFigurePage(slide)) return false;
  const raw = slide as Record<string, unknown>;
  if (raw.chapter_image_page === true) return true;
  if (slide.layout !== "two_column") return false;
  const imgs = resolveSlideChapterImages(slide);
  return imgs.length > 0 && (slide.right_items?.length ?? 0) > 0;
}

/** 从当前页字段解析配图列表（chapter_images > images > image_urls > image_url） */
export function resolveSlideChapterImages(
  slide: SlideChapterLookup | null | undefined
): PptSearchImage[] {
  if (!slide) return [];
  if (hasDocumentFigurePage(slide)) return [];

  const structured = (slide.chapter_images ?? [])
    .map((img) => {
      const url = resolvePptSearchImageSrc(img);
      if (!url) return null;
      return { ...img, url };
    })
    .filter(Boolean) as PptSearchImage[];
  if (structured.length) return structured;

  const raw = slide as Record<string, unknown>;
  const imagesField = raw.images;
  if (Array.isArray(imagesField) && imagesField.length) {
    const parsed = imagesField
      .map((item) => {
        if (typeof item === "string") {
          const url = item.trim();
          return url ? ({ url } as PptSearchImage) : null;
        }
        if (item && typeof item === "object") {
          const img = item as PptSearchImage;
          const url = resolvePptSearchImageSrc(img);
          return url ? { ...img, url } : null;
        }
        return null;
      })
      .filter(Boolean) as PptSearchImage[];
    if (parsed.length) return parsed;
  }

  const urls = raw.image_urls;
  if (Array.isArray(urls) && urls.length) {
    return urls
      .map((u) => String(u ?? "").trim())
      .filter(Boolean)
      .map((url) => ({ url }));
  }

  const single = String(raw.image_url ?? slide.image_url ?? "").trim();
  if (single) return [{ url: single, thumbnail: single }];

  return [];
}

/** @deprecated 保留供兼容/调试 */
export function buildChapterImageIndex(pptData: PptChapterImageSource): ChapterImageIndex {
  const map: ChapterImageIndex = new Map();

  for (const block of pptData.chapter_images ?? []) {
    if (!block.images?.length) continue;
    if (block.chapter_number) map.set(block.chapter_number, block.images);
    map.set(String(block.section_slide_index), block.images);
    if (block.chapter_index != null) map.set(String(block.chapter_index), block.images);
  }

  for (let i = 0; i < (pptData.slides?.length ?? 0); i++) {
    const slide = pptData.slides![i];
    if (slide.layout !== "section" || !slide.chapter_images?.length) continue;
    const key = slide.chapter_number ?? String(slide.index ?? i);
    if (!map.has(key)) map.set(key, slide.chapter_images);
    const idxKey = String(slide.index ?? i);
    if (!map.has(idxKey)) map.set(idxKey, slide.chapter_images);
  }

  return map;
}

/** @deprecated 内容页不再挂靠章节配图 */
export function findChapterForSlide(
  slides: SlideChapterLookup[],
  slideIndex: number
): { chapterNumber: string; sectionIndex: number } | null {
  for (let i = slideIndex - 1; i >= 0; i--) {
    const s = slides[i];
    if (s.layout === "section") {
      return {
        chapterNumber: s.chapter_number ?? String(s.index ?? i),
        sectionIndex: s.index ?? i,
      };
    }
  }
  return null;
}

/** 当前页可展示的章节配图（独立配图页全量；content/data 可选 sidebar，最多 3 张） */
export function getChapterImagesForSlide(
  slides: SlideChapterLookup[],
  slideIndex: number,
  index?: ChapterImageIndex
): PptSearchImage[] {
  const slide = slides[slideIndex];
  if (!slide) return [];

  if (isChapterImagePage(slide)) {
    return resolveSlideChapterImages(slide);
  }

  const onSlide = resolveSlideChapterImages(slide);
  if (onSlide.length) return onSlide.slice(0, 3);

  if (
    index &&
    (slide.layout === "content" || slide.layout === "data")
  ) {
    const chapter = findChapterForSlide(slides, slideIndex);
    if (chapter) {
      const imgs =
        index.get(chapter.chapterNumber) ?? index.get(String(chapter.sectionIndex));
      if (imgs?.length) return imgs.slice(0, 3);
    }
  }

  return [];
}

/**
 * content / data 页侧边栏章节配图（不与 slide.image_url AI 背景混用）。
 */
export function shouldShowChapterSideImage(
  slide: SlideChapterLookup | null | undefined,
  opts?: {
    hasChart?: boolean;
    isRightItems?: boolean;
  }
): boolean {
  if (!slide || isChapterImagePage(slide)) return false;
  if (slide.layout !== "content" && slide.layout !== "data") return false;
  if (String(slide.image_url ?? "").trim()) return false;
  if (opts?.isRightItems) return false;
  if (opts?.hasChart && slide.layout === "data") return false;
  return true;
}

/** 合并 ppt_complete 顶层 chapter_images / image_results 到 ppt_data */
export function enrichPptDataChapterImages(
  pptData: Record<string, unknown> | null | undefined,
  payload?: Record<string, unknown> | null
): Record<string, unknown> | null | undefined {
  if (!pptData) return pptData;
  const out = { ...pptData };

  const rootChapterImages =
    (payload?.chapter_images as PptChapterImages[] | undefined) ??
    ((payload?.ppt_data as Record<string, unknown> | undefined)?.chapter_images as
      | PptChapterImages[]
      | undefined);

  if (!Array.isArray(out.chapter_images) || !(out.chapter_images as unknown[]).length) {
    if (Array.isArray(rootChapterImages) && rootChapterImages.length) {
      out.chapter_images = rootChapterImages;
    }
  }

  return out;
}

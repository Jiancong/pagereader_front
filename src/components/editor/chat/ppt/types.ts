import type { PptTable } from "@/components/editor/chat/PptTableBlock.vue";
import type { PptPageReference } from "@/utils/pptInlineMarkdown";
import type {
  DocumentFigure,
  PptChapterImages as PptChapterImagesBlock,
  PptSearchImage,
} from "@/utils/pptChapterImages";
import type { PptThemeTokens } from "@/utils/pptThemeTokens";

export type { DocumentFigure, PptChapterImagesBlock, PptPageReference, PptSearchImage, PptTable };

export interface ChartDataItem {
  label?: string;
  stage?: string;
  value: number;
  secondary_value?: number;
  tertiary_value?: number;
  values?: number[];
  description?: string;
  desc?: string;
  text?: string;
  title?: string;
  name?: string;
  is_total?: boolean;
  x?: number;
  y?: number;
  children?: ChartDataItem[];
}

export interface HeatmapMatrixItem {
  row: string;
  col: string;
  value: number;
}

export interface HeatmapData {
  rows: string[];
  cols: string[];
  values: number[][];
}

export interface SecondaryDataItem {
  label: string;
  value: number;
}

export interface PptChart {
  type:
    | "bar"
    | "line"
    | "pie"
    | "radar"
    | "combo"
    | "stacked_bar"
    | "horizontal_bar"
    | "area"
    | "funnel"
    | "waterfall"
    | "scatter"
    | "heatmap"
    | "treemap"
    | "gauge"
    | "timeline";
  title?: string;
  note?: string;
  source?: string;
  source_refs?: number[];
  x_label?: string;
  y_label?: string;
  xLabel?: string;
  yLabel?: string;
  secondary_y_label?: string;
  data: ChartDataItem[];
  labels?: string[];
  categories?: string[];
  primary_data?: number[];
  series_names?: string[];
  primary_data_label?: string;
  secondary_data_label?: string;
  secondary_label?: string;
  primary_label?: string;
  tertiary_data_label?: string;
  secondary_data?: SecondaryDataItem[];
  matrix_data?: HeatmapMatrixItem[];
  rows?: string[];
  cols?: string[];
  min_value?: number;
  max_value?: number;
  target_value?: number;
  unit?: string;
  stacked_segment_as_percent?: boolean;
  colors?: string[];
}

export interface PptSlide {
  index: number;
  layout:
    | "cover"
    | "section"
    | "content"
    | "two_column"
    | "data"
    | "quote"
    | "end"
    | "toc"
    | "references"
    | string;
  title: string;
  subtitle?: string;
  content?: string[];
  sources?: Array<{ title?: string; url?: string } | string>;
  left_title?: string;
  left_content?: string[];
  right_title?: string;
  right_content?: string[];
  emphasis_layout?: string;
  data_source_line?: string;
  right_items?: Array<{
    index?: string;
    icon?: string;
    title?: string;
    description?: string;
    accent_color?: string;
    highlight?: boolean;
    emphasis?: boolean;
  }>;
  chapter_number?: string;
  subtitle_en?: string;
  chart?: PptChart;
  table?: PptTable;
  page_references?: PptPageReference[];
  quote?: string;
  quote_author?: string;
  author?: string;
  organization?: string;
  date?: string;
  speaker_notes?: string;
  brand_footer?: string;
  image_prompt?: string;
  image_url?: string;
  document_figure?: DocumentFigure | null;
  images?: PptSearchImage[];
  source_document_image?: boolean | Record<string, unknown>;
  image_caption?: string;
  chapter_images?: PptSearchImage[];
  column_split?: number | string;
  key_insight?: string;
  metric_cards?: Array<{
    value?: string;
    label?: string;
    detail?: string;
    source?: string;
    source_ref?: number | number[];
    accent_color?: string;
  }>;
  toc_items?: Array<{
    number?: string;
    icon?: string;
    title?: string;
    description?: string;
  }>;
  hero_metric?: {
    value?: string;
    caption?: string;
    accent_color?: string;
  };
}

export interface PptTocEntry {
  number: string;
  title: string;
  description: string;
  icon?: string;
  raw?: string;
}

export interface PptPalette {
  bg_color?: string;
  bg_color_secondary?: string;
  accent_color?: string;
  accent_colors?: string[];
  text_color?: string;
  text_secondary?: string;
  css_variables?: Record<string, string>;
  mood?: string;
  label?: string;
  theme_tokens?: PptThemeTokens;
}

export interface PptHtmlTemplateRecommendation {
  template_id?: string;
  template_path?: string;
  pick_source?: string;
  accent_colors?: string[];
  css_variables?: Record<string, string>;
  palette_from_html_template?: Partial<PptPalette>;
  theme_tokens?: PptThemeTokens;
}

export interface PptData {
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
  brand_footer?: string;
  theme?: string;
  palette?: PptPalette;
  html_template_recommendation?: PptHtmlTemplateRecommendation;
  chapter_images?: PptChapterImagesBlock[];
  total_slides: number;
  slides: PptSlide[];
}

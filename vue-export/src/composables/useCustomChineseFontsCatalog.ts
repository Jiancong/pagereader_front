import { $fetch } from "ofetch";
import { joinURL } from "ufo";

export type CustomChineseFontSourceType = "css" | "file";

export type CustomChineseFontFile = {
  url: string;
  format: "woff2" | "woff" | "truetype" | "opentype";
  weight?: string | number;
  style?: "normal" | "italic";
  unicodeRange?: string;
};

export type CustomChineseFontCatalogEntry = {
  label: string;
  value: string;
  category?: string;
  preview?: string;
  sourceType: CustomChineseFontSourceType;
  cssUrl?: string;
  cssText?: string;
  files?: CustomChineseFontFile[];
  license?: string;
  licenseUrl?: string;
};

export type CustomChineseFontsCatalogPayload = {
  source?: string;
  updated?: string;
  count?: number;
  fonts: CustomChineseFontCatalogEntry[];
};

export async function fetchCustomChineseFontsCatalog(
  appBaseURL = "/"
): Promise<CustomChineseFontCatalogEntry[]> {
  const url = joinURL(appBaseURL, "fonts/custom-chinese-fonts.json");
  const data = await $fetch<CustomChineseFontsCatalogPayload>(url);
  if (!Array.isArray(data?.fonts) || !data.fonts.length) {
    return [];
  }
  return data.fonts.map((font) => ({
    ...font,
    category: font.category || "chinese",
  }));
}

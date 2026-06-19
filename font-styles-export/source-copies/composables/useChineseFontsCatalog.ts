import { $fetch } from "ofetch";
import { joinURL } from "ufo";

export type ChineseFontCatalogEntry = { label: string; value: string };

export type ChineseFontsCatalogPayload = {
  source?: string;
  updated?: string;
  count?: number;
  fonts: ChineseFontCatalogEntry[];
};

/**
 * 加载 `public/fonts/chinese-fonts-catalog.json`。
 * @param appBaseURL Nuxt `runtimeConfig.app.baseURL`，子路径部署时必须参与拼接
 */
export async function fetchChineseFontsCatalog(
  appBaseURL = "/"
): Promise<ChineseFontCatalogEntry[]> {
  const url = joinURL(appBaseURL, "fonts/chinese-fonts-catalog.json");
  const data = await $fetch<ChineseFontsCatalogPayload>(url);
  if (!Array.isArray(data?.fonts) || !data.fonts.length) {
    return [];
  }
  return data.fonts;
}

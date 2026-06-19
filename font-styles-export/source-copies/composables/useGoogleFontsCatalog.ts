import { $fetch } from "ofetch";
import { joinURL } from "ufo";

export type GoogleFontCatalogEntry = { label: string; value: string };

export type GoogleFontsCatalogPayload = {
  source?: string;
  updated?: string;
  count?: number;
  fonts: GoogleFontCatalogEntry[];
};

function parsePayload(data: unknown): GoogleFontCatalogEntry[] {
  const d = data as GoogleFontsCatalogPayload | null;
  if (d && Array.isArray(d.fonts) && d.fonts.length > 0) {
    return d.fonts;
  }
  return [];
}

/**
 * 加载 `public/fonts/google-fonts-catalog.json`（由 `npm run fonts:sync` 生成）。
 * 依次尝试多个 URL 候选（baseURL 拼接、绝对根路径、window.location 拼接），
 * 解决子路径部署、dev 模式、SSR hydration 等环境下路径不一致的问题。
 */
export async function fetchGoogleFontsCatalog(
  appBaseURL = "/"
): Promise<GoogleFontCatalogEntry[]> {
  const candidates: string[] = [];
  const joined = joinURL(appBaseURL, "fonts/google-fonts-catalog.json");
  candidates.push(joined);
  if (joined !== "/fonts/google-fonts-catalog.json") {
    candidates.push("/fonts/google-fonts-catalog.json");
  }
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    candidates.push(`${origin}${joined}`);
    if (joined !== "/fonts/google-fonts-catalog.json") {
      candidates.push(`${origin}/fonts/google-fonts-catalog.json`);
    }
  }

  for (const url of candidates) {
    try {
      const data = await $fetch<GoogleFontsCatalogPayload>(url);
      const fonts = parsePayload(data);
      if (fonts.length > 0) {
        console.info(`[FontCatalog] Loaded ${fonts.length} fonts from ${url}`);
        return fonts;
      }
    } catch {
      // try next candidate
    }
  }

  // Last resort: native fetch (bypasses ofetch interceptors)
  if (typeof window !== "undefined") {
    for (const url of candidates) {
      try {
        const res = await window.fetch(url);
        if (res.ok) {
          const data = await res.json();
          const fonts = parsePayload(data);
          if (fonts.length > 0) {
            console.info(`[FontCatalog] Loaded ${fonts.length} fonts via native fetch from ${url}`);
            return fonts;
          }
        }
      } catch {
        // try next
      }
    }
  }

  console.warn("[FontCatalog] All candidates failed, returning empty");
  return [];
}

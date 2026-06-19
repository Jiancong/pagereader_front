import { $fetch } from "ofetch";
import { joinURL } from "ufo";
import type {
  CustomChineseFontCatalogEntry,
  CustomChineseFontFile,
} from "@/composables/useCustomChineseFontsCatalog";

/**
 * 英文免费字体 OSS（与中文 commercial-free-zh 同一套前端逻辑：manifest + file @font-face）。
 *
 * **线上 manifest（默认优先）**：{@link FONT_DOWNLOAD_FREE_ENG_MANIFEST_URL}
 * （`baseUrl` 在 JSON 内指向 `.../font-download-free/`，`path` 为 `extracted/.../*.otf` 等）
 *
 * 浏览器无法对 `format: "zip"` 的 URL 做 @font-face，请二选一：
 * 1. **推荐**：与中文包一样，`path` 直接指向解压后的字体文件，例如
 *    `"path": "acude-free/AcudeFree-Regular.otf"`，且 `baseUrl` 指向 `.../extracted/`；
 * 2. 若条目仍保留 `path: "zips/acude-free.zip"`，则必须增加 **`extractedPath`**
 *    指向解压后可访问的字体，例如 `"extractedPath": "acude-free/AcudeFree-Regular.otf"`。
 *
 * 示例（zip + 解压路径）：
 * ```json
 * {
 *   "label": "Acude Free",
 *   "value": "FDFree-AcudeFree",
 *   "path": "zips/acude-free.zip",
 *   "format": "zip",
 *   "extractedPath": "acude-free/AcudeFree-Regular.otf",
 *   "preview": "英文免费"
 * }
 * ```
 */
export const FONT_DOWNLOAD_FREE_OSS_BASE =
  "https://aidesigns.oss-us-east-1.aliyuncs.com/fonts/font-download-free/";

/** 英文免费字体清单唯一默认地址（manifest 在 `free-eng/`，非 `font-download-free/manifest.json`） */
export const FONT_DOWNLOAD_FREE_ENG_MANIFEST_URL =
  "https://aidesigns.oss-us-east-1.aliyuncs.com/fonts/free-eng/manifest.json";

const DEFAULT_OSS_MANIFEST_CANDIDATES = [FONT_DOWNLOAD_FREE_ENG_MANIFEST_URL] as const;

export type FetchFontDownloadFreeOssCatalogOptions = {
  /** 优先尝试的完整 manifest URL（如 NUXT_PUBLIC_FONT_DOWNLOAD_FREE_MANIFEST_URL） */
  manifestUrls?: string[];
};

export type FontDownloadFreeOssManifestFont = {
  label: string;
  value: string;
  path?: string;
  url?: string;
  format?: string;
  weight?: string | number;
  style?: "normal" | "italic";
  preview?: string;
  license?: string;
  licenseUrl?: string;
  /**
   * 当 format 为 zip 或 path 指向 .zip 时：解压后相对 baseUrl 的字体文件路径（浏览器需直接 URL，不能加载 zip）
   * 例：path 为 zips/acude-free.zip 时，可写 extractedPath: "acude-free/AcudeFree-Regular.otf"
   */
  extractedPath?: string;
};

export type FontDownloadFreeOssManifest = {
  baseUrl?: string;
  fonts: FontDownloadFreeOssManifestFont[];
};

function guessFormat(pathOrUrl: string): CustomChineseFontFile["format"] {
  const lower = pathOrUrl.toLowerCase();
  if (lower.endsWith(".woff2")) return "woff2";
  if (lower.endsWith(".woff")) return "woff";
  if (lower.endsWith(".otf")) return "opentype";
  if (lower.endsWith(".ttc") || lower.endsWith(".otc")) return "truetype";
  return "truetype";
}

function normalizeDeclaredFontFormat(
  declared: string | undefined,
  pathOrUrl: string
): CustomChineseFontFile["format"] {
  const d = (declared || "").trim().toLowerCase();
  if (d === "woff2" || d === "woff" || d === "truetype" || d === "opentype") {
    return d;
  }
  if (
    d === "collection" ||
    d === "truetype-collection" ||
    d === "opentype-collection" ||
    d === "font-collection"
  ) {
    return "truetype";
  }
  return guessFormat(pathOrUrl);
}

function pathLooksLikeZip(p: string | undefined): boolean {
  return !!p && p.toLowerCase().endsWith(".zip");
}

/**
 * 解析最终用于 @font-face 的 URL（.zip 不能直接加载，需 extractedPath 指向解压后的字体文件）
 */
function resolveUsableFontUrl(
  base: string,
  item: FontDownloadFreeOssManifestFont
): string {
  if (item.url && /^https?:\/\//i.test(item.url)) {
    if (pathLooksLikeZip(item.url)) {
      return item.extractedPath ? joinURL(base, item.extractedPath) : "";
    }
    return item.url;
  }
  if (item.path && !pathLooksLikeZip(item.path)) {
    return joinURL(base, item.path);
  }
  if (item.extractedPath) {
    return joinURL(base, item.extractedPath);
  }
  if (item.path && pathLooksLikeZip(item.path)) {
    return "";
  }
  return "";
}

export function fontDownloadFreeManifestToCatalog(
  data: FontDownloadFreeOssManifest
): CustomChineseFontCatalogEntry[] {
  const base = (data.baseUrl || FONT_DOWNLOAD_FREE_OSS_BASE).replace(/\/?$/, "/");
  const raw = data.fonts;
  if (!Array.isArray(raw)) return [];

  const out: CustomChineseFontCatalogEntry[] = [];
  for (const f of raw) {
    if (!f?.value || !f?.label) continue;
    const url = resolveUsableFontUrl(base, f);
    if (!url) continue;
    const pathOrUrl = f.extractedPath || f.path || f.url || url;
    const format = normalizeDeclaredFontFormat(f.format, pathOrUrl);
    out.push({
      label: f.label,
      value: f.value,
      category: "english",
      preview: f.preview || f.label,
      sourceType: "file",
      files: [
        {
          url,
          format,
          weight: f.weight ?? 400,
          style: f.style ?? "normal",
        },
      ],
      license: f.license ?? "以各字体包授权文件为准（免费字体合集）",
      licenseUrl: f.licenseUrl,
    });
  }
  return out;
}

/** manifest 全不可解析时的示例（与中文兜底类似，需 OSS 上确有对应文件） */
const STATIC_FALLBACK_MANIFEST: FontDownloadFreeOssManifest = {
  baseUrl: FONT_DOWNLOAD_FREE_OSS_BASE,
  fonts: [],
};

/**
 * 拉取英文免费 OSS manifest（默认仅 `fonts/free-eng/manifest.json`；可选环境变量追加 URL），
 * 合并本地 public 副本（仅开发），并补静态兜底。
 */
export async function fetchFontDownloadFreeOssCatalog(
  appBaseURL = "/",
  options?: FetchFontDownloadFreeOssCatalogOptions
): Promise<CustomChineseFontCatalogEntry[]> {
  const localPublicManifest = joinURL(
    appBaseURL,
    "fonts/font-download-free-oss-manifest.json"
  );

  const tryParse = (body: unknown): CustomChineseFontCatalogEntry[] => {
    if (!body || typeof body !== "object") return [];
    const o = body as Record<string, unknown>;
    const fonts = o.fonts;
    if (!Array.isArray(fonts)) return [];
    const manifest: FontDownloadFreeOssManifest = {
      baseUrl: typeof o.baseUrl === "string" ? o.baseUrl : undefined,
      fonts: fonts as FontDownloadFreeOssManifestFont[],
    };
    return fontDownloadFreeManifestToCatalog(manifest);
  };

  const byValue = new Map<string, CustomChineseFontCatalogEntry>();

  const seenUrl = new Set<string>();
  const remoteManifestUrls: string[] = [];
  for (const u of options?.manifestUrls ?? []) {
    const s = (u || "").trim();
    if (!s || seenUrl.has(s)) continue;
    seenUrl.add(s);
    remoteManifestUrls.push(s);
  }
  for (const u of DEFAULT_OSS_MANIFEST_CANDIDATES) {
    if (seenUrl.has(u)) continue;
    seenUrl.add(u);
    remoteManifestUrls.push(u);
  }

  async function mergeFrom(url: string): Promise<boolean> {
    try {
      const data = await $fetch<unknown>(url);
      for (const f of tryParse(data)) {
        byValue.set(f.value, f);
      }
      return true;
    } catch {
      return false;
    }
  }

  const remoteOk: boolean[] = [];
  for (const url of remoteManifestUrls) {
    remoteOk.push(await mergeFrom(url));
  }
  if (remoteOk.length > 0 && !remoteOk.some(Boolean)) {
    console.warn(
      "[fonts] English free-font OSS manifests: all requests failed. Tried:\n",
      remoteManifestUrls.join("\n"),
      "\nDefault primary is fonts/free-eng/manifest.json. Set NUXT_PUBLIC_FONT_DOWNLOAD_FREE_MANIFEST_URL if the file moves. Zip-only entries need extractedPath to a .ttf/.otf/.woff2."
    );
  }

  if (import.meta.dev) {
    await mergeFrom(localPublicManifest);
  }

  for (const f of fontDownloadFreeManifestToCatalog(STATIC_FALLBACK_MANIFEST)) {
    if (!byValue.has(f.value)) {
      byValue.set(f.value, f);
    }
  }

  return Array.from(byValue.values());
}

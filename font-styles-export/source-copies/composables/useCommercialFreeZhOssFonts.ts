import { $fetch } from "ofetch";
import { joinURL } from "ufo";
import type {
  CustomChineseFontCatalogEntry,
  CustomChineseFontFile,
} from "@/composables/useCustomChineseFontsCatalog";

/** OSS 解压目录根（与字体包路径拼接） */
export const COMMERCIAL_FREE_ZH_OSS_BASE =
  "https://aidesigns.oss-us-east-1.aliyuncs.com/fonts/commercial-free-zh/extracted/";

/** 与 base 并列上传 manifest.json 后可热更新列表而无需发版 */
export const COMMERCIAL_FREE_ZH_OSS_MANIFEST_URL = joinURL(
  COMMERCIAL_FREE_ZH_OSS_BASE,
  "manifest.json"
);

export type CommercialFreeZhOssManifestFont = {
  label: string;
  /** @font-face 的 font-family，需唯一，建议 CFZh- 前缀 */
  value: string;
  /** 相对 baseUrl 的路径，与 url 二选一 */
  path?: string;
  /** 绝对地址，优先于 path */
  url?: string;
  /** 后端可写 collection（.ttc）；前端会规范为浏览器可识别的 format */
  format?: string;
  weight?: string | number;
  style?: "normal" | "italic";
  preview?: string;
  license?: string;
  licenseUrl?: string;
};

export type CommercialFreeZhOssManifest = {
  baseUrl?: string;
  fonts: CommercialFreeZhOssManifestFont[];
};

function guessFormat(pathOrUrl: string): CustomChineseFontFile["format"] {
  const lower = pathOrUrl.toLowerCase();
  if (lower.endsWith(".woff2")) return "woff2";
  if (lower.endsWith(".woff")) return "woff";
  if (lower.endsWith(".otf")) return "opentype";
  if (lower.endsWith(".ttc") || lower.endsWith(".otc")) return "truetype";
  return "truetype";
}

/** manifest 里 collection / ttc 等 → CSS src format() 仅支持 woff2|woff|truetype|opentype */
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

function resolveFontFileUrl(
  base: string,
  item: CommercialFreeZhOssManifestFont
): string {
  if (item.url && /^https?:\/\//i.test(item.url)) {
    return item.url;
  }
  if (item.path) {
    return joinURL(base, item.path);
  }
  return "";
}

export function commercialFreeZhManifestToCatalog(
  data: CommercialFreeZhOssManifest
): CustomChineseFontCatalogEntry[] {
  const base = (data.baseUrl || COMMERCIAL_FREE_ZH_OSS_BASE).replace(
    /\/?$/,
    "/"
  );
  const raw = data.fonts;
  if (!Array.isArray(raw)) return [];

  const out: CustomChineseFontCatalogEntry[] = [];
  for (const f of raw) {
    if (!f?.value || !f?.label) continue;
    const url = resolveFontFileUrl(base, f);
    if (!url) continue;
    const pathOrUrl = f.path || f.url || url;
    const format = normalizeDeclaredFontFormat(f.format, pathOrUrl);
    out.push({
      label: f.label,
      value: f.value,
      category: "chinese",
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
      license: f.license ?? "以各字体包授权文件为准（商用免费合集）",
      licenseUrl: f.licenseUrl,
    });
  }
  return out;
}

/** 内置兜底：远端与本地 manifest 均不可用时仍保证至少示例字体可用 */
const STATIC_FALLBACK_MANIFEST: CommercialFreeZhOssManifest = {
  baseUrl: COMMERCIAL_FREE_ZH_OSS_BASE,
  fonts: [
    {
      label: "YOz手写体RS",
      value: "CFZh-YOzShouXieTi-RS",
      path: "YOzShouXieTi-RS/YOzShouXieTi-RS/YOzRS-2.otf",
      format: "opentype",
      weight: 400,
      preview: "手写中文",
    },
  ],
};

/**
 * 加载商用免费中文字体清单：
 * - 生产环境：只请求 OSS 上的 manifest（{@link COMMERCIAL_FREE_ZH_OSS_MANIFEST_URL}），避免对站点
 *   `/fonts/commercial-free-zh-oss-manifest.json` 发请求导致未部署该文件时出现 404 噪音。
 * - 开发环境：在 OSS 之后可选合并 `public/fonts/commercial-free-zh-oss-manifest.json`（便于离线或覆盖调试）。
 * - 最后补上代码内静态兜底条目。
 */
export async function fetchCommercialFreeZhOssCatalog(
  appBaseURL = "/"
): Promise<CustomChineseFontCatalogEntry[]> {
  const localPublicManifest = joinURL(
    appBaseURL,
    "fonts/commercial-free-zh-oss-manifest.json"
  );

  const tryParse = (body: unknown): CustomChineseFontCatalogEntry[] => {
    if (!body || typeof body !== "object") return [];
    const o = body as Record<string, unknown>;
    const fonts = o.fonts;
    if (!Array.isArray(fonts)) return [];
    const manifest: CommercialFreeZhOssManifest = {
      baseUrl: typeof o.baseUrl === "string" ? o.baseUrl : undefined,
      fonts: fonts as CommercialFreeZhOssManifestFont[],
    };
    return commercialFreeZhManifestToCatalog(manifest);
  };

  const byValue = new Map<string, CustomChineseFontCatalogEntry>();

  async function mergeFrom(url: string) {
    try {
      const data = await $fetch<unknown>(url);
      for (const f of tryParse(data)) {
        byValue.set(f.value, f);
      }
    } catch (err) {
      if (url === COMMERCIAL_FREE_ZH_OSS_MANIFEST_URL) {
        console.warn(
          "[fonts] OSS commercial-free-zh manifest.json request failed; catalog may only have dev/local merge + static fallback.",
          err
        );
      }
    }
  }

  await mergeFrom(COMMERCIAL_FREE_ZH_OSS_MANIFEST_URL);
  if (import.meta.dev) {
    await mergeFrom(localPublicManifest);
  }

  for (const f of commercialFreeZhManifestToCatalog(STATIC_FALLBACK_MANIFEST)) {
    if (!byValue.has(f.value)) {
      byValue.set(f.value, f);
    }
  }

  return Array.from(byValue.values());
}

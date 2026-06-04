/**
 * 字体动态加载 Composable
 * 优先支持自定义中文字体，其余回退到 Google Fonts。
 */

import { ref } from "vue";
import { joinURL } from "ufo";
import type { CustomChineseFontCatalogEntry } from "@/composables/useCustomChineseFontsCatalog";
import {
  customFonts,
  googleFontFaceCanonicalNames,
  legacyFontAliases,
} from "@/constants/editorConstants";
import { findRuntimeCustomFontEntry } from "@/utils/runtimeCustomFontRegistry";

/** 静态 customFonts + 运行时 OSS / custom-chinese 合并目录（插件写入） */
function findEditorCustomFontEntry(
  family: string
): CustomChineseFontCatalogEntry | undefined {
  for (const font of customFonts) {
    if (
      font &&
      typeof font === "object" &&
      "sourceType" in font &&
      "value" in font &&
      (font as { value: string }).value === family
    ) {
      return font as CustomChineseFontCatalogEntry;
    }
  }
  return findRuntimeCustomFontEntry(family);
}

/** OSS/CDN 绝对地址：对 pathname 分段编码，避免 ( ) 等字符与对象 Key 不一致导致 404 */
function encodeAbsoluteFontFileUrl(url: string): string {
  if (!/^https?:\/\//i.test(url)) {
    return url;
  }
  try {
    const u = new URL(url);
    const segs = u.pathname
      .split("/")
      .filter((s) => s.length > 0)
      .map((s) => {
        try {
          return encodeURIComponent(decodeURIComponent(s));
        } catch {
          return encodeURIComponent(s);
        }
      });
    u.pathname = "/" + segs.join("/");
    return u.href;
  } catch {
    return url;
  }
}

// 已加载的字体缓存
const loadedFonts = new Set<string>();

// 正在加载的字体
const loadingFonts = new Map<string, Promise<void>>();
const injectedStyles = new Set<string>();
const injectedLinks = new Set<string>();
const systemFontFamilies = new Set([
  "Arial",
  "Times New Roman",
  "Courier New",
  "Georgia",
  "Verdana",
  "Helvetica",
  "Tahoma",
  "Trebuchet MS",
  "Impact",
  "Comic Sans MS",
  "Bodoni 72",
  "Songti SC",
  "微软雅黑",
  "宋体",
  "黑体",
  "思源黑体",
  "PingFang SC",
  "SimHei",
  "SimSun",
  "LiSu",
  "KaiTi",
  "STXinwei",
  "华文行楷",
  "华文新魏",
  "华文琥珀",
  "华文隶书",
  "华文彩云",
  "方正舒体",
  "方正姚体",
  "方正黑体",
  "方正楷体",
  "方正仿宋",
]);

/**
 * macOS/iOS 常见系统字体在 Windows/Linux 上不存在，浏览器会整段跳过只剩 sans-serif。
 * 在每个系统名后插入 Web 可加载的近似字体，Mac 仍优先用系统名。
 */
const SYSTEM_FONT_WEB_FALLBACKS: Record<string, readonly string[]> = {
  "Bodoni 72": ["Bodoni Moda"],
  "Songti SC": ["Noto Serif SC"],
  "PingFang SC": ["Noto Sans SC"],
  "Hiragino Sans GB": ["Noto Sans SC"],
  "Hiragino Sans": ["Noto Sans SC"],
  STHeiti: ["Noto Sans SC"],
  STSong: ["Noto Serif SC"],
  "Heiti SC": ["Noto Sans SC"],
  "Kaiti SC": ["Noto Serif SC"],
  /** Windows 常见中文黑体；macOS/Web 常缺失，用 Noto 保证 CJK 可显示 */
  SimHei: ["Noto Sans SC"],
  /** Windows 常见宋体 */
  SimSun: ["Noto Serif SC"],
  /** Windows 隶书 */
  LiSu: ["华文隶书", "Noto Serif SC"],
  /** Windows 楷体 */
  KaiTi: ["方正楷体", "Noto Serif SC"],
  /** Windows 魏碑 */
  STXinwei: ["华文新魏", "Noto Serif SC"],
};

/**
 * Google Fonts 在部分网络环境可能不可达，给关键字体提供 Fontsource CDN 兜底。
 */
const FONTSOURCE_CDN_PACKAGES: Record<string, string> = {
  "Bodoni Moda": "bodoni-moda",
  "Noto Serif SC": "noto-serif-sc",
  "Noto Sans SC": "noto-sans-sc",
};
const FONTSOURCE_CDN_WEIGHTS = ["400", "700"] as const;
const logFontInfo = (...args: any[]) => console.info("[FontLoader]", ...args);
const logFontWarn = (...args: any[]) => console.warn("[FontLoader]", ...args);

const parseFontFamilyStack = (fontFamily: string): string[] =>
  fontFamily
    .split(",")
    .map((family) => family.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);

/**
 * Build a properly-quoted CSS `font-family` string from a raw value like
 * `"Bodoni 72, Songti SC"` → `"Bodoni 72", "Bodoni Moda", "Songti SC", "Noto Serif SC", …, sans-serif`.
 */
export const buildFontFamilyCss = (fontValue: string): string => {
  const resolved = normalizeFontFamily(fontValue);
  const rawParts = resolved
    .split(",")
    .map((f) => f.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);

  const out: string[] = [];
  const seen = new Set<string>();

  const pushQuoted = (name: string) => {
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(/^['"]/.test(name) ? name : `"${name}"`);
  };

  for (const part of rawParts) {
    pushQuoted(part);
    const fb = SYSTEM_FONT_WEB_FALLBACKS[part];
    if (fb) {
      for (const x of fb) pushQuoted(x);
    }
  }
  out.push("sans-serif");
  return out.join(", ");
};

const isSystemFontFamily = (fontFamily: string) => systemFontFamilies.has(fontFamily);

/**
 * Resolve legacy font names like "Arimo-Light" → "Arimo".
 * Returns the canonical Google Font family name.
 */
export const normalizeFontFamily = (fontFamily: string): string => {
  const trimmed = fontFamily.trim();
  const legacy = legacyFontAliases[trimmed];
  if (legacy) return legacy.fontFamily;

  const comma = trimmed.indexOf(",");
  const headRaw = comma === -1 ? trimmed : trimmed.slice(0, comma).trim();
  const tail = comma === -1 ? "" : trimmed.slice(comma);
  const headUnquoted = headRaw.replace(/^['"]|['"]$/g, "");
  const gCanon = googleFontFaceCanonicalNames[headUnquoted];
  if (gCanon) {
    return tail ? `${gCanon}${tail}` : gCanon;
  }

  return fontFamily;
};

const resolveFontUrl = (url: string) => {
  if (/^https?:\/\//i.test(url) || url.startsWith("//")) {
    return url;
  }
  // 本地上传字体使用 blob: / data:，不能与 baseURL 拼接，否则会变成
  // https://origin/blob:https://origin/uuid → 404
  if (url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }
  const base =
    typeof window !== "undefined" &&
    typeof (window as any).__NUXT__?.config?.app?.baseURL === "string"
      ? (window as any).__NUXT__.config.app.baseURL
      : "/";
  return joinURL(base, url.replace(/^\/+/, ""));
};

const getCustomFontEntry = (
  fontFamily: string,
  customEntries: CustomChineseFontCatalogEntry[] = []
): CustomChineseFontCatalogEntry | undefined =>
  customEntries.find((font) => font.value === fontFamily);

const isFontUsable = (fontFamily: string): boolean => {
  if (!document.fonts) return true;
  // Latin + CJK probe; either success means the family is available for at least part of content.
  return (
    document.fonts.check(`16px "${fontFamily}"`, "BESbswy") ||
    document.fonts.check(`16px "${fontFamily}"`, "汉字測試")
  );
};

const waitForFontReady = async (fontFamily: string): Promise<boolean> => {
  if (!document.fonts) {
    return true;
  }

  try {
    await Promise.race([
      document.fonts.load(`16px "${fontFamily}"`),
      new Promise<void>((resolve) => setTimeout(resolve, 2500)),
    ]);
    const ready = isFontUsable(fontFamily);
    if (!ready) {
      logFontWarn("Font stylesheet loaded but font not usable yet", fontFamily);
    }
    return ready;
  } catch {
    // Ignore: the stylesheet may still load shortly after.
    const ready = isFontUsable(fontFamily);
    if (!ready) {
      logFontWarn("Font load check failed", fontFamily);
    }
    return ready;
  }
};

export const loadCustomFont = async (
  fontFamily: string,
  entry?: CustomChineseFontCatalogEntry
): Promise<void> => {
  if (loadedFonts.has(fontFamily)) {
    return Promise.resolve();
  }

  if (loadingFonts.has(fontFamily)) {
    return loadingFonts.get(fontFamily)!;
  }

  const fontEntry = entry ?? findEditorCustomFontEntry(fontFamily);
  if (!fontEntry) {
    return Promise.resolve();
  }
  logFontInfo("loadCustomFont", { fontFamily, sourceType: fontEntry.sourceType, hasFiles: !!(fontEntry as any).files?.length });

  const loadPromise = new Promise<void>((resolve) => {
    try {
      // 勿用 document.fonts.check() 作为「是否已加载」判断：对尚未注册到 FontFaceSet 的
      // 自定义 family（如 CFZh-*），规范/实现常返回 true（可用回退字体渲染），会跳过 @font-face，
      // 导致从不请求 OSS 字体文件。去重依赖上方 loadedFonts / 下方 injectedStyles、injectedLinks。

      if (fontEntry.sourceType === "css" && fontEntry.cssUrl) {
        const href = fontEntry.cssUrl;
        if (injectedLinks.has(href)) {
          waitForFontReady(fontFamily).finally(() => {
            loadedFonts.add(fontFamily);
            loadingFonts.delete(fontFamily);
            resolve();
          });
          return;
        }

        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        link.onload = () => {
          injectedLinks.add(href);
          waitForFontReady(fontFamily).finally(() => {
            loadedFonts.add(fontFamily);
            loadingFonts.delete(fontFamily);
            resolve();
          });
        };
        link.onerror = () => {
          loadingFonts.delete(fontFamily);
          resolve();
        };
        document.head.appendChild(link);
        return;
      }

      if (fontEntry.sourceType === "css" && fontEntry.cssText) {
        const styleId = `custom-font-css-${fontFamily}`;
        if (!injectedStyles.has(styleId)) {
          const style = document.createElement("style");
          style.dataset.fontId = styleId;
          style.textContent = fontEntry.cssText;
          document.head.appendChild(style);
          injectedStyles.add(styleId);
        }

        waitForFontReady(fontFamily).finally(() => {
          loadedFonts.add(fontFamily);
          loadingFonts.delete(fontFamily);
          resolve();
        });
        return;
      }

      if (fontEntry.sourceType === "file" && fontEntry.files?.length) {
        const styleId = `custom-font-${fontFamily}`;
        if (!injectedStyles.has(styleId)) {
          const style = document.createElement("style");
          style.dataset.fontId = styleId;
          const cssText = fontEntry.files
            .map((file) => {
              const raw = resolveFontUrl(file.url);
              const srcUrl = encodeAbsoluteFontFileUrl(raw);
              const fontStyle = file.style || "normal";
              const fontWeight = file.weight || "400";
              const unicodeRange = file.unicodeRange
                ? `unicode-range: ${file.unicodeRange};`
                : "";
              return `@font-face {
  font-family: "${fontFamily}";
  src: url("${srcUrl}") format("${file.format}");
  font-style: ${fontStyle};
  font-weight: ${fontWeight};
  font-display: swap;
  ${unicodeRange}
}`;
            })
            .join("\n");
          style.textContent = cssText;
          document.head.appendChild(style);
          injectedStyles.add(styleId);
          logFontInfo("Injected @font-face for file-based font", { fontFamily, cssText });
        }

        waitForFontReady(fontFamily).finally(() => {
          loadedFonts.add(fontFamily);
          loadingFonts.delete(fontFamily);
          resolve();
        });
        return;
      }

      loadingFonts.delete(fontFamily);
      resolve();
    } catch (error) {
      console.error(`❌ Error loading custom font ${fontFamily}:`, error);
      loadingFonts.delete(fontFamily);
      resolve();
    }
  });

  loadingFonts.set(fontFamily, loadPromise);
  return loadPromise;
};

/** 移除本地上传字体时：清缓存并删掉已注入的 @font-face，避免残留 blob: 引用 */
export function forgetInjectedFileCustomFont(fontFamily: string): void {
  if (typeof document === "undefined") return;
  loadedFonts.delete(fontFamily);
  loadingFonts.delete(fontFamily);
  const styleId = `custom-font-${fontFamily}`;
  if (!injectedStyles.has(styleId)) return;
  injectedStyles.delete(styleId);
  const el = document.querySelector<HTMLStyleElement>(
    `style[data-font-id="${CSS.escape(styleId)}"]`
  );
  el?.remove();
}

/**
 * 加载 Google Font
 * @param fontFamily 字体名称（支持旧版别名如 "Arimo-Light"，会自动规范化）
 * @returns Promise
 */
export const loadGoogleFont = async (fontFamily: string): Promise<void> => {
  const canonical = normalizeFontFamily(fontFamily);
  logFontInfo("loadGoogleFont start", { input: fontFamily, canonical });

  if (isSystemFontFamily(canonical)) {
    loadedFonts.add(fontFamily);
    loadedFonts.add(canonical);
    logFontInfo("System font detected, skip remote load", canonical);
    return Promise.resolve();
  }

  if (loadedFonts.has(canonical)) {
    if (isFontUsable(canonical) && hasInjectedCandidate(canonical)) {
      loadedFonts.add(fontFamily);
      logFontInfo("Font already loaded and usable", canonical);
      return Promise.resolve();
    }
    // 缓存脏数据：此前标记 loaded，但当前文档不可用（常见于网络失败/热更新切换）
    loadedFonts.delete(canonical);
    loadedFonts.delete(fontFamily);
    logFontWarn("Loaded cache exists but font unusable, forcing reload", canonical);
  }

  if (loadingFonts.has(canonical)) {
    logFontInfo("Reusing inflight font promise", canonical);
    return loadingFonts.get(canonical)!.then(() => {
      if (isFontUsable(canonical)) {
        loadedFonts.add(fontFamily);
      } else {
        logFontWarn("Inflight finished but font still unusable", canonical);
      }
    });
  }

  const loadPromise = new Promise<void>((resolve) => {
    try {
      const candidates = buildFontCssCandidates(canonical);
      logFontInfo("Font css candidates", { canonical, candidates });
      const alreadyInjected = candidates.find((href) => injectedLinks.has(href));
      if (alreadyInjected) {
        logFontInfo("Using already injected stylesheet", alreadyInjected);
        waitForFontReady(canonical).finally(() => {
          if (isFontUsable(canonical)) {
            loadedFonts.add(canonical);
            loadedFonts.add(fontFamily);
            logFontInfo("Font ready after injected stylesheet", canonical);
          } else {
            logFontWarn("Injected stylesheet exists but font still unusable", canonical);
          }
          loadingFonts.delete(canonical);
          resolve();
        });
        return;
      }
      loadStylesheetSequentially(candidates)
        .then((loadedHref) => {
          if (!loadedHref) {
            logFontWarn("No stylesheet loaded for font", canonical);
            return;
          }
          logFontInfo("Waiting for font ready", { canonical, loadedHref });
          return waitForFontReady(canonical).then((ready) => {
            if (ready && isFontUsable(canonical)) {
              loadedFonts.add(canonical);
              loadedFonts.add(fontFamily);
              logFontInfo("Font ready", canonical);
            } else {
              logFontWarn("Stylesheet loaded but font still unusable", canonical);
            }
          });
        })
        .finally(() => {
          loadingFonts.delete(canonical);
          resolve();
        });
    } catch {
      loadingFonts.delete(canonical);
      resolve();
    }
  });

  loadingFonts.set(canonical, loadPromise);
  return loadPromise;
};

/** Google CSS family 参数：空格转为 +；canonical 后通常已无空格（如 MuseoModerno） */
function encodeGoogleCssFamilyParam(fontFamily: string): string {
  return fontFamily.trim().replace(/\s+/g, "+");
}

/**
 * 动态加载时多给几档候选：变量轴 → 全静态字重 → 旧版三档。
 * 仅请求 300;400;700 时，文本若用 500/600 等可能回退/伪粗，字形与列表预览不一致。
 */
function buildFontCssCandidates(fontFamily: string): string[] {
  const enc = encodeGoogleCssFamilyParam(fontFamily);
  const urls = [
    `https://fonts.googleapis.com/css2?family=${enc}:wght@100..900&display=swap`,
    `https://fonts.googleapis.com/css2?family=${enc}:wght@100;200;300;400;500;600;700;800;900&display=swap`,
    `https://fonts.googleapis.com/css2?family=${enc}:wght@300;400;700&display=swap`,
  ];
  const pkg = FONTSOURCE_CDN_PACKAGES[fontFamily];
  if (pkg) {
    for (const weight of FONTSOURCE_CDN_WEIGHTS) {
      urls.push(`https://cdn.jsdelivr.net/npm/@fontsource/${pkg}@latest/${weight}.css`);
    }
  }
  return urls;
}

function hasInjectedCandidate(fontFamily: string): boolean {
  return buildFontCssCandidates(fontFamily).some((href) => injectedLinks.has(href));
}

function loadStylesheetSequentially(urls: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    const tryNext = (idx: number) => {
      if (idx >= urls.length) {
        logFontWarn("All stylesheet candidates failed", urls);
        resolve(null);
        return;
      }
      const href = urls[idx];
      if (injectedLinks.has(href)) {
        logFontInfo("Stylesheet already injected", href);
        resolve(href);
        return;
      }
      logFontInfo(`Trying stylesheet [${idx + 1}/${urls.length}]`, href);
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.onload = () => {
        injectedLinks.add(href);
        logFontInfo("Stylesheet loaded", href);
        resolve(href);
      };
      link.onerror = () => {
        logFontWarn("Stylesheet failed", href);
        link.remove();
        tryNext(idx + 1);
      };
      document.head.appendChild(link);
    };
    tryNext(0);
  });
}

async function loadOneFamilyInStack(
  family: string,
  customEntry?: CustomChineseFontCatalogEntry
): Promise<void> {
  const trimmed = family.trim().replace(/^['"]|['"]$/g, "");
  if (!trimmed) return;
  logFontInfo("loadOneFamilyInStack", trimmed);

  if (isSystemFontFamily(trimmed)) {
    loadedFonts.add(trimmed);
    const extras = SYSTEM_FONT_WEB_FALLBACKS[trimmed];
    if (extras?.length) {
      logFontInfo("Applying system web fallbacks", { system: trimmed, extras });
      await Promise.all(extras.map((fb) => loadFont(fb)));
    }
    return;
  }

  const matchedEntry =
    customEntry?.value === trimmed ? customEntry : undefined;
  const registryEntry = findEditorCustomFontEntry(trimmed);
  const entry = matchedEntry ?? registryEntry;
  if (entry) {
    await loadCustomFont(trimmed, entry);
    return;
  }
  await loadGoogleFont(trimmed);
}

export const loadFont = async (
  fontFamily: string,
  customEntry?: CustomChineseFontCatalogEntry
): Promise<void> => {
  const canonical = normalizeFontFamily(fontFamily);
  const families = parseFontFamilyStack(canonical);
  await Promise.all(families.map((f) => loadOneFamilyInStack(f, customEntry)));
};

/** 从 buildFontFamilyCss 结果解析字体栈（含 Noto 等 Web 回退） */
export function parseFontFamilyCssStack(fontFamilyCss: string): string[] {
  return fontFamilyCss
    .split(",")
    .map((f) => f.trim().replace(/^['"]|['"]$/g, ""))
    .filter(
      (f) => f && !["sans-serif", "serif", "monospace", "cursive", "fantasy"].includes(f)
    );
}

/**
 * 导出前预加载整份 deck 字体栈并等待 document.fonts，避免 html2canvas / 截图时中英文混排、数字回退字体不一致。
 */
export async function ensureExportFontsReady(primaryFont: string): Promise<void> {
  const stack = parseFontFamilyCssStack(buildFontFamilyCss(primaryFont));
  for (const family of stack) {
    await loadFont(family);
  }
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await Promise.race([
      document.fonts.ready,
      new Promise<void>((resolve) => setTimeout(resolve, 5000)),
    ]);
  }
  for (const family of stack) {
    await waitForFontReady(family);
  }
}

/**
 * 批量加载字体（分块限并发，避免一次性打满浏览器对单域名的连接数导致其它请求长时间 Stalled）
 */
export const loadGoogleFonts = async (
  fontFamilies: string[],
  customEntries: CustomChineseFontCatalogEntry[] = [],
  concurrency = 6
): Promise<void> => {
  const limit = Math.max(1, Math.min(concurrency, 12));
  for (let i = 0; i < fontFamilies.length; i += limit) {
    const chunk = fontFamilies.slice(i, i + limit);
    await Promise.all(
      chunk.map((font) => loadFont(font, getCustomFontEntry(font, customEntries)))
    );
  }
};

/**
 * 预加载推荐字体。
 * 只立即加载第一屏可见的字体（约 12 个），剩余字体在空闲时分批加载，
 * 避免一次性发起大量 CSS/woff2 请求堵塞其他 API 调用。
 *
 * @param fontList  完整推荐列表（FontSelector 的 featuredFonts.map(f=>f.value)）
 * @param customEntries 自定义字体目录（用于匹配 loadCustomFont）
 * @param firstScreenCount 第一屏可见字体数量，默认 12
 */
export const preloadFeaturedFonts = async (
  fontList?: string[],
  customEntries: CustomChineseFontCatalogEntry[] = [],
  firstScreenCount = 12
): Promise<void> => {
  const defaultFeaturedFonts = [
    'ZCOOL KuaiLe',
    'ZCOOL QingKe HuangYou',
    'ZCOOL XiaoWei',
    'Liu Jian Mao Cao',
    'Long Cang',
    'Ma Shan Zheng',
    'Zhi Mang Xing',
    'Noto Sans SC',
    'Noto Serif SC',
    'Dela Gothic One',
    'Train One',
    'DotGothic16',
  ];

  const fontsToLoad = fontList || defaultFeaturedFonts;
  const firstScreen = fontsToLoad.slice(0, firstScreenCount);
  const rest = fontsToLoad.slice(firstScreenCount);

  await loadGoogleFonts(firstScreen, customEntries, 4);

  if (rest.length > 0) {
    const loadRest = () => loadGoogleFonts(rest, customEntries, 2);
    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(() => void loadRest(), { timeout: 5000 });
    } else {
      setTimeout(() => void loadRest(), 500);
    }
  }
};

/**
 * useFontLoader Composable
 */
export const useFontLoader = () => {
  const isLoading = ref(false);
  const loadedCount = ref(0);

  const loadSelectedFont = async (
    fontFamily: string,
    customEntry?: CustomChineseFontCatalogEntry
  ) => {
    isLoading.value = true;
    await loadFont(fontFamily, customEntry);
    loadedCount.value = loadedFonts.size;
    isLoading.value = false;
  };

  const loadFonts = async (
    fontFamilies: string[],
    customEntries: CustomChineseFontCatalogEntry[] = []
  ) => {
    isLoading.value = true;
    await loadGoogleFonts(fontFamilies, customEntries);
    loadedCount.value = loadedFonts.size;
    isLoading.value = false;
  };

  const preloadFeatured = async (
    fontList?: string[],
    customEntries: CustomChineseFontCatalogEntry[] = []
  ) => {
    isLoading.value = true;
    await preloadFeaturedFonts(fontList, customEntries);
    loadedCount.value = loadedFonts.size;
    isLoading.value = false;
  };

  return {
    isLoading,
    loadedCount,
    loadFont: loadSelectedFont,
    loadFonts,
    preloadFeatured,
  };
};

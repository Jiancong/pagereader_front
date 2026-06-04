import type { CustomChineseFontCatalogEntry } from "@/composables/useCustomChineseFontsCatalog";

/** 由 Nuxt 插件在拉取 custom-chinese-fonts + OSS manifest 后写入；供 useFontLoader 在无 second-arg 时解析 CFZh- 等条目 */
let runtimeCatalog: CustomChineseFontCatalogEntry[] = [];

/** 用户本地上传的字体（blob: URL），与插件目录分离；优先匹配 */
let userUploadedCatalog: CustomChineseFontCatalogEntry[] = [];

export function setRuntimeCustomFontCatalog(
  entries: CustomChineseFontCatalogEntry[]
) {
  runtimeCatalog = Array.isArray(entries) ? entries : [];
}

/** 与 useState('user-uploaded-fonts') 同步，供 findRuntimeCustomFontEntry 解析 */
export function setUserUploadedFontCatalog(
  entries: CustomChineseFontCatalogEntry[]
) {
  userUploadedCatalog = Array.isArray(entries) ? [...entries] : [];
}

export function findRuntimeCustomFontEntry(
  family: string
): CustomChineseFontCatalogEntry | undefined {
  return (
    userUploadedCatalog.find((f) => f.value === family) ??
    runtimeCatalog.find((f) => f.value === family)
  );
}

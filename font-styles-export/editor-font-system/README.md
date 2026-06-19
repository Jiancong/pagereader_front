# 编辑器字体系统 — 集成清单

本目录 **不包含** 完整可运行的编辑器字体模块（依赖 `editorConstants.ts`、OSS 资源、Nuxt 插件等），但已拷贝核心源码与 JSON 目录供参考。

## 已拷贝到 `source-copies/`

| 文件 | 原路径 |
|------|--------|
| `useFontLoader.ts` | `src/composables/useFontLoader.ts` |
| `useGoogleFontsCatalog.ts` | `src/composables/useGoogleFontsCatalog.ts` |
| `useCustomChineseFontsCatalog.ts` | `src/composables/useCustomChineseFontsCatalog.ts` |
| `useChineseFontsCatalog.ts` | `src/composables/useChineseFontsCatalog.ts` |
| `useCommercialFreeZhOssFonts.ts` | `src/composables/useCommercialFreeZhOssFonts.ts` |
| `useFontDownloadFreeOssFonts.ts` | `src/composables/useFontDownloadFreeOssFonts.ts` |
| `useUserUploadedFonts.ts` | `src/composables/useUserUploadedFonts.ts` |
| `FontSelector.vue` | `src/components/editor/FontSelector.vue` |
| `public-fonts/*.json` | `public/fonts/*.json` |

## 另需从原仓库复制的文件

```
src/constants/editorConstants.ts          # googleFonts / customFonts 列表
src/utils/runtimeCustomFontRegistry.ts
src/plugins/google-fonts-catalog.client.ts
src/plugins/chinese-fonts-catalog.client.ts
src/plugins/custom-chinese-fonts-catalog.client.ts
scripts/copy-font-catalogs-to-output.mjs
scripts/fetch-google-fonts-catalog.mjs
```

## 文档

- `source-copies/docs/GOOGLE_FONTS_SETUP.md`
- `source-copies/docs/FONT_SELECTOR_GUIDE.md`

## 运行时说明

- Google Fonts **按需加载**：通过 `useFontLoader` 动态注入 `@font-face`，避免在 head 里请求超大 CSS URL。
- 中文字体来自 OSS manifest（`public/fonts/*.json`），构建时需执行 copy 脚本保证 `.output/public/fonts/` 存在。

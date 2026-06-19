# 字体与排版样式导出包

从 **midjourney-ui-vue3** 提取的字体加载、品牌排版与相关源码副本，供其他项目（Vue / Nuxt / 纯 HTML）集成。

> 导出时间：与仓库 `feat/ximeng-home-revamp` 分支同步  
> 原仓库路径：`d:\Work\Bytelancers\src\midjourney-ui-vue3`

---

## 目录结构

```
font-styles-export/
├── README.md                          ← 本说明
├── styles/                            ← 可直接引用的整合 CSS（推荐）
│   ├── 01-google-fonts-head.html      ← <head> 内 Google Fonts link
│   ├── 02-global-typography.css       ← 全站 Oxanium + aidesigns 渐变标题
│   ├── 03-ximeng-brand-tokens.css     ← ximeng CSS 变量 + .font-playfair
│   ├── 04-ximeng-typography.css       ← Hero / 落地页标题尺度
│   ├── 05-navigation-typography.css   ← 导航字体与 ximeng 高亮
│   ├── 06-login-promo-typography.css  ← 登录弹窗品牌字色
│   └── index.css                      ← 一键 @import 上述 CSS
├── source-copies/                     ← 原仓库文件 verbatim 副本
│   ├── base.scss                      ← 全局 @font-face + html 字体
│   ├── composables/                   ← 编辑器字体加载 composables
│   ├── layout/                        ← NavItems / NavBar / LoginButton 等
│   ├── public-fonts/                  ← JSON 字体目录
│   └── docs/                          ← 原项目字体文档
├── editor-font-system/                ← 编辑器字体子系统集成清单
├── examples/
│   ├── typography-preview.html        ← 浏览器打开即可预览
│   └── nuxt-app-head.example.ts       ← Nuxt head 配置片段
```

---

## 一、品牌字体一览

| 用途 | 字体 | 加载方式 |
|------|------|----------|
| **全站 UI / 导航 / 正文** | [Oxanium](https://fonts.google.com/specimen/Oxanium) | Google Fonts CDN |
| **ximeng 大标题（衬线）** | [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) | Google Fonts CDN |
| **aidesigns 营销渐变标题** | Oxanium 700 + CSS 渐变字 | `.app-title-gradient` |
| **编辑器装饰英文字体** | Amsterdam / Vivaldi 等 | cdnfonts.com woff（见 `source-copies/base.scss`） |
| **编辑器 Google/中文/OSS 字体** | 1000+ 动态加载 | `useFontLoader` + JSON catalog |

### ximeng 品牌色（与字体搭配）

```css
--xm-bg: #081829;
--xm-slate: #233852;
--xm-sand: #ddc7ac;
--xm-ochre: #a87f4b;
```

### aidesigns 强调色

```css
#14ecff  /* 导航 hover / 主按钮描边 */
#0176ff → rgba(1,231,255,0.79)  /* 渐变标题 */
```

---

## 二、最快集成（纯 HTML / 任意框架）

### 步骤 1：引入 Google Fonts

将 `styles/01-google-fonts-head.html` 中的 `<link>` 复制到页面 `<head>`。

### 步骤 2：引入样式

```html
<link rel="stylesheet" href="/path/to/font-styles-export/styles/index.css" />
```

### 步骤 3：使用 class

```html
<body class="ximeng-brand">
  <p class="xm-hero__kicker">平面设计 · 视频创作</p>
  <h1 class="xm-hero__title font-playfair">海报与视频，AI 一站生成</h1>
  <p class="xm-hero__subtitle">副标题文案…</p>
</body>
```

本地预览：用浏览器打开 `examples/typography-preview.html`。

---

## 三、Nuxt 3 / Vue 3 集成

### 3.1 复制文件夹

将整个 `font-styles-export` 拷到新项目，例如：

```
your-project/
  shared/font-styles-export/   ← 本目录
```

### 3.2 nuxt.config.ts

```ts
import { brandFontHeadLinks } from "../shared/font-styles-export/examples/nuxt-app-head.example";

export default defineNuxtConfig({
  css: ["~/shared/font-styles-export/styles/index.css"],
  app: {
    head: {
      link: [...brandFontHeadLinks],
    },
  },
});
```

### 3.3 Vue 组件

标题使用 Playfair：

```vue
<h1 class="font-playfair xm-hero__title">{{ title }}</h1>
```

导航 ximeng 分支（与原项目一致）：

```vue
<NavItems class="nav-items--ximeng" />
```

品牌判断（原项目逻辑）：

```ts
const isXimengSite = computed(() => useRuntimeConfig().public.siteBrand === "ximeng");
```

---

## 四、原仓库中的来源映射

| 导出内容 | 原文件 |
|----------|--------|
| Google Fonts head | `nuxt.config.ts` → `app.head.link` |
| 全局 html 字体 | `src/assets/styles/base.scss` |
| `.app-title-gradient` | `src/assets/styles/base.scss` |
| `.font-playfair`、Hero 字号 | `src/components/home/revamp/*.vue` |
| ximeng CSS 变量 | `XmPageShell.vue`、`HeroChatSectionXimeng.vue` |
| 导航字体 | `src/components/layout/NavItems.vue` |
| 导航 CTA 字号 | `NavBar.vue`、`MobileMenu.vue` |
| 登录弹窗字色 | `LoginButton.vue` |

---

## 五、编辑器字体子系统

若另一项目需要 **画布内字体选择器**（Google Fonts + 中文 OSS + 用户上传），请参阅：

- `editor-font-system/README.md`
- `source-copies/composables/useFontLoader.ts`
- `source-copies/public-fonts/*.json`

该子系统与品牌落地页字体 **相互独立**：落地页只需 Oxanium + Playfair；编辑器按需动态加载其余字体。

---

## 六、注意事项

1. **网络**：Oxanium / Playfair 依赖 Google Fonts；国内环境请考虑自建字体镜像或 `@fontsource`  npm 包。
2. **异步加载**：原项目用 `media="print" onload="this.media='all'"` 避免阻塞 LCP，建议保留。
3. **装饰字体**：`source-copies/base.scss` 中 Amsterdam/Vivaldi 等来自 cdnfonts.com，仅供编辑器艺术字，**首页品牌页不需要**。
4. **Tailwind**：导出 CSS 不依赖 Tailwind；若新项目用 Tailwind，可将 token 迁入 `theme.extend.fontFamily`：

```js
fontFamily: {
  ui: ['Oxanium', 'sans-serif'],
  display: ['"Playfair Display"', 'serif'],
},
```

---

## 七、维护建议

- 修改 ximeng 标题尺度时，同步更新 `styles/04-ximeng-typography.css` 与各 revamp 组件。
- 原项目多处重复定义 `.font-playfair`（scoped）；新集成项目 **只引用 `styles/03-ximeng-brand-tokens.css` 一处** 即可。
- 升级 Google Fonts 字重时，同步修改 `01-google-fonts-head.html` 与 `nuxt-app-head.example.ts` 中的 URL。

---

## 联系 / 问题

集成时若缺少某段样式，可在原仓库搜索：

- `font-playfair`
- `font-family: Oxanium`
- `--xm-sand`

并更新本导出包对应文件。

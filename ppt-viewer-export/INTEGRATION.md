# PptViewer 集成说明

PPT 在线预览 / 全屏演示 / 导出（PDF、PPTX、PNG 包）/ 划词追问相关搜索组件，已连同全部依赖打包到本目录。

## 一、目录结构

所有文件均保持原项目 `src/` 下的相对路径，可直接整体拷贝进目标项目的 `src/`。

```
src/
├─ components/editor/chat/
│  ├─ PptViewer.vue            主组件（入口）
│  ├─ PptMarkdownInline.vue    行内 markdown（加粗/引用角标）
│  ├─ PptChapterImages.vue     章节配图块
│  ├─ PptTableBlock.vue        结构化表格
│  ├─ PptMetricCardsRow.vue    指标卡片行
│  ├─ PptChartSourceLine.vue   图表数据来源行
│  ├─ PptContextMenu.vue       右键/划词菜单
│  ├─ PptRelatedSearchPanel.vue 划词追问面板（递归嵌套）
│  ├─ ChatMarkdownBody.vue     追问回答的 markdown 渲染
│  └─ MermaidBlock.vue         mermaid 图渲染
├─ composables/
│  ├─ useFontLoader.ts             字体加载/导出字体就绪
│  ├─ usePptRelatedSearch.ts       划词追问的 SSE 流式逻辑
│  ├─ useCustomChineseFontsCatalog.ts 自定义中文字体目录
│  ├─ useGtmDataLayer.ts           GTM 埋点（user store 依赖）
│  └─ user.ts                      Pinia 用户 store（仅用于取鉴权 token）
├─ constants/
│  └─ editorConstants.ts           字体等常量
├─ utils/
│  ├─ pptThemeTokens.ts            主题色/CSS 变量
│  ├─ pptChapterImages.ts          配图布局解析
│  ├─ pptInlineMarkdown.ts         行内 markdown 解析 + pptx 文本块
│  ├─ pptDisplayFont.ts            字体族解析
│  ├─ pptCoverDecorations.ts       封面/章节装饰
│  ├─ pptContextSelection.ts       划词选区文本提取
│  ├─ pptDocumentRag.ts            PPT 内文档 RAG
│  ├─ runtimeCustomFontRegistry.ts 运行时自定义字体注册
│  ├─ chatMarkdownPipeline.ts      marked 渲染管线
│  ├─ splitMarkdownMermaid.ts      markdown 中分离 mermaid
│  └─ mermaidClient.ts             mermaid 懒加载
└─ request/
   ├─ agent.ts            agent SSE 接口（含 sendAgentChatWithStream）
   ├─ request.ts          axios/fetch 封装（带鉴权头）
   ├─ response-codes.ts   响应码常量
   ├─ generation.ts       生成相关接口（agent.ts 依赖）
   └─ file.ts             文件上传接口（agent.ts 依赖）
```

## 二、组件公共 API

```ts
// props
pptData: PptData        // 必填，PPT 数据
initialSlide?: number   // 初始页码，默认 0
projectId?: string      // 用于生成 /share?projectId= 分享链接

// emits
(e: "close"): void
(e: "update:pptData", data: PptData): void
```

`PptData` 结构（详见 `PptViewer.vue` 内 interface 定义）：

```ts
interface PptData {
  title: string;
  subtitle?: string;
  theme?: string;
  palette?: PptPalette;          // 配色/主题 token
  chapter_images?: ...;          // 章节配图
  total_slides: number;
  slides: PptSlide[];            // 每页 layout/title/content/chart/table 等
}
```

最简使用：

```vue
<script setup lang="ts">
import PptViewer from "@/components/editor/chat/PptViewer.vue";
import { ref } from "vue";
const ppt = ref(/* PptData */);
</script>

<template>
  <PptViewer
    :ppt-data="ppt"
    :project-id="projectId"
    @close="onClose"
    @update:ppt-data="(d) => (ppt = d)"
  />
</template>
```

## 三、路径别名（必须配置）

代码中使用了两个别名，**二者都指向本包的 `src/` 根**（与原项目 Nuxt 约定一致）：

- `@/xxx` → `src/xxx`
- `~/xxx` → `src/xxx`

在目标项目的 `vite.config`/`tsconfig` 中确保 `@` 与 `~` 都解析到放置本包的 `src/` 目录，否则导入会失败。

## 四、npm 依赖

静态依赖：

```
vue  vue-i18n  element-plus  pinia  lodash-es  marked  mermaid  ofetch  ufo
```

导出功能按需动态 import（仅点击导出时加载）：

```
html2canvas  jszip  file-saver  jspdf  pptxgenjs
```

## 五、Nuxt 专属全局（非 Nuxt 项目需替换）

本包源自 Nuxt 项目，以下 API 依赖 Nuxt 自动导入/运行时，迁到纯 Vite/Vue 项目时需自行处理：

- `useRuntimeConfig()` —— `request/request.ts`、`request/generation.ts`，用于读取 `apiUrl`。非 Nuxt 环境请改为读取自己的环境变量（如 `import.meta.env.VITE_API_URL`）。
- `import.meta.client` —— `utils/mermaidClient.ts`，判断是否浏览器端。纯前端可替换为 `typeof window !== 'undefined'`。
- `useState('user-uploaded-fonts')` —— `utils/runtimeCustomFontRegistry.ts`，自定义字体注册表。无此功能可忽略（返回空即可）。
- `process.env.API_URL` —— 同上，按目标项目环境变量改写。

## 六、i18n 文案

组件全部文案走 `vue-i18n` 的 `agent.ppt*` 命名空间（如 `agent.pptShare`、`agent.pptExporting`、`agent.pptSeriesLabel` 等）。请从原项目 `src/locales/{zh-cn,en-us,zh-tw}.ts` 中复制 `agent` 命名空间下所有 `ppt` 开头的 key 到目标项目语言包，否则界面会显示 key 原文。

## 七、后端接口依赖（仅「划词追问相关搜索」用到）

划词追问分支调用后端 SSE 接口，目标项目需提供等价后端：

- 接口：`POST /api2/agent/chat-stream`（SSE 流），见 `request/agent.ts` 的 `sendAgentChatWithStream`。
- 鉴权：从 Pinia `useUserStore().token` 取 token 放入 `Authorization` 头；并附加 `getApiContextHeaders()`（`utils/apiRequestContext.ts`，含 `X-Project-Id` 等上下文头）。
- 普通接口经 `request/request.ts` 封装，baseURL 由 `useRuntimeConfig().public.apiUrl` 决定。

若目标项目**不需要划词追问**，可不接该后端：删除 `PptViewer.vue` 中对 `usePptRelatedSearch` / `PptRelatedSearchPanel` / `PptContextMenu` 的引用，即可去掉对 `request/*`、`composables/user.ts`、`useGtmDataLayer.ts`、`apiRequestContext.ts` 的全部依赖，纯展示+导出可独立运行。

## 八、注意事项

- `request/generation.ts` 原有一行指向 `public/images/icons/const` 的 `PRODUCT_TYPE` 死导入（项目中该文件不存在且未被使用），打包时已删除。
- PptViewer 单文件约 1.7 万行，含全部图表 SVG 渲染与 pptx 导出逻辑，无需拆分即可直接使用。

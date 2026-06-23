# PPT Theme Renderers

Editorial Brutalist 与 Modern Literary 两套主题的渲染逻辑已从 `PptViewer.vue` 拆出；**默认/经典主题**也已拆至 `themes/classic/`。`PptViewer.vue` 保留壳层（导航、归一化、chart 引擎、palette、导出）。

## 目录结构

```
ppt/
├── types.ts                 # PptSlide / PptChart / PptData 等共享类型
├── pptSlideContext.ts       # 编辑、品牌、i18n inject 契约
├── pptChartContext.ts       # 图表 SVG 计算 inject 契约
├── shared/
│   ├── contentHelpers.ts    # content 解析、displayText、resolveSlideBulletItems
│   ├── slideLayoutHelpers.ts# TOC、hero_left、document figure 等布局判定
│   └── chartHelpers.ts      # 图表类型判定、formatChartDataValue
├── pptClassicContext.ts     # 经典主题专用 inject（backdrop、layout 判定、扩展 chart API）
├── charts/
│   └── PptBrutalistDataChart.vue
└── themes/
    ├── registry.ts          # template_id 与 shouldUse* 入口
    ├── classic/
    │   ├── PptClassicSlide.vue
    │   └── classic.scss
    ├── editorialBrutalist/
    │   ├── PptEditorialBrutalistSlide.vue
    │   ├── editorialBrutalistHelpers.ts
    │   └── editorialBrutalist.scss
    └── modernLiterary/
        ├── PptModernLiterarySlide.vue
        ├── modernLiteraryHelpers.ts
        └── modernLiterary.scss
```

## 数据流

1. `PptViewer.vue` 负责数据归一化、导航、chart 几何计算、palette/字体。
2. `provide(pptSlideEditorKey)` / `provide(pptChartContextKey)` / `provide(pptClassicContextKey)` 向主题子组件注入能力。
3. 主题 SFC 只接收 `slide: PptSlide`，通过 `inject` 访问壳层能力；经典主题为 fallback（`v-else`）。

## 新增主题

1. 在 `themes/<name>/` 下新增 SFC + helpers + scss。
2. 在 `themes/registry.ts` 注册 `template_id` 与 `shouldUse*`。
3. 在 `PptViewer.vue` 模板中按 `v-if` / `v-else-if` 挂载新组件。
4. 保持根 class 命名稳定（导出/html2canvas 依赖 DOM 类名）。

## 后续

- Chart 引擎可进一步抽为 `composables/usePptChartGeometry.ts`。
- 可选：`defineAsyncComponent` 懒加载主题 SFC，减小首屏 bundle。

## 主题与 layout 映射

| 主题 | `template_id` | 支持的 layout |
|------|---------------|---------------|
| Editorial Brutalist | `editorial-brutalist-modern` | cover, section, end, quote, content, two_column, toc, data |
| Modern Literary | `modern-literary-minimal` | cover, section, quote, content, two_column |
| Classic（默认） | 其他 `template_id` / 未匹配上述主题时 | cover, section, toc, references, content, two_column, data, quote, end 及兜底 layout |

判定逻辑见 `themes/registry.ts` 中的 `shouldUseEditorialBrutalistSlide` / `shouldUseModernLiterarySlide`。

**Content + chart**：当 `layout === "content"` 且 slide 含 `chart` 或 `table` 时，Editorial Brutalist 走 data-panel 布局（左侧 bullets + 右侧图表），与 `layout: "data"` 一致。

## 回归检查清单

在 `DebugPptView` 或 `ProjectPreview` 中手动验证：

- [ ] **Cover / section / end**：标题、kicker、水印、页脚品牌文案
- [ ] **Quote**：单条与多条 quote 填满幻灯片（`ppt-editorial-brutalist--quote-multi`）
- [ ] **Content**：纯卡片网格 vs content+chart 分栏
- [ ] **Data / toc / two_column**：图表 SVG、表格引用角标、TOC 密度
- [ ] **编辑**：`contenteditable` blur 写回、`onPptTableRefClick` 跳转
- [ ] **导出**：html2canvas / PDF 仍命中 `.ppt-slide`；根 class `ppt-editorial-brutalist` / `ppt-modern-literary` 未改名

## 壳层保留职责（PptViewer.vue）

- 幻灯片导航与 `normalizeSlideData`
- Chart 几何计算与 `provide(pptChartContextKey)`
- Palette / 字体加载（含主题 token CSS 变量）
- 经典主题通过 `PptClassicSlide`（`v-else` fallback）渲染
- 导出、PDF、相关搜索等周边能力


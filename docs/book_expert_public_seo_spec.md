# 公开专家页 SEO（前端构建 + 运行时）

公开 URL：`/explore/expert/{expertId}`（例：`https://page2.top/explore/expert/exp_f4493e4b37c0`）。

## 运行时（SPA）

- 视图：`ExploreExpertView.vue`
- Head：`useSeoHead` + `src/utils/bookExpertSeo.ts`（title / description / canonical / OG / JSON-LD）
- 页面标记：`data-seo-ready`、`data-seo-section="methodology"`（供预渲染等待）

## 构建后流水线（`npm run build` → `postBuildSeo.mjs`）

| 步骤 | 脚本 | 专家页行为 |
|------|------|------------|
| 1 | `prerender.mjs` | Puppeteer 渲染 `/explore/expert/{id}` → `dist/explore/expert/{id}/index.html` |
| 2 | `injectBookSeoPages.mjs` | 图书社区页（不变） |
| 3 | `injectExpertSeoPages.mjs` | API 拉详情，注入 head + 无 Chrome 爬虫正文 |
| 4 | `generate-sitemap.mjs` | `sitemap.xml` 增加专家 URL |

跳过：`SKIP_SEO=1`（全部）；`SKIP_PRERENDER=1`；`SKIP_INJECT_EXPERT_SEO=1`；`SKIP_SITEMAP=1`。

## 环境变量

与图书 SEO 共用 API：

- `VITE_API_URL` / `SITE_API_BASE` / `SITEMAP_API_BASE` — 必须配置，否则 sitemap / inject 仅首页
- `SITE_ORIGIN` — 默认 `https://page2.top`（canonical、sitemap）
- `SEO_LOCALE` — 构建期拉取专家文案语言，默认 `en`

数量限制：

- `PRERENDER_EXPERT_LIMIT` — 预渲染专家数（默认 = `PRERENDER_LIMIT`，50）
- `INJECT_EXPERT_LIMIT` — inject 专家数（默认同上）
- `SITEMAP_MAX_EXPERTS` — sitemap 专家条目上限（默认 500）

## API（构建脚本）

- 列表 ID：`GET /api2/book-experts/public?locale=&ui_locale=&page=&pageSize=`
- 详情（含 `methodology_preview`）：`GET /api2/book-experts/{expertId}?locale=&ui_locale=`

匿名可读公开专家；与 `docs/book_expert_display_i18n_spec.md` 一致。

## 部署注意

静态托管需对 `/explore/expert/*` 优先返回对应目录下的 `index.html`（与 `/explore/project/*` 相同）。若仅 SPA fallback 到根 `index.html`，预渲染 HTML 不会生效。

## 后续（后端，可选）

- 动态 `GET /sitemap.xml` 合并全量 `public` 专家 + Feed 图书，避免构建快照滞后
- 按 `updated_at` 输出 `<lastmod>`

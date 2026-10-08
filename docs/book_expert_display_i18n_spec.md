# Book Expert 展示文案国际化 — 后端实现 Spec

> **读者**：Python（`ai-design-poster` / `book_expert`）+ Java BFF（`pagereader-backend`）  
> **目标**：英文 UI（`locale=en` / `ui_locale=en`）下，首页 showcase、探索列表、公开专家页展示的 **专家名、书名、方法论预览、主题分类标签** 为英文（或用户创建时选择的语言），而不是一律返回中文原文。  
> **前端仓库**：`pagereader_front`（`resolveBookExpertDisplay.ts`、`bookExpert.ts`、`BookExpertShowcaseSection.vue`、`ExploreExpertView.vue`）

---

## 0. 问题与根因

| 现象 | 原因 |
|------|------|
| 界面语言为 English，卡片上 `expert_name` / `book_title` 仍为中文 | 字段为 **蒸馏/用户填写时的原文**，持久化在 DB；列表/详情 **未按请求语言解析** |
| 前端批量翻译偶发仍中文 | `POST /translate/batch` **需登录**（OpenAPI `security: bearerAuth`），**未登录首页访客**无法翻译 |
| 前端已传 `locale` / `ui_locale` query | 若后端 **忽略** 这些参数，响应不会变化 |

**结论**：可靠方案是 **后端持久化 + 读接口按 locale 返回**；前端翻译仅作已登录用户的降级，不能作为产品依赖。

---

## 1. 产品规则

| 场景 | 期望 |
|------|------|
| 蒸馏创建专家 | 请求体已有 `uiLocale: zh \| en`（前端 `DistillRequest`）；应用 **同一语言** 生成并保存展示字段（见 §2） |
| 用户手动改 `expert_name` / `book_title` | 以用户输入为准；可选后续「生成英文别名」异步任务（非 MVP） |
| `GET /book-experts/public`、`GET /book-experts/mine`、`GET /book-experts/{id}` | 根据 **§3 Query** 返回 **该 locale 下的展示字符串**（见 §4） |
| 匿名访问公开专家 | **必须** 不依赖登录即可拿到英文展示（首页 SEO/转化） |
| `topic_category_id` | 展示名 **不要** 只返回库内中文冗余；按 Feed 分类 catalog + `locale` 解析（与 `TopicCategory.name` / `nameEn` 一致，见 `explore-content-types.openapi.yaml`） |
| `methodology_preview` | 详情/公开页在 EN locale 下返回 **英文** 的 `core_problem` / `core_viewpoints` / `judgment_principles`（或等价结构） |

---

## 2. 数据模型（Python / MySQL）

在 `book_experts`（或等价表）增加 **canonical + 英文展示**（二选一实现策略，推荐 **A**）：

### 策略 A（推荐）：双语文本列

| 列 | 类型 | 说明 |
|----|------|------|
| `expert_name` | `VARCHAR` | 主展示名（创建时语言，通常与 `ui_locale` 一致） |
| `expert_name_en` | `VARCHAR NULL` | 英文展示名；`ui_locale=en` 创建时与 `expert_name` 相同；`ui_locale=zh` 时在蒸馏流水线末尾 **LLM 翻译或英文蒸馏** 写入 |
| `expert_name_zh` | `VARCHAR NULL` | 中文展示名；主字段为英文时写入（蒸馏或 backfill） |
| `book_title` | `VARCHAR NULL` | 书名（原文） |
| `book_title_en` | `VARCHAR NULL` | 英文书名（同上） |
| `book_title_zh` | `VARCHAR NULL` | 中文书名（主字段为英文时） |
| `methodology_preview_json` | `JSON NULL` | 见 §2.1 |

**历史数据**：`expert_name_en` / `book_title_en` 为空时，读接口在 `locale=en` 时可 **按需翻译一次并回写**（异步 job），或同步翻译（需超时控制）。

### 策略 B：仅 canonical + 运行时解析

不增列；每次 `GET` 带 `locale=en` 时后端翻译/检索缓存。需 **Redis 缓存** `expert_id + locale + field` → 译文，避免重复 LLM。

前端已兼容策略 A 字段名（ snake_case + camelCase 见 §4）。

### 2.1 `methodology_preview` JSON

与现有 `BookExpertMethodologyPreview` 对齐，建议存 **双语** 或 **分 locale 键**：

```json
{
  "zh": {
    "core_problem": "…",
    "core_viewpoints": ["…"],
    "judgment_principles": ["…"]
  },
  "en": {
    "core_problem": "…",
    "core_viewpoints": ["…"],
    "judgment_principles": ["…"]
  }
}
```

**读接口**：根据 `locale` **只展开对应语言** 为顶层对象（与现网单语结构兼容）：

```json
{
  "methodology_preview": {
    "core_problem": "…",
    "core_viewpoints": ["…"],
    "judgment_principles": ["…"]
  }
}
```

---

## 3. Query 参数（列表 / 详情 / 公开页）

所有返回 `expert` / `experts[]` 的 GET 接口统一支持：

| 参数 | 类型 | 说明 |
|------|------|------|
| `locale` | string | BFF 约定：`zh-CN` \| `en`（前端 `resolveApiLocale()`） |
| `ui_locale` | string | 简写：`zh` \| `en`（前端 localStorage `pr_locale`） |

**解析优先级**：`ui_locale` > `locale` > 默认 `zh`。

Java BFF：从 query 或 `Accept-Language` 转发到 Python；**不要**丢弃前端已传的 query。

---

## 4. API 响应契约

### 4.1 字段（summary / detail 共用）

| 字段 | 说明 |
|------|------|
| `expert_id` | 不变 |
| `expert_name` | **当前 locale 下的展示名**（推荐：服务端已解析，前端直接渲染） |
| `book_title` | **当前 locale 下的书名** |
| `expert_name_en` / `book_title_en` | 可选；`ui_locale=en` 时优先展示 |
| `expert_name_zh` / `book_title_zh` | 可选；主字段为英文时 `ui_locale=zh` 优先展示 |
| `topic_category_id` | slug |
| `topic_category_name` | **当前 locale** 下分类名（来自 Feed catalog，非写死中文） |
| `methodology_preview` | **当前 locale** 下预览（§2.1） |

**camelCase**：BFF 与 Python 至少一种风格稳定；前端类型已预留 `expertNameEn`、`bookTitleEn`。

### 4.2 `GET /book-experts/public`

- 现有：`userId`、`exclude_own=1`、分页、`topicCategoryId`（见 `book_expert_topic_category_spec.md` §3.3）
- **新增行为**：带 `ui_locale=en` 时，`experts[].expert_name` / `book_title` 为英文（策略 A 或 B）
- **匿名**：不得要求 JWT 才返回英文字段

### 4.3 `GET /book-experts/{expertId}`

- 公开专家：匿名可读；`methodology_preview` 随 locale 切换
- 私有专家：owner 可读；locale 同样生效

### 4.4 `GET /book-experts/mine`

- 与 public 相同 locale 规则（侧栏「我的专家」历史）

### 4.5 `POST /book-experts/distill`（SSE）

- 请求体 **`uiLocale`**（已有）：流水线 **生成 summary 时** 写入对应语言的 `expert_name` / `book_title` / `methodology_preview`
- `expert_created` 事件中 `expert` 对象应已含 **英文字段**（若 `uiLocale=en`）或 **中英双字段**（若 `uiLocale=zh` 且策略 A 会异步补 `*_en`）

---

## 5. Java BFF

1. **透传** query：`locale`、`ui_locale`、`userId`、`exclude_own` 等至 Python。
2. 路由前缀：`/api2/book-experts/*`（与现有 book-expert 一致）。
3. 不在 BFF 层 **覆盖** Python 已解析的 `expert_name`；若 BFF 做 envelope  unwrap，保持 expert 子对象字段完整。
4. （可选）对 **未实现** Python locale 的版本：BFF 短期内在 `ui_locale=en` 时调用内部 translate — **仅作过渡**，应以 Python 持久化为准。

---

## 6. 蒸馏流水线（Python）

1. 读取 `uiLocale` / `ui_locale`（与 `DistillRequest.uiLocale` 对齐）。
2. 生成方法论、专家名、书名时使用 **目标语言** 作为主字段；若主字段为中文且产品要求英文副本，在同一事务或 follow-up job 写入 `*_en`。
3. 公开到社区后，英文首页依赖 `GET /public?ui_locale=en`，**不应**再依赖用户登录。

---

## 7. 前端现状与对接（供联调）

| 能力 | 状态 |
|------|------|
| 请求 public/detail 时带 `locale` + `ui_locale` | 已实现（`bookExpert.ts`） |
| 读取 `expert_name_en` / `book_title_en` / `*_zh` | 已实现（`withBookExpertDisplayFields`） |
| 工作区专家聊天标题 `be-chat__title` | 已实现：`BookExpertChat` 按 locale 拉详情 + `localizeBookExpertSummaries` |
| 探索广场卡片标题 | 已实现：`BookExpertExplore` 列表本地化 |
| 英文 UI 下 CJK → 批量翻译 en；中文 UI 下拉丁文 → 批量翻译 zh-CN | 已实现但 **401 未登录失败** → 依赖 §4 |
| 翻译失败兜底 | 英文 UI：主题分类 + `Book expert`；中文 UI：保留原文 |

**联调验收**（`ui_locale=en`，**未登录**）：

```http
GET /api2/book-experts/public?ui_locale=en&locale=en
```

任取一条 `visibility=public` 的专家：`expert_name`、`book_title` 应为英文（或与书一致的拉丁字符），且 **不含** 仅中文且无 `_en` 兜底的情况。

---

## 8. 相关文档

- 主题分类：`book_expert_topic_category_spec.md`（`topic_category_name` 应随 locale 解析）
- 会话隐私：`book_expert_session_privacy_spec.md`
- Feed 分类 `name` / `nameEn`：`docs/api/explore-content-types.openapi.yaml` → `TopicCategory`
- 前端翻译（非 book-expert 专用）：`docs/api/immersive-web-translation.openapi.yaml` → `/translate/batch`

---

## 9. 实现优先级建议

1. **P0**：`GET /public`、`GET /{id}` 在 `ui_locale=en` 下返回英文 `expert_name` / `book_title`（策略 A 列或运行时缓存）。
2. **P1**：`methodology_preview` 双语存储 + 按 locale 展开。
3. **P1**：`topic_category_name` 从 Feed catalog 按 locale 解析，去掉仅中文冗余。
4. **P2**：历史专家批量 backfill `*_en` 异步任务。

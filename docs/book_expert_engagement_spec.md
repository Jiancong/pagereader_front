# Book Expert 打开数 / 点赞 — 后端实现 Spec

> **读者**：Python（`book_expert`）+ Java BFF（`pagereader_backend`）  
> **前端**：`BookExpertExplore.vue`、`BookExpertShowcaseSection.vue`、`BookExpertEngagementRow.vue`、`bookExpert.ts`  
> **对齐**：探索作品流 `viewCount` + `favoriteCount` / `likedByMe`（`ExploreGrid.vue`、`feed.ts`）

---

## 1. 产品语义

| 指标 | 含义 | 何时 +1 |
|------|------|---------|
| **open_count**（打开数） | 用户**进入**该专家的一次有效会话（工作区专家聊天、公开专家页首次加载） | `POST .../open/increment` |
| **like_count**（点赞数） | 用户对该公开专家点赞（可取消） | `POST .../like` action=`click` / `unclick` |
| **liked_by_me** | 当前请求用户是否已点赞 | 列表/详情在 **带 userId** 时返回 |

与作品流区别：专家无 Feed item id，统计挂在 **`expert_id`** 上。

---

## 2. 数据模型（建议）

表 `book_expert_stats`（或 Redis + 异步落库）：

| 列 | 类型 | 说明 |
|----|------|------|
| expert_id | PK / FK | |
| open_count | int unsigned | 默认 0 |
| like_count | int unsigned | 默认 0 |

表 `book_expert_likes`：

| 列 | 类型 | 说明 |
|----|------|------|
| expert_id | | |
| user_id | | UNIQUE(expert_id, user_id) |

---

## 3. API（BFF 路径前缀与现有 `/book-experts` 一致）

### 3.1 列表/详情附加字段

在 `BookExpertSummary` JSON 中增加（snake_case，BFF 可双写 camelCase）：

```json
{
  "expert_id": "...",
  "open_count": 12,
  "like_count": 3,
  "liked_by_me": false
}
```

适用：

- `GET /book-experts/public?userId=&locale=&ui_locale=`
- `GET /book-experts/mine?userId=`
- `GET /book-experts/{expertId}?userId=`

未登录：`liked_by_me` 省略或 `false`；`open_count` / `like_count` 仍返回。

### 3.2 打开 +1

```
POST /book-experts/{expertId}/open/increment
Query: userId?（可选，用于去重/分析）
Response 200:
{
  "ok": true,
  "open_count": 13
}
```

- 允许匿名（与 `POST /project/{id}/view/increment` 类似），需 IP/用户维度防刷（如 5 分钟同 expert 同 visitor 只计 1 次）。
- 专家须 `visibility=public` 或请求者为 owner（私有专家仅 owner 打开可计或不暴露接口）。

### 3.3 点赞

```
POST /book-experts/{expertId}/like
Body: { "userId": "...", "action": "click" | "unclick" }
Response 200:
{
  "ok": true,
  "like_count": 4,
  "liked_by_me": true
}
```

- **需登录**；`userId` 与 token 一致。
- 仅 **public** 专家可点赞。

---

## 4. 前端行为（已实现）

| 场景 | 行为 |
|------|------|
| 探索卡片 | 展示 Eye + `open_count`，Heart + `like_count`；点心形 `stopPropagation`，不触发进入聊天 |
| 进入专家聊天 | `incrementExpertOpen`（404/501 静默，计数保持列表值） |
| 后端未上线 | 计数显示 `0`；点赞提示登录或接口错误 |

---

## 5. 验收

- [ ] 公开列表返回非负 `open_count` / `like_count`
- [ ] 登录用户点赞后列表 `liked_by_me` 与计数正确
- [ ] 打开 increment 后同会话刷新列表计数增加
- [ ] 英文 UI 字段名不影响（仅数字展示）

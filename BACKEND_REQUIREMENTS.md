# 后端接口需求清单

> @author hc @date 2026-06-04
>
> 前端（page2.top）浏览器直连后端。所有路径前端会自动加 `/api2` 前缀；鉴权统一放 `Authorization: <JWT>` 头（无 `Bearer` 前缀）。

## 0. 全局要求（最优先）

| 项 | 要求 |
|----|------|
| CORS | 见 **§0.1**（含 `www` 子域与预检验收） |
| 统一响应 | JSON 接口返回 `{ code, message, data }`，`code=0` 成功，非 0 为业务错误 |
| 401 | token 失效返回 HTTP 401，前端清 token 并提示重新登录 |

### 0.1 CORS（Google 登录 403 根因）

**现象**：用户从 `https://www.page2.top` 打开站点，前端请求 `https://page2.top/api2/...` 时，浏览器先发 **OPTIONS 预检**；当前预检返回 **403**，导致 `POST /google/login` 等接口无法调用。

**根因**：前端页面 Origin 为 `https://www.page2.top`，与 API 域名 `https://page2.top` 不同，属于跨域；后端 CORS 未放行 `www` 来源，或 **Spring Security / 网关拦截了 OPTIONS**。

**后端需实现**：

| 项 | 要求 |
|----|------|
| 允许来源（Allow-Origin） | `https://page2.top`、`https://www.page2.top`、`http://localhost:3000`（开发） |
| 允许方法 | `GET`、`POST`、`PUT`、`DELETE`、`OPTIONS` |
| 允许请求头 | `Authorization`、`Content-Type`、`X-Project-Id`、`X-Session-Id` |
| 预检 OPTIONS | 对 `/api2/**`（含 `/api2/google/login`）返回 **HTTP 200 或 204**，**不得 403** |
| Allow-Credentials | 若前端带 Cookie / 凭证，需 `Access-Control-Allow-Credentials: true`，且 Allow-Origin **不能** 用 `*`，须回显具体 Origin |
| 鉴权链 | **OPTIONS 请求不走 JWT 校验**；Security 配置中显式 `permitAll()` 或 `cors().and()` 处理预检 |

**Spring Boot 参考（示意，按项目现有结构改）**：

```java
// WebMvcConfigurer 或 CorsConfigurationSource
registry.addMapping("/api2/**")
    .allowedOrigins(
        "https://page2.top",
        "https://www.page2.top",
        "http://localhost:3000")
    .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
    .allowedHeaders("Authorization", "Content-Type", "X-Project-Id", "X-Session-Id")
    .allowCredentials(true)
    .maxAge(3600);
```

**验收命令**（部署后必须通过）：

```bash
# 1) www 来源预检 — 须 200/204，响应头含 Access-Control-Allow-Origin: https://www.page2.top
curl -i -X OPTIONS "https://page2.top/api2/google/login" \
  -H "Origin: https://www.page2.top" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"

# 2) apex 来源预检 — 同样通过
curl -i -X OPTIONS "https://page2.top/api2/google/login" \
  -H "Origin: https://page2.top" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"

# 3) 本地开发
curl -i -X OPTIONS "https://page2.top/api2/google/login" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization"
```

**说明（给后端，非本仓库改动）**：

- 前端生产环境 `VITE_API_URL=https://page2.top`；用户可能从 **www** 或 **apex** 任一域名进入，两 Origin 都须放行。
- Nginx 层做 www→apex 301 可减轻跨域，但 **不能替代** 后端 CORS；只要存在跨域 API 调用，后端就必须正确响应 OPTIONS。
- Google OAuth：除 CORS 外，Google Cloud Console「已授权的 JavaScript 来源」需同时包含 `https://page2.top` 与 `https://www.page2.top`（前端 Google 按钮所在页面域名）。

## 1. 认证（多数已存在，确认即可）

| 方法 | 路径 | 入参 | 返回 data | 说明 |
|------|------|------|-----------|------|
| POST | `/password/login` | `{username, password}` | JWT 字符串 | 已有 |
| POST | `/google/login` | `{googleEmail}` | JWT 字符串 | 已有，确认按邮箱登录/自动注册 |
| POST | `/user/userSignUp` | `{email,password,nickName?}` | 任意 | 注册不返回 JWT，前端注册后再调 `/password/login`；若能直接返回 JWT 更好 |
| GET | `/user/current/detail` | - | `{id,email,nickName,...}` | 必须返回 `id`，前端用作 `userId` |

## 2. 【新增】我的历史项目列表

侧边栏「我的历史」依赖，目前没有，需新建：

```
GET /api2/project/user/list?page={0基页码}&size={每页条数}
Header: Authorization: <JWT>
返回 data: Spring Page<ProjectVo>
  { content:[...], totalElements, totalPages, number, size, first, last }
排序：按 updateTime 倒序
内容：仅当前登录用户自己的项目
```

`ProjectVo` 至少含：`id`、`name`（或 `title`）、`updateTime`，可选 `thumbnailUrl`/`description`。

### 2.1 【核心】上传资料并开始分析 → 自动创建/更新 Project（Chat）

**产品预期**：用户在工作区「上传资料 → 分析并生成」后，左侧「我的历史」应立刻出现一条以**书名/文件名**命名的会话；点击可回看对话与生成结果。

**现状（前端已做）**：

- 每次生成前，前端在浏览器生成 `projectId`（UUID），写入 `POST /agent/chat-stream` 的 body。
- 上传文档走 OSS 直传，完成后得到 `{ url, name, type }`，随 `uploaded_documents` 一并传给 chat-stream。
- 侧边栏通过 `GET /project/user/list` 拉列表；**后端若未落库 Project，列表永远为空**。
- 生成结束后前端**尚未**自动刷新列表（后端就绪后前端会补 `loadProjects()`）。

**后端必须配合（按优先级）**：

#### A. 收到 chat-stream 时 upsert Project + 写入首条对话

当 `POST /agent/chat-stream` body 含 `projectId` 且用户已登录时：

| 步骤 | 要求 |
|------|------|
| 1. 创建/更新 Project | `id = body.projectId`（与前端 UUID 一致）；`userId = JWT 用户`；`updateTime = now` |
| 2. 项目标题 `name` | **优先** `uploaded_documents[0].name` 去扩展名（如 `深度学习.pdf` → `深度学习`）；无文档时用 `message` 截断；生成完成后可用 PPT `title` 覆盖 |
| 3. 写入对话 | 同一 `projectId` 下追加 user 消息（content=message，可存 uploaded_documents 元数据）；assistant 进度/最终结果也写入 conversation 表 |
| 4. 权限 | 仅 project owner 可 list / get / history |

**chat-stream 请求体（前端实际发送，请对齐）**：

```json
{
  "message": "请根据上传的文档《深度学习.pdf》生成 PPT...",
  "userId": "1",
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "sessionId": "sess-xxx",
  "isAgent": true,
  "queue": "SLOW",
  "uploaded_documents": [
    { "url": "https://.../book.pdf", "name": "深度学习.pdf", "type": "pdf" }
  ]
}
```

可选增强字段（前端可后续加）：`projectName`（显式标题，避免后端重复解析文件名）。

#### B. complete 事件持久化 PPT 并回传同一 projectId

`event: complete` / `ppt_complete` 的 data 除 PptData 外必须带 **`projectId`（与请求 body 相同）**：

```json
{
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "深度学习入门",
  "total_slides": 12,
  "slides": [ ... ],
  "ppt_data_url": "https://.../deck.json"
}
```

后端需：将 PPT 产物（inline 或 OSS URL）关联到该 `projectId`；可选更新 `Project.name = title`；更新 `thumbnailUrl`（首屏截图或首 slide 图）。

#### C. 历史列表与详情可读

| 接口 | 要求 |
|------|------|
| `GET /project/user/list` | 分析开始后即可查到（不必等 complete）；`name` 为书名 |
| `GET /project/{id}` | 返回 ProjectVo；owner 校验 |
| `GET /project/{id}/conversation/history` | 按 sequence 返回 user/assistant 消息；assistant 消息若含 PPT，建议 `imageUrls` 或扩展字段带预览图 / ppt_data_url |

#### D. （可选）上传完成时绑定素材到 Project

`POST /file/user/direct-upload/complete` 可增加可选字段 `projectId`，写入 `ProjectAsset`，便于「我的资源」与历史项目关联。当前前端**未传** projectId，可二期再做。

#### 验收用例

1. 登录 → 工作区上传 `某某书.pdf` → 点「分析并生成」。
2. **不等待生成结束**，调用 `GET /project/user/list`，`content` 中应出现 `name: "某某书"`（或去后缀后的书名），`id` 等于请求里的 `projectId`。
3. 生成结束后 `GET /project/{id}/conversation/history` 至少有 user + assistant 记录；`complete` 里的 `projectId` 与列表 `id` 一致。
4. 刷新页面后侧边栏仍能看到该条历史。

---

## 3. Agent 流式生成（核心）

```
POST /api2/agent/chat-stream   （SSE，Content-Type: text/event-stream）
Header: Authorization；划词追问时附加 X-Project-Id / X-Session-Id
Body: {
  message: string,
  userId: string,          // 来自 /user/current/detail 的 id
  projectId: string,       // 【必填】前端生成的 UUID，用于 Project / 历史 / 分享
  sessionId: string,       // 浏览器生成的稳定会话 id
  isAgent: true,
  queue?: "FAST" | "SLOW",  // 队列：FAST 60 积分/次，SLOW 30 积分/次
  uploaded_documents?: [{ url, name, type }]
}
```

SSE 事件（前端按 `event:` 名分发）：

| event 名 | data | 前端行为 |
|----------|------|----------|
| `progress` 或 `ppt_progress` | `{status, message}` 或字符串 | 显示进度文案 |
| `complete` | PptData，或 `{pptData, projectId}` | 渲染 PptViewer |
| `error` | `{message}` 或字符串 | 弹错误 |

**关键：`complete` 的 data 必须符合 PptData 结构，并额外带 `projectId`：**

```ts
{
  title: string,
  subtitle?: string,
  theme?: string,
  palette?: {...},
  chapter_images?: [...],
  total_slides: number,
  slides: [ { layout, title, content, chart?, table?, ... } ],
  projectId: string        // 用于分享链接与历史关联
}
```

> 请提供一条真实的 complete 报文样例，以便精确对齐字段。

## 4. OSS 直传（已对接，确认即可）

| 方法 | 路径 | 入参 | 返回 data |
|------|------|------|-----------|
| POST | `/file/user/direct-upload/token` | `{originalName, contentType, fileSize}` | `{uploadUrl, method:"PUT", uploadHeaders, fileKey, fileUrl}` |
| POST | `/file/user/direct-upload/complete` | `{fileKey, originalName, contentType, fileSize}` | `{fileLink}` |

- OSS bucket `aidesigns` 的跨域来源需包含 `https://page2.top`（阿里云控制台配置，非后端代码）。

## 5. Explore / 项目预览（已存在，确认即可）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/www/model/feed/stream` | `{page,pageSize,sort}` → `{page,total,pageSize,data:[FeedItem]}`；匿名可访问；item 需含 `id/projectId/name/imageUrl/imageUrls/authorNickname/viewCount/favoriteCount` |
| GET | `/project/{id}` | 项目详情 `ProjectVo` |
| GET | `/project/{id}/conversation/history` | `[{id,role,content,imageUrls,...}]`，图片放 `imageUrls`，前端用于预览 |

> 前端已按 [`FRONTEND_INTEGRATION.md`](FRONTEND_INTEGRATION.md) §7 处理：有 `projectId` 才打开 `/project/{id}`；manifest 无 `projectId` 时走「新建生成」而非误用数字 `id`。

## 6. 划词追问（PptViewer 内置，可选）

PptViewer 的「划词追问」也走 `POST /api2/agent/chat-stream`，并带 `X-Project-Id` / `X-Session-Id` 头。不需要该功能可忽略；需要则确认接口能处理此类上下文请求。

---

## 7. 【新增/确认】定价套餐与微信扫码（`recurringMonthHkd`）

前端定价页 **PayPal 用美元、微信用港币**，两套标价需后端分别提供。微信弹窗**实付金额**以创建订单返回的 `totalFee`（港分）为准，须与 `recurringMonthHkd` 一致。

### 7.1 `GET /api2/pricing/plans`

返回 `R<PricingPlan[]>`（或 `{ plans: [...] }`，前端已兼容）。

每个套餐 `monthly` 对象需同时支持：

| 字段 | 类型 | 单位 | 用途 |
|------|------|------|------|
| `recurringMonth` | number | **美元** | PayPal 订阅展示与扣款（已有） |
| `recurringMonthHkd` | number | **港币元** | 微信支付按钮旁标价、运营对齐 |

**示例**（测试包 + 正式包）：

```json
{
  "code": 0,
  "data": [
    {
      "planType": "TEST",
      "displayName": "测试包",
      "visible": true,
      "recommended": false,
      "monthly": {
        "recurringMonth": 0.01,
        "recurringMonthHkd": 0.08
      },
      "credits": { "monthlyFastCredits": 10 },
      "highlights": ["用于联调微信支付"],
      "paypalPlanIds": []
    },
    {
      "planType": "STARTER",
      "displayName": "体验包",
      "visible": true,
      "monthly": {
        "recurringMonth": 9.9,
        "recurringMonthHkd": 68
      },
      "credits": { "monthlyFastCredits": 300 },
      "paypalPlanIds": ["P-xxx"]
    }
  ]
}
```

**规则**：

- `recurringMonthHkd` 为**正数，最多 2 位小数**（如 `68`、`68.00`、`0.08`）。
- 免费档 `FREE` 可省略 `monthly` 或 `recurringMonthHkd: 0`。
- 仅微信、不走 PayPal 的套餐也须填 `recurringMonthHkd`；`recurringMonth` 可填对标美元或 `0`。
- 若缺 `recurringMonthHkd`，前端会临时用 `recurringMonth × VITE_USD_HKD_RATE` **估算**并标「约合」，**不推荐**作为正式售价。

### 7.2 `POST /api2/wechat-subscription/create`

```
Query: userId, planType, billingCycle=MONTHLY
Header: Authorization: <JWT>
返回 data:
{
  "orderId": "wx-order-xxx",
  "qrCode": "weixin://wxpay/...",
  "totalFee": 8
}
```

| 字段 | 要求 |
|------|------|
| `totalFee` | **微信支付 `total_fee`，单位：港分（整数）**；`totalFee = round(recurringMonthHkd × 100)` |
| `qrCode` | 微信 Native 扫码链接或可被前端生成二维码的 payload |
| `orderId` | 用于 `GET /wechat-subscription/payment/{orderId}` 轮询 |

**与 `recurringMonthHkd` 对齐（必验）**：

| `recurringMonthHkd` | `totalFee`（港分） | 用户扫码看到 |
|---------------------|-------------------|--------------|
| `0.08` | `8` | HK$0.08 |
| `68` | `6800` | HK$68.00 |
| `68.88` | `6888` | HK$68.88 |

> 常见错误：`recurringMonthHkd=8` 却返回 `totalFee=8`（8 港分 = HK$0.08）。**港币元与港分勿混用。**

创建订单时后端应：

1. 按 `planType` 读取配置中的 **`recurringMonthHkd`（港币元）**，勿用 `recurringMonth`（美元）直接当 `totalFee`。
2. `totalFee = (int) Math.round(recurringMonthHkd * 100)`。
3. 与微信下单 API 使用同一金额。

### 7.3 `GET /api2/wechat-subscription/payment/{orderId}`

```
返回 data 可为对象或状态字符串，前端均兼容，例如：
{ "paymentStatus": "SUCCESS" }
或
"SUCCESS"
```

| 字段（任选其一） | 成功取值 | 进行中 | 失败 |
|------------------|----------|--------|------|
| `paymentStatus` / `status` / `payment_status` | `SUCCESS`、`PAID`、`COMPLETED` | `PENDING` | `FAILED`、`CLOSED`、`CANCELLED` |
| `paid` / `success` | `true` | — | — |

支付成功后须入账套餐积分（与 PayPal 订阅成功逻辑一致），前端会调 `GET /subscribe/my/status` 刷新余额。

### 7.4 前端使用方式（供联调）

| 场景 | 前端行为 |
|------|----------|
| 定价卡微信按钮下 | 有 `recurringMonthHkd` → 显示 `{price} / 月`；无则美元×汇率显示「约合」 |
| 扫码弹窗 | 仅展示 `create` 返回的 `totalFee` 换算：`HK$(totalFee/100)` |
| PayPal | 仍用 `recurringMonth`（USD），与微信无关 |

### 7.5 验收用例

1. `GET /pricing/plans` 中测试包 `monthly.recurringMonthHkd = 0.08`。
2. `POST /wechat-subscription/create?planType=TEST` 返回 `totalFee: 8`。
3. 弹窗显示 **HK$0.08**，扫码金额与微信收银台一致。
4. 体验包 `recurringMonthHkd: 68` → `totalFee: 6800` → 显示 **HK$68.00**。
5. 支付成功后 `GET /subscribe/my/status` 积分增加。

---

## 最需先做

1. **chat-stream 收到请求时**：按 `projectId` upsert Project，标题取 `uploaded_documents[0].name`（去后缀），并写入首条 user 对话（见 **2.1**）
2. 新增 `GET /api2/project/user/list`（第 2 节），且分析开始后列表即可查到
3. 规范 `chat-stream` 的 `complete` 返回 PptData + **同一** `projectId`（第 3 节），并提供真实样例
4. `GET /project/{id}/conversation/history` 能返回该次上传分析的完整对话

**前端集成**：见 [`FRONTEND_INTEGRATION.md`](FRONTEND_INTEGRATION.md) §2.1 / §10（chat-stream 发出后刷新历史、Explore 打开规则等，**已实现**）。

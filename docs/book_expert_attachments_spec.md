# Book Expert 补充附件 — 后端实现 Spec

> **读者**：Python（`ai-design-poster` / `book_expert`）+ Java BFF + 文件服务（OSS 直传 / 用户配额）  
> **目标**：Owner 在专家聊天页上传**补充资料**，与蒸馏原书并列纳入 **book_expert 对话 RAG**；上传体积计入**账号云空间**（与 `POST /file/user/direct-upload/*` 一致）。  
> **前端**：`BookExpertAttachmentsPanel.vue`、`bookExpertApi.list/add/deleteExpertAttachment`、`fileApi.uploadDocument`

---

## 0. 产品规则

| 场景 | 期望 |
|------|------|
| 谁可上传 / 查看列表 / 删除 | 仅 **专家 owner**（`owner_user_id === JWT userId`） |
| 访客与公开专家对话 | **不**展示附件列表 UI；回答时 **自动**合并已索引的补充附件（与方法论 skill 一起检索） |
| 文件类型 | 与蒸馏 / PPT 文档 RAG 一致：PDF、EPUB、MOBI、Word、TXT、Markdown 等（前端 `validatePptDocumentFile`） |
| 单文件大小 | ≤ **50 MB**（与前端 `PPT_DOC_MAX_BYTES` 一致；直传 token 阶段也应拒绝更大文件） |
| 数量上限 | 建议 **10** 个 / 专家（前端常量；后端 `413` 或 `400 ATTACHMENT_LIMIT`） |
| 云空间 | 走现有 **用户 OSS 直传 + complete** → `user_files` / 统计表 **`usedBytes += fileSize`**；删除附件时 **`usedBytes -= fileSize`**（无其他引用时删 OSS 对象） |
| 原书 | 蒸馏阶段上传的 **source book** **不**重复计入附件列表；附件表只存 **post-distill 补充** |

---

## 1. 现状与缺口

| 组件 | 现状 | 缺口 |
|------|------|------|
| 蒸馏 `uploaded_documents` | 仅创建 expert 时用一次 | 无持久「补充附件」实体 |
| `file/user/direct-upload` | 已支持配额校验与 complete 入账 | 需在 complete 或登记附件时关联 `expertId`（可选 metadata） |
| `book_expert` chat handler | 方法论 + 原书索引 | 合并 `expert_attachments` 向量 / document_rag |
| BFF `/api2/book-experts/*` | cover / sessions / publish | **attachments CRUD 路由** |

---

## 2. 数据模型（MySQL）

表名建议：`book_expert_attachments`

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | BIGINT PK | 内部 id |
| `attachment_id` | VARCHAR(64) UNIQUE | 对外 id，如 `bea_{uuid}` |
| `expert_id` | VARCHAR(64) INDEX | FK → experts |
| `owner_user_id` | VARCHAR(64) INDEX | 冗余，便于配额审计 |
| `name` | VARCHAR(512) | 原始文件名 |
| `url` | VARCHAR(2048) | OSS HTTPS 地址（与 `uploaded_documents.url` 同构） |
| `type` | VARCHAR(32) | 扩展名 / 逻辑 type |
| `content_type` | VARCHAR(128) NULL | MIME |
| `file_key` | VARCHAR(512) | OSS key，删除与配额回滚用 |
| `file_size` | BIGINT | 字节数 |
| `status` | ENUM | `pending` \| `indexed` \| `failed` |
| `error_message` | TEXT NULL | 索引失败原因 |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

**索引 job**：`POST .../attachments` 写入行 `status=pending` 后异步（或同步）解析文本 → chunk → 写入专家专用 vector store / 与现有 document_rag 管道共用，key 含 `expert_id` + `attachment_id`。

**删除 expert**：CASCADE 删附件行并释放 OSS / 配额。

---

## 3. 云空间（配额）集成

与作品上传 **同一套** 逻辑（Java `FileController` / 用户存储服务）：

1. **上传**：前端 `getDirectUploadToken` → PUT OSS → `completeDirectUpload`  
   - `complete` 时 **`usedBytes += fileSize`**（已实现则复用）  
   - 建议在 complete body 或用户文件表增加可选字段：`source=book_expert_attachment`、`expertId`（便于审计与删除）

2. **登记附件**：`POST .../attachments` **不**再次上传二进制；校验 `url`/`file_key` 属于当前用户且已在 complete 中入账。

3. **删除附件**：`DELETE .../attachments/{id}`  
   - 删 DB 行 + 删 vector chunks  
   - 若 `file_key` 无其他引用 → `DELETE /file/user/file?fileKey=` 同等逻辑，`usedBytes -= file_size`

4. **预检**：`GET /file/user/storage/quota?incomingBytes=`（若已有）与前端 `ensureStorageQuotaForUpload` 对齐。

---

## 4. HTTP API（Python；BFF 前缀 `/api2/book-experts`）

### 4.1 `GET /book-experts/{expertId}/attachments`

**Query**：`userId`（BFF 以 JWT 为准）

**Auth**：owner only

**Response 200**：

```json
{
  "ok": true,
  "count": 1,
  "attachments": [
    {
      "attachment_id": "bea_xxx",
      "name": "补充案例.pdf",
      "url": "https://...",
      "type": "pdf",
      "content_type": "application/pdf",
      "file_size": 1048576,
      "file_key": "user-upload/...",
      "status": "indexed",
      "created_at": "2026-10-03T12:00:00Z"
    }
  ]
}
```

未实现时 BFF 可返回 **404**；前端视为空列表。

### 4.2 `POST /book-experts/{expertId}/attachments`

**Auth**：owner only

**Body**（与前端 `BookExpertAttachmentCreateReq` 一致）：

```json
{
  "userId": "123",
  "url": "https://...",
  "name": "补充案例.pdf",
  "type": "pdf",
  "fileKey": "user-upload/...",
  "fileSize": 1048576,
  "contentType": "application/pdf"
}
```

**逻辑**：

1. 校验 expert 存在且 owner  
2. 校验 `count < MAX_ATTACHMENTS`  
3. 校验 `fileKey` 归属 userId 且 size 匹配  
4. INSERT `pending` → 触发索引 → 成功则 `indexed`，失败则 `failed` + `error_message`  
5. Response 201：`{ "ok": true, "attachment": { ... } }`

### 4.3 `DELETE /book-experts/{expertId}/attachments/{attachmentId}`

**Auth**：owner only

**逻辑**：删索引 + DB + 条件删 OSS + 回滚配额

**Response**：`{ "ok": true, "attachment_id": "bea_xxx" }`

---

## 5. 对话 RAG 合并（Python `book_expert` handler）

在 `chat_stream` / book expert 分支中，构建检索上下文时：

1. 固定加载：**方法论 skill** + **蒸馏原书**（现有）  
2. 追加：`SELECT * FROM book_expert_attachments WHERE expert_id=? AND status='indexed'`  
3. 将附件 chunks 与上述来源 **同一检索器** 或 weighted merge（建议同等权重，可在 spec 二期调参）  
4. **不要**把附件列表或全文暴露给非 owner API；仅影响生成内容  

无需在 `chat_stream` 请求体再传 `uploaded_documents`（附件已绑定 expert）。

---

## 6. Java BFF

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api2/book-experts/{expertId}/attachments` | JWT → userId |
| POST | `/api2/book-experts/{expertId}/attachments` | JSON 转发 Python |
| DELETE | `/api2/book-experts/{expertId}/attachments/{attachmentId}` | 同上 |

鉴权与现有 book-expert 路由一致（Cookie `pr_token` / `Authorization`）。

---

## 7. 安全与隐私

- 附件 URL 应为 **用户私有 OSS** 或带鉴权 CDN；公开专家访客 **不能**通过列表 API 批量下载他人上传的 raw 文件（若 URL 易泄露，建议 RAG 只用内网/get 签名 URL）。  
- Owner 在 UI 可「打开」链接 — 与资源库一致。  

---

## 8. 前端联调清单

- [ ] Owner 上传 → 列表出现 → `status` 从 `pending` → `indexed`  
- [ ] 提问专家 → 回答能引用附件内容（人工验证）  
- [ ] 删除附件 → 列表消失 → 配额 `remainingBytes` 增加  
- [ ] 超配额 → 直传 token 或 complete 拒绝；前端提示 `attachmentsQuotaExceeded`  
- [ ] 第 11 个附件 → `400`  

---

## 9. 相关文件（前端）

| 文件 | 说明 |
|------|------|
| `src/components/workspace/BookExpertAttachmentsPanel.vue` | 主题分类下方的附件区 |
| `src/api/bookExpert.ts` | list / add / delete |
| `src/api/file.ts` | `uploadDocument`（直传 + 配额入账） |
| `src/utils/storageQuotaCheck.ts` | 上传前预检 |

# 补充附件（作品 + 书籍专家）— 后端实现 Spec

> **读者**：Java BFF（`pagereader-backend`）+ Python（Agent / `book_expert` / RAG）+ 文件服务（OSS 直传 / 用户配额）  
> **前端仓库**：`pagereader_front`  
> **目标**：Owner 可为 **项目（PPT）** 或 **书籍专家** 登记补充文档；支持 **本地上传** 与 **从「我的资源」关联**；新上传计入云空间；登记后进入对应 **RAG 检索**。

---

## 0. 范围一览

| 绑定实体 | UI 入口 | BFF 路径前缀 | 表名（建议） | RAG 挂载点 |
|----------|---------|--------------|--------------|------------|
| **项目** | PptViewer Tab「补充附件」 | `/project/{projectId}/attachments` | `project_attachments` | 划词追问、`document_rag`、项目内相关搜索 |
| **专家** | BookExpertChat 补充附件区 | `/api2/book-experts/{expertId}/attachments` → Python | `book_expert_attachments` | `book_expert` `chat_stream`（方法论 + 原书 + 附件） |

两套 API **形态一致**（GET 列表 / POST 登记 / DELETE），差异在鉴权主体与索引 namespace。

---

## 1. 共用产品规则

| 规则 | 说明 |
|------|------|
| 文件类型 | PDF、EPUB、MOBI、Word、TXT、Markdown 等（前端 `validatePptDocumentFile` / `isPptDocumentAsset`） |
| 单文件 | ≤ **50 MB**（`PPT_DOC_MAX_BYTES`；直传 token 阶段也应拒绝更大） |
| 数量上限 | **10** / 项目或 / 专家（前端常量；超出 `400 ATTACHMENT_LIMIT`） |
| 登记方式 A：**新上传** | 前端：`ensureStorageQuotaForUpload` → `direct-upload` → `complete`（**`usedBytes += fileSize`**）→ `POST .../attachments` 只提交元数据 |
| 登记方式 B：**资源库关联** | 文件已在 `GET /file/user/files`；`POST .../attachments` 带已有 `fileKey` → **不得**再次 `usedBytes += fileSize`；校验 user 归属 + 同一 entity 未重复 `file_key` |
| POST 共性 | **不传二进制**；校验 `fileKey`/`url` 属于 JWT user 且已在 complete 入账（方式 B 仅校验归属） |
| 删除 | 删 DB + 删 vector chunks；若 `file_key` 无其他引用 → 删 OSS + **`usedBytes -= file_size`** |
| 状态 | `pending` → 索引 job → `indexed` 或 `failed`（+ `error_message`） |

### 1.1 权限差异

| | 项目 | 专家 |
|---|------|------|
| 写操作 | **项目 owner** | **专家 owner**（`owner_user_id`） |
| 列表 UI | 当前仅 workspace owner | 仅 owner |
| 访客 | 社区公开项目只读列表（**二期**） | 公开专家：**不**给列表 API；对话 **自动**合并已索引附件 |

### 1.2 专家特有

- 蒸馏 **原书** 不在附件表重复展示；表内仅 **post-distill 补充** 资料。

---

## 2. 共用请求/响应模型

### 2.1 附件 JSON（列表项 / `attachment`）

```json
{
  "attachment_id": "pa_xxx | bea_xxx",
  "name": "参考文献.pdf",
  "url": "https://...",
  "type": "pdf",
  "content_type": "application/pdf",
  "file_size": 1048576,
  "file_key": "user-upload/...",
  "status": "indexed",
  "error_message": null,
  "created_at": "2026-10-03T12:00:00Z"
}
```

（可同时返回 camelCase：`attachmentId`、`fileKey`、`fileSize`、`contentType`。）

### 2.2 `POST .../attachments` Body（前端 `SupplementaryAttachmentCreateReq`）

```json
{
  "userId": "123",
  "url": "https://...",
  "name": "参考文献.pdf",
  "type": "pdf",
  "fileKey": "user-upload/...",
  "fileSize": 1048576,
  "contentType": "application/pdf"
}
```

**服务端逻辑（共用）**

1. 校验 entity 存在且 caller 为 owner  
2. `count < 10`  
3. 校验 `fileKey` 归属 `userId`，`fileSize` 与库中一致（允许 0 若历史无 size）  
4. 同一 `(entity_id, file_key)` 不可重复 INSERT  
5. INSERT `status=pending` → 异步索引 → `indexed` / `failed`  
6. Response **201**：`{ "ok": true, "attachment": { ... } }`

### 2.3 列表 Response

```json
{ "ok": true, "count": 1, "attachments": [ /* §2.1 */ ] }
```

未实现：**404**（前端：空列表 + 可选「接口待上线」；列表失败时显示错误文案）。

### 2.4 删除 Response

```json
{ "ok": true, "attachment_id": "pa_xxx" }
```

---

## 3. 云空间与文件服务（共用）

依赖现有 **`/file/user/direct-upload/*`**、**`GET /file/user/storage/quota`**、**`GET /file/user/files`**。

| 步骤 | 行为 |
|------|------|
| 新文件上传 | complete 时入账；可选 metadata：`source=project_attachment|book_expert_attachment`、`projectId` / `expertId` |
| POST 登记 | 不二次上传、不二次入账（资源库关联） |
| DELETE 附件 | 无其他引用时等同 `DELETE /file/user/file?fileKey=` 的配额回滚 |

---

## 4. 数据模型（MySQL）

两表结构对齐，仅 FK 不同。

### 4.1 `project_attachments`

| 列 | 类型 | 说明 |
|----|------|------|
| `attachment_id` | VARCHAR(64) UNIQUE | 建议前缀 `pa_` |
| `project_id` | VARCHAR(64) INDEX | FK → projects |
| `owner_user_id` | VARCHAR(64) INDEX | |
| `name`, `url`, `type`, `content_type`, `file_key`, `file_size` | | 同 §2.1 |
| `status`, `error_message`, `created_at`, `updated_at` | | |

**删项目**：CASCADE 附件；按引用删 OSS / 配额。

### 4.2 `book_expert_attachments`

| 列 | 类型 | 说明 |
|----|------|------|
| `attachment_id` | VARCHAR(64) UNIQUE | 建议前缀 `bea_` |
| `expert_id` | VARCHAR(64) INDEX | FK → experts |
| 其余列 | | 同 §4.1 |

**删专家**：CASCADE 附件。

### 4.3 索引 job（共用管道）

- 解析文档 → chunk → 写入 vector / `document_rag`  
- **项目**：key 含 `project_id` + `attachment_id`  
- **专家**：key 含 `expert_id` + `attachment_id`

---

## 5. HTTP API 路径

### 5.1 项目（BFF 现有 `/project` 或 `/api2/project`）

| 方法 | 路径 |
|------|------|
| GET | `/project/{projectId}/attachments` |
| POST | `/project/{projectId}/attachments` |
| DELETE | `/project/{projectId}/attachments/{attachmentId}` |

Auth：登录；写操作仅 **project owner**。

### 5.2 专家（BFF → Python）

| 方法 | BFF 路径 |
|------|----------|
| GET | `/api2/book-experts/{expertId}/attachments?userId=`（JWT 注入 userId） |
| POST | `/api2/book-experts/{expertId}/attachments` |
| DELETE | `/api2/book-experts/{expertId}/attachments/{attachmentId}` |

Auth：Cookie `pr_token` / `Authorization`；写操作仅 **expert owner**。

---

## 6. RAG 合并

### 6.1 项目

在划词追问、项目 `document_rag`、相关搜索中：

1. 保留现有：deck、markdown、对话历史  
2. 追加：`project_attachments` 且 `status=indexed`  
3. **无需** chat 请求体再传 `uploaded_documents`

### 6.2 专家

在 `book_expert` `chat_stream` 中：

1. 保留：**方法论 skill** + **蒸馏原书**  
2. 追加：`book_expert_attachments` 且 `status=indexed`  
3. 非 owner **无**列表 API；检索结果仅用于生成，不暴露 raw 批量下载

---

## 7. 安全

- 附件 URL：私有 OSS 或短期签名；公开场景避免长期裸链  
- 校验 JWT userId，忽略客户端伪造的 `userId` body（BFF 以 token 为准）

---

## 8. 联调清单

**共用**

- [ ] 本地上传 → 列表 → `pending` → `indexed`  
- [ ] 从资源库关联 → 不增加 `usedBytes` → 列表可见  
- [ ] 删除 → 配额回升（无引用时）  
- [ ] 超配额 → 直传/complete 拒绝  
- [ ] 第 11 个 → `400`  
- [ ] 重复同一 `fileKey` → `400`  

**项目**

- [ ] PptViewer Tab「补充附件」  
- [ ] 划词追问引用附件内容  

**专家**

- [ ] BookExpertChat 上传/关联  
- [ ] 对话回答引用附件  

---

## 9. 前端实现索引

| 文件 | 说明 |
|------|------|
| `SupplementaryAttachmentsPanel.vue` | `scope=project \| bookExpert`；上传 + 资源库 |
| `UserAssetDocumentPickerDialog.vue` | `listUserUploadedFiles` + 文档过滤 |
| `api/feed.ts` | `listProjectAttachments` / add / delete |
| `api/bookExpert.ts` | `listExpertAttachments` / add / delete |
| `api/file.ts` | `uploadDocument` |
| `utils/storageQuotaCheck.ts` | 仅 **新上传** 前预检 |
| `utils/pptDocumentRag.ts` | `supplementaryAttachmentBodyFromUserAsset` |
| `PptViewer.vue` | 补充附件 Tab |
| `BookExpertAttachmentsPanel.vue` | 专家页包装 |

---

## 10. 相关 Spec（非本文）

- 专家主题分类：[`book_expert_topic_category_spec.md`](book_expert_topic_category_spec.md)  
- 专家会话隐私：[`book_expert_session_privacy_spec.md`](book_expert_session_privacy_spec.md)

# 作品（PPT / 项目）补充附件 — 后端实现 Spec

> **读者**：Java BFF（`pagereader-backend`）+ Python Agent / RAG 服务 + 文件服务（OSS 直传 / 用户配额）  
> **目标**：Owner 在 **PptViewer**「补充附件」页上传有价值的参考文档；体积计入**账号云空间**（与 `POST /file/user/direct-upload/*` 一致）；**划词追问 / 项目内 RAG** 检索时合并附件内容。  
> **前端**：`PptViewer.vue` 第三 Tab、`SupplementaryAttachmentsPanel.vue`（`scope=project`）、`projectApi.list/add/deleteProjectAttachment`

专家侧见 [`book_expert_attachments_spec.md`](book_expert_attachments_spec.md)（API 形态一致，路径不同）。

---

## 0. 产品规则

| 场景 | 期望 |
|------|------|
| 谁可上传 / 删 | **项目 owner**（`project.userId === JWT userId`） |
| 谁可看列表 | Owner 全功能；**已分享至社区**的访客可选 **只读** 列表 + 打开链接（二期；当前前端 workspace 仅 owner 见 Tab） |
| 文件类型 | 与 PPT 文档 RAG 一致：PDF、EPUB、MOBI、Word、TXT、Markdown（前端 `validatePptDocumentFile`） |
| 单文件 | ≤ **50 MB**（`PPT_DOC_MAX_BYTES`） |
| 数量 | **10** / 项目（前端常量；超出 `400 ATTACHMENT_LIMIT`） |
| 云空间 | 直传 `complete` → `usedBytes += fileSize`；删除附件且无其他引用 → `usedBytes -= fileSize` |
| 与生成物关系 | 附件 **不**替代 deck / markdown；仅作 **补充检索源** |

---

## 1. 现状与缺口

| 组件 | 现状 | 缺口 |
|------|------|------|
| 项目对话 / 划词 RAG | 主要用 deck + markdown + 历史 | 未合并 `project_attachments` |
| `file/user/direct-upload` | 配额 + complete 入账 | optional metadata：`source=project_attachment`、`projectId` |
| BFF `/project/{id}/*` | cover、category、share | **attachments CRUD** |

---

## 2. 数据模型（MySQL）

表名建议：`project_attachments`

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | BIGINT PK | |
| `attachment_id` | VARCHAR(64) UNIQUE | 如 `pa_{uuid}` |
| `project_id` | VARCHAR(64) INDEX | FK → projects |
| `owner_user_id` | VARCHAR(64) INDEX | 冗余 |
| `name` | VARCHAR(512) | 原始文件名 |
| `url` | VARCHAR(2048) | OSS HTTPS |
| `type` | VARCHAR(32) | 扩展名 |
| `content_type` | VARCHAR(128) NULL | MIME |
| `file_key` | VARCHAR(512) | OSS key |
| `file_size` | BIGINT | 字节 |
| `status` | ENUM | `pending` \| `indexed` \| `failed` |
| `error_message` | TEXT NULL | |
| `created_at` / `updated_at` | DATETIME | |

**索引**：`POST .../attachments` 后异步解析 → chunk → 写入 **project 维度** vector / document_rag（key 含 `project_id` + `attachment_id`）。

**删项目**：CASCADE 附件 + 释放 OSS / 配额。

---

## 3. 云空间（配额）

与 [`book_expert_attachments_spec.md` §3](book_expert_attachments_spec.md) 相同：

1. 前端 `ensureStorageQuotaForUpload` + 直传 complete 双重校验  
2. `POST .../attachments` 只登记已 complete 的 `fileKey`  
3. `DELETE` 回滚配额（无引用时删 OSS）  
4. complete 可选：`source=project_attachment`、`projectId`

---

## 4. HTTP API（BFF 前缀 `/api2` 或现有 `/project`）

### 4.1 `GET /project/{projectId}/attachments`

**Auth**：登录；owner 或（可选）社区公开项目的只读

**Response 200**：

```json
{
  "ok": true,
  "count": 1,
  "attachments": [
    {
      "attachment_id": "pa_xxx",
      "name": "参考文献.pdf",
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

未实现：**404**（前端视为空列表 +「后端待上线」提示）。

### 4.2 `POST /project/{projectId}/attachments`

**Auth**：owner

**Body**（`SupplementaryAttachmentCreateReq`）：

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

**Response 201**：`{ "ok": true, "attachment": { ... } }`

### 4.3 `DELETE /project/{projectId}/attachments/{attachmentId}`

**Auth**：owner

**Response**：`{ "ok": true, "attachment_id": "pa_xxx" }`

---

## 5. RAG 合并（Agent / Python）

在 **项目内** 检索（含 PptViewer 划词追问、`document_rag`、相关搜索）时：

1. 现有：deck 文本、markdown、对话历史（按产品现有权重）  
2. 追加：`project_attachments` 中 `status=indexed` 的 chunks  
3. **不**要求 chat 请求体再传 `uploaded_documents`  

与专家附件 spec §5 对齐，仅 entity id 从 `expert_id` 换为 `project_id`。

---

## 6. 安全

- 私有项目：仅 owner 可 list / 下载 URL（或签名 URL）  
- 社区公开：列表可读性由产品定；raw URL 避免长期公开泄露  

---

## 7. 联调清单

- [ ] Owner 在 PptViewer Tab「补充附件」上传 → 列表 → `pending` → `indexed`  
- [ ] 划词追问能引用附件内容  
- [ ] 删除 → 配额回升  
- [ ] 超配额 → 前端 + complete 拒绝  
- [ ] 第 11 个 → 400  

---

## 8. 前端文件

| 文件 | 说明 |
|------|------|
| `PptViewer.vue` | Tab + `SupplementaryAttachmentsPanel` |
| `SupplementaryAttachmentsPanel.vue` | 上传 / 列表 / 配额预检 |
| `api/feed.ts` | `listProjectAttachments` 等 |
| `utils/storageQuotaCheck.ts` | 上传前预检 |

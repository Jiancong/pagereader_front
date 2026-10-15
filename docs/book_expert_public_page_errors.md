# 公开专家页「专家不存在或未公开」排查

页面：`/explore/expert/{expertId}`，文案 `bookExpert.publicNotFound`。

## 前端何时显示该文案

1. `GET /api2/book-experts/{id}` 失败（404、5xx、网络超时、BFF 业务错误）。
2. 响应里**解析不到** `expert` 对象（信封格式不一致）。
3. `expert.visibility === 'private'`（或未公开被后端拒绝）。

**注意**：任意异常都会显示同一句文案，容易与「真不存在」混淆。

## 已处理的前端根因

| 原因 | 现象 | 处理 |
|------|------|------|
| 浏览器残留**失效 JWT** | 带 `Authorization` 时 BFF 返回 `code=900111`、无 `expert` | 公开页 `getPublicExpertDetail` **omitAuth** |
| 响应为 `R<T>`（`data.expert`） | 顶层无 `expert`，误判为空 | `extractExpertFromDetailPayload` |
| `visibility` 字段缺失 | 详情有内容但被判非 public | 仅 `private` 拒绝，缺省视为可展示 |
| 弱网单次失败 | 偶发错误页 | 公开页 **400ms 后重试 1 次** |
| 未登录逛广场带坏 token | 列表/详情皆空 | `listPublicExperts` 在无 userId 时 omitAuth |

## 仍属真实业务错误的情况

- 专家已删除或 ID 错误。
- 用户分享链接时专家为**私有**，尚未发布到公共广场。
- 发布后 BFF/Python 未同步 `visibility=public`（需查后端）。

## 后端修改规格

见 **`book_expert_public_anonymous_access_spec.md`**（无效 JWT 下仍须返回 public `expert`；禁止 900111 + 空 body）。

## 验证

```bash
curl -sS "https://page2.top/api2/book-experts/exp_xxx?locale=en&ui_locale=en"
# 不应带 Authorization；应含 expert 且 visibility=public
```

# 登录 JWT：Header + Cookie（`pr_token`）

## 行为

| 步骤 | 说明 |
|------|------|
| `POST /api2/password/login`（及 email/google 登录） | 响应 `data` = JWT；同时 **`Set-Cookie: pr_token=<JWT>; HttpOnly; Path=/`** |
| 后续 API | 任选：**`Authorization: <JWT>`** 或 **Cookie `pr_token`**（可两者同时） |
| `POST /api2/logout` | 清除 `pr_token` Cookie |
| 前端 | `localStorage` 键 **`pr_token`** + 所有 `fetch` **`credentials: "include"`** |

## 后端改动（`pagereader-backend`，需部署）

- `JwtTokenUtils.resolveToken(request)`：头优先，再 Cookie
- `MyAuthenticationSuccessHandler`：`attachTokenCookie`
- `JwtAuthorizationFilter` / `UserInfoHandlerMethodArgumentResolver` / `JwtRequestUserIdResolver`：使用 `resolveToken`
- `logoutUrl`：`/api2/logout`（放行 + 清 Cookie）

## curl

```bash
# 方式 A：Cookie  jar
curl -c cj.txt -X POST 'https://page2.top/api2/password/login' \
  -H 'Content-Type: application/json' \
  -d '{"username":"you@example.com","password":"***"}'
curl -b cj.txt 'https://page2.top/api2/user/current/detail'

# 方式 B：Authorization
TOKEN=$(curl -s ... login ... | jq -r .data)
curl -H "Authorization: $TOKEN" 'https://page2.top/api2/user/current/detail'
```

未带 Header 且未带 `pr_token` Cookie 时，`/user/current/detail` 仍返回 **`900111`**。

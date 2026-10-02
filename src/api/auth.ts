// 认证与用户模块
// @author hc @date 2026-06-03

import { buildUrl, get, postJson } from "./client"
import { setToken, clearToken, clearLocalAvatar, getToken } from "./token"
import type {
  PasswordLoginReq,
  EmailLoginReq,
  GoogleLoginReq,
  UserSignUpDto,
  ChangePwdReq,
  ChangeEmailReq,
  VerifyVO,
  UserDetail,
  EmailCodeType,
  ResetPwdByEmailCodeReq,
} from "./types"

// 密码登录，成功后写入 JWT
export async function passwordLogin(req: PasswordLoginReq): Promise<string> {
  const jwt = await postJson<string>("/password/login", req)
  setToken(jwt)
  return jwt
}

// 邮箱验证码登录
export async function emailLogin(req: EmailLoginReq): Promise<string> {
  const jwt = await postJson<string>("/email/login", req)
  setToken(jwt)
  return jwt
}

// Google 登录
export async function googleLogin(req: GoogleLoginReq): Promise<string> {
  const jwt = await postJson<string>("/google/login", req)
  setToken(jwt)
  return jwt
}

// 注册
export async function userSignUp(req: UserSignUpDto): Promise<unknown> {
  return postJson("/user/userSignUp", req)
}

// 注册并自动密码登录，返回 JWT
export async function signUpAndLogin(req: UserSignUpDto): Promise<string> {
  await userSignUp(req)
  return passwordLogin({ username: req.email, password: req.password })
}

// 登出：清除服务端 pr_token Cookie + 本地 JWT
export async function logout(): Promise<void> {
  try {
    const token = getToken()
    const headers = new Headers()
    if (token) headers.set("Authorization", token)
    await fetch(buildUrl("/logout"), { method: "POST", credentials: "include", headers })
  } catch {
    /* 离线或旧后端无 /logout 时仍清本地 */
  }
  clearToken()
  clearLocalAvatar()
}

// 图形验证码
export async function getVerifyImage(): Promise<VerifyVO> {
  return get<VerifyVO>("/verifyImage/")
}

// 邮箱验证码：type=register|resetPwd
export async function sendEmailCode(email: string, type: EmailCodeType): Promise<unknown> {
  return postJson(`/verifyImage/email/${encodeURIComponent(email)}`, undefined, {
    query: { type },
  })
}

// 忘记密码：验证码 + 新密码
export async function resetPwdByEmailCode(req: ResetPwdByEmailCodeReq): Promise<unknown> {
  return postJson("/verifyImage/resetPwdByEmailCode", req)
}

// 当前用户详情
export async function getCurrentDetail(): Promise<UserDetail> {
  return get<UserDetail>("/user/current/detail")
}

// 当前用户信息
export async function getUserInfo(): Promise<UserDetail> {
  return get<UserDetail>("/user/info")
}

export async function changePwd(req: ChangePwdReq): Promise<unknown> {
  return postJson("/user/changePwd", req)
}

export async function changeEmail(req: ChangeEmailReq): Promise<unknown> {
  return postJson("/user/changeEmail", req)
}

export async function changeAvatar(avatar: string): Promise<unknown> {
  return postJson("/user/changeAvatar", { avatar })
}

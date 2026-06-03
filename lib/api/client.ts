// 核心请求封装：拼接 Base URL、注入 JWT、解包 R<T>
// @author hc @date 2026-06-03

import type { R } from "./types"
import { getToken, clearToken } from "./token"

const BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "").replace(/\/+$/, "")

// 业务异常
export class ApiError extends Error {
  code: number
  constructor(code: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.code = code
  }
}

function buildUrl(path: string, query?: Record<string, unknown>): string {
  const p = path.startsWith("/") ? path : `/${path}`
  let url = `${BASE}/api2${p}`
  if (query) {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue
      if (Array.isArray(v)) {
        v.forEach((item) => sp.append(k, String(item)))
      } else {
        sp.append(k, String(v))
      }
    }
    const qs = sp.toString()
    if (qs) url += `?${qs}`
  }
  return url
}

function authHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra)
  const token = getToken()
  if (token) headers.set("Authorization", token)
  return headers
}

// 解包 R<T>，code 非 0 抛 ApiError
async function unwrap<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    clearToken()
    throw new ApiError(401, "未登录或登录已过期")
  }
  let body: R<T>
  try {
    body = (await res.json()) as R<T>
  } catch {
    throw new ApiError(res.status, `请求失败：${res.status}`)
  }
  if (body.code !== 0) {
    throw new ApiError(body.code, body.message || "请求失败")
  }
  return body.data
}

export interface RequestOptions {
  query?: Record<string, unknown>
  headers?: HeadersInit
  signal?: AbortSignal
}

export async function get<T>(path: string, opts?: RequestOptions): Promise<T> {
  const res = await fetch(buildUrl(path, opts?.query), {
    method: "GET",
    headers: authHeaders(opts?.headers),
    signal: opts?.signal,
  })
  return unwrap<T>(res)
}

export async function postJson<T>(
  path: string,
  body?: unknown,
  opts?: RequestOptions,
): Promise<T> {
  const headers = authHeaders(opts?.headers)
  headers.set("Content-Type", "application/json")
  const res = await fetch(buildUrl(path, opts?.query), {
    method: "POST",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: opts?.signal,
  })
  return unwrap<T>(res)
}

// multipart/form-data 上传，不手动设置 Content-Type
export async function postForm<T>(
  path: string,
  form: FormData,
  opts?: RequestOptions,
): Promise<T> {
  const res = await fetch(buildUrl(path, opts?.query), {
    method: "POST",
    headers: authHeaders(opts?.headers),
    body: form,
    signal: opts?.signal,
  })
  return unwrap<T>(res)
}

export async function del<T>(path: string, opts?: RequestOptions): Promise<T> {
  const res = await fetch(buildUrl(path, opts?.query), {
    method: "DELETE",
    headers: authHeaders(opts?.headers),
    signal: opts?.signal,
  })
  return unwrap<T>(res)
}

// 返回二进制（如下载、读图）
export async function getBlob(path: string, opts?: RequestOptions): Promise<Blob> {
  const res = await fetch(buildUrl(path, opts?.query), {
    method: "GET",
    headers: authHeaders(opts?.headers),
    signal: opts?.signal,
  })
  if (!res.ok) throw new ApiError(res.status, `请求失败：${res.status}`)
  return res.blob()
}

export { buildUrl }

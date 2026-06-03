// 文件模块
// @author hc @date 2026-06-03

import { get, postForm, getBlob, buildUrl } from "./client"
import { getToken } from "./token"
import type { UserStorageQuota } from "./types"

// 上传
export async function putFile(file: File): Promise<unknown> {
  const form = new FormData()
  form.append("file", file)
  return postForm("/file/put", form)
}

// 用户上传
export async function putFileByUser(file: File): Promise<unknown> {
  const form = new FormData()
  form.append("file", file)
  return postForm("/file/putByUser", form)
}

// 读图（二进制）
export async function getImageBlob(query: Record<string, unknown>): Promise<Blob> {
  return getBlob("/file/get/image", { query })
}

// 读图地址（用于 <img src>，附带 token 作为 query，按后端实际支持调整）
export function buildImageUrl(query: Record<string, unknown>): string {
  return buildUrl("/file/get/image", query)
}

// 用户文件列表
export async function getUserFiles<T = unknown>(
  query?: Record<string, unknown>,
): Promise<T> {
  return get<T>("/file/user/files", { query })
}

// 存储配额
export async function getUserStorageQuota(): Promise<UserStorageQuota> {
  return get<UserStorageQuota>("/file/user/storage/quota")
}

export { getToken }

// 文件模块
// @author hc @date 2026-06-03

import { get, postForm, postJson, getBlob, buildUrl, del } from "./client"
import { getToken } from "./token"
import type {
  UserStorageQuota,
  UserAssetsPage,
  UserFilesStats,
  UserPrivateAssetType,
  UserPrivateAssetSort,
  DirectUploadTokenReq,
  DirectUploadTokenVo,
  DirectUploadCompleteReq,
  DirectUploadCompleteVo,
  UploadedDocument,
} from "./types"
import { normalizeUserAssetsPage } from "@/utils/userAssets"

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

// 用户上传文件列表（OSS user-upload）
export async function listUserUploadedFiles(params: {
  userId: number | string
  pageSize?: number
  marker?: string
  projectId?: string
}): Promise<UserAssetsPage> {
  const data = await get<unknown>("/file/user/files", {
    query: {
      userId: params.userId,
      pageSize: params.pageSize ?? 20,
      marker: params.marker,
      projectId: params.projectId,
    },
  })
  return normalizeUserAssetsPage(data)
}

// 用户生成素材列表（OSS user-private）
export async function listUserGeneratedAssets(params: {
  userId: number | string
  pageSize?: number
  marker?: string
  projectId?: string
  assetType?: UserPrivateAssetType
  sort?: UserPrivateAssetSort
}): Promise<UserAssetsPage> {
  const data = await get<unknown>("/file/user/private/assets", {
    query: {
      userId: params.userId,
      pageSize: params.pageSize ?? 20,
      marker: params.marker,
      projectId: params.projectId,
      assetType: params.assetType ?? "ALL",
      sort: params.sort ?? "NEWEST",
    },
  })
  return normalizeUserAssetsPage(data)
}

// 用户文件统计
export async function getUserFilesStats(userId: number | string): Promise<UserFilesStats> {
  return get<UserFilesStats>("/file/user/files/stats", { query: { userId } })
}

// 存储配额
export async function getUserStorageQuota(): Promise<UserStorageQuota> {
  return get<UserStorageQuota>("/file/user/storage/quota")
}

// 删除单个 OSS 文件
export async function deleteUserFile(fileKey: string): Promise<unknown> {
  return del<unknown>("/file/user/file", { query: { fileKey } })
}

// ===== OSS 直传（大文件走对象存储，绕过应用 413） =====

// 申请直传凭证
export async function getDirectUploadToken(
  req: DirectUploadTokenReq,
): Promise<DirectUploadTokenVo> {
  return postJson<DirectUploadTokenVo>("/file/user/direct-upload/token", req)
}

// 上传完成回执，换取可访问地址
export async function completeDirectUpload(
  req: DirectUploadCompleteReq,
): Promise<DirectUploadCompleteVo> {
  return postJson<DirectUploadCompleteVo>("/file/user/direct-upload/complete", req)
}

// 按文件名补全 Content-Type
function guessContentType(file: File): string {
  if (file.type) return file.type
  const ext = file.name.split(".").pop()?.toLowerCase()
  const map: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain",
    md: "text/markdown",
  }
  return (ext && map[ext]) || "application/octet-stream"
}

// 直传 OSS 三步：申请凭证 → PUT 上传 → 完成回执，返回供 Agent 使用的文档信息
export async function uploadDocument(file: File): Promise<UploadedDocument> {
  const contentType = guessContentType(file)
  const token = await getDirectUploadToken({
    originalName: file.name,
    contentType,
    fileSize: file.size,
  })

  const putHeaders = new Headers(token.uploadHeaders as HeadersInit)
  if (!putHeaders.has("Content-Type")) putHeaders.set("Content-Type", contentType)

  const putRes = await fetch(token.uploadUrl, {
    method: "PUT",
    headers: putHeaders,
    body: file,
  })
  if (!putRes.ok) throw new Error(`文件上传失败：${putRes.status}`)

  const done = await completeDirectUpload({
    fileKey: token.fileKey,
    originalName: file.name,
    contentType,
    fileSize: file.size,
  })

  const url = done.fileLink || token.fileUrl
  if (!url) throw new Error("上传完成但未返回文件地址")

  const ext = file.name.split(".").pop()?.toLowerCase()
  return { url, name: file.name, type: ext || "file" }
}

export { getToken }

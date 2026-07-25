// 沉浸式翻译：批量翻译接口
// @author hc @date 2026-07-25

import { ApiError, buildUrl } from "./client"
import { getToken } from "./token"

/** 批量翻译请求 */
export interface TranslateBatchReq {
  /** 单页合并后的完整行/句数组，建议每页一次性提交（长度 <= ~80） */
  texts: string[]
  /** 目标语言，ISO 639-1，如 zh / en / ja */
  targetLang: string
  /** 源语言，可选，缺省由后端自动检测 */
  sourceLang?: string
}

/** 批量翻译响应 */
export interface TranslateBatchRes {
  /** 译文数组，与 texts 等长、同序 */
  translations: string[]
}

function isTranslateBatchRes(value: unknown): value is TranslateBatchRes {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray((value as TranslateBatchRes).translations)
  )
}

/**
 * 批量翻译一页文本。
 * 后端当前直接返回 { translations }，也可能包在 R<T> 的 data 字段中。
 */
export async function translateBatch(
  req: TranslateBatchReq,
): Promise<TranslateBatchRes> {
  const headers = new Headers({ "Content-Type": "application/json" })
  const token = getToken()
  if (token) headers.set("Authorization", token)

  const res = await fetch(buildUrl("/translate/batch"), {
    method: "POST",
    headers,
    body: JSON.stringify(req),
  })

  if (res.status === 401) {
    throw new ApiError(401, "未登录或登录已过期")
  }

  let body: unknown
  try {
    body = await res.json()
  } catch {
    throw new ApiError(res.status, `请求失败：${res.status}`)
  }

  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>
    if ("code" in record || "success" in record) {
      const code = record.code
      const success = record.success
      if (code !== 0 && success !== true) {
        throw new ApiError(
          typeof code === "number" ? code : res.status,
          String(record.message || record.msg || "请求失败"),
        )
      }
      const data = record.data
      if (isTranslateBatchRes(data)) return data
    }
    if (isTranslateBatchRes(body)) return body
  }

  throw new ApiError(res.status, "翻译响应格式无效")
}

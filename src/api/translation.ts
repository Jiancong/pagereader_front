// 沉浸式翻译：批量翻译接口
// @author hc @date 2026-07-25

import { ApiError, buildUrl } from "./client"
import { getToken, clearToken } from "./token"
import { ReponseCodes } from "@/request/response-codes"

/** 批量翻译请求 */
export interface TranslateBatchReq {
  /** 单批文本数组，建议每批 <= 600 条，避免超过 BFF / Python 上限 */
  texts: string[]
  /** 目标语言，ISO 639-1，如 zh / en / ja */
  targetLang: string
  /** 源语言，可选，缺省由后端自动检测 */
  sourceLang?: string
}

/** 单批条数上限，与 Java BFF translate.batch.max-texts、Python TRANSLATE_BATCH_MAX_TEXTS 对齐 */
export const TRANSLATE_BATCH_MAX_TEXTS = 600
/** 单批总字符上限，避免单批过大导致网关超时（502）；600 条约 200 字/条 */
export const TRANSLATE_BATCH_MAX_CHARS = 120_000
/** 单批等待上限，与 Java→Python 90s 读超时对齐 */
export const TRANSLATE_BATCH_TIMEOUT_MS = 95000

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
function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError"
}

export async function translateBatch(
  req: TranslateBatchReq,
): Promise<TranslateBatchRes> {
  const headers = new Headers({ "Content-Type": "application/json" })
  const token = getToken()
  if (token) headers.set("Authorization", token)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TRANSLATE_BATCH_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(buildUrl("/translate/batch"), {
      method: "POST",
      headers,
      body: JSON.stringify(req),
      signal: controller.signal,
    })
  } catch (err) {
    if (isAbortError(err)) throw new ApiError(408, "翻译请求超时")
    throw err
  } finally {
    clearTimeout(timer)
  }

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
        const numericCode = typeof code === "number" ? code : res.status
        if (
          numericCode === ReponseCodes.NO_AUTH ||
          numericCode === ReponseCodes.TOKEN_EXPIRED ||
          numericCode === ReponseCodes.REFRESH_TOKEN_EXPIRED
        ) {
          clearToken()
          throw new ApiError(401, "未登录或登录已过期")
        }
        throw new ApiError(numericCode, String(record.message || record.msg || "请求失败"))
      }
      const data = record.data
      if (isTranslateBatchRes(data)) return data
    }
    if (isTranslateBatchRes(body)) return body
  }

  throw new ApiError(res.status, "翻译响应格式无效")
}

/** 按条数/字符数切分，避免单批过大导致网关超时（502） */
export function chunkTranslationTexts(
  texts: string[],
  maxTexts = TRANSLATE_BATCH_MAX_TEXTS,
  maxChars = TRANSLATE_BATCH_MAX_CHARS,
): string[][] {
  const chunks: string[][] = []
  let current: string[] = []
  let chars = 0
  for (const text of texts) {
    if (current.length && (current.length >= maxTexts || chars + text.length > maxChars)) {
      chunks.push(current)
      current = []
      chars = 0
    }
    current.push(text)
    chars += text.length
  }
  if (current.length) chunks.push(current)
  return chunks
}

/**
 * 502 时自动拆半重试（Python 已成功但 Java 网关超时的情况）。
 */
async function translateBatchWithSplitRetry(
  texts: string[],
  targetLang: string,
): Promise<string[]> {
  try {
    const res = await translateBatch({ texts, targetLang })
    return res.translations
  } catch (err) {
    const isTimeout =
      err instanceof ApiError && (err.code === 502 || err.code === 504 || err.code === 408)
    if (isTimeout && texts.length > 1) {
      const mid = Math.ceil(texts.length / 2)
      const left = await translateBatchWithSplitRetry(texts.slice(0, mid), targetLang)
      const right = await translateBatchWithSplitRetry(texts.slice(mid), targetLang)
      return [...left, ...right]
    }
    throw err
  }
}

/** 自动分批 + 502 拆半重试，返回与 texts 等长的译文 */
export async function translateTextsInChunks(
  texts: string[],
  targetLang: string,
): Promise<string[]> {
  if (!texts.length) return []
  const chunks = chunkTranslationTexts(texts)
  const out: string[] = []
  for (const chunk of chunks) {
    out.push(...(await translateBatchWithSplitRetry(chunk, targetLang)))
  }
  return out
}

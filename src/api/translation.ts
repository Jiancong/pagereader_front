// 沉浸式翻译：批量翻译接口
// @author hc @date 2026-07-25

import { postJson } from "./client"

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

/**
 * 批量翻译一页文本。
 * 后端复用现有 LLM 能力，逐条翻译并保持数组顺序。
 */
export async function translateBatch(
  req: TranslateBatchReq,
): Promise<TranslateBatchRes> {
  return postJson<TranslateBatchRes>("/translate/batch", req)
}

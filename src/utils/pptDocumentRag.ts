/** PPT 文档 RAG（与后端 uploaded_documents / document_rag 对齐） */

/** 与后端 chat_stream JSON 体 uploaded_documents[] 单条一致（url 必填） */
export type UploadedDocument = {
  url: string;
  name?: string;
  type?: string;
};

/** 推荐请求体（字段名用 snake_case uploaded_documents） */
export type ChatStreamPptRequest = {
  message: string;
  projectId?: string;
  isAgent?: boolean;
  uploaded_documents?: UploadedDocument[];
};

export type DocumentRagDocumentMeta = {
  name: string;
  url: string;
  type: string;
  char_count?: number;
  section_count?: number;
  error?: string | null;
};

export type DocumentRagMeta = {
  enabled: boolean;
  documents?: DocumentRagDocumentMeta[];
  chunk_count?: number;
  document_search_calls?: number;
};

export type PptDocumentFileItem = {
  id: number;
  name: string;
  ossUrl: string;
  type: string;
  size: number;
};

const PPT_DOC_MAX_COUNT = 8;
const PPT_DOC_MAX_BYTES = 50 * 1024 * 1024;

const PPT_DOC_EXT_RE = /\.(pdf|docx?|md|markdown|txt)$/i;

export function isHttpShareUrl(url: string): boolean {
  const t = String(url || "").trim();
  return t.startsWith("http://") || t.startsWith("https://");
}

export function inferPptDocumentType(name: string, mime?: string): string {
  const lower = String(name || "").toLowerCase();
  const m = String(mime || "").toLowerCase();
  if (lower.endsWith(".pdf") || m.includes("pdf")) return "pdf";
  if (lower.endsWith(".docx") || m.includes("wordprocessingml")) return "docx";
  if (lower.endsWith(".doc") || m === "application/msword") return "doc";
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "md";
  if (lower.endsWith(".txt") || m.startsWith("text/")) return "txt";
  const dot = lower.lastIndexOf(".");
  return dot >= 0 ? lower.slice(dot + 1) : "txt";
}

export function isAllowedPptDocumentFile(file: File): boolean {
  if (PPT_DOC_EXT_RE.test(file.name)) return true;
  const m = (file.type || "").toLowerCase();
  return (
    m.includes("pdf") ||
    m.includes("msword") ||
    m.includes("wordprocessingml") ||
    m === "text/plain" ||
    m === "text/markdown"
  );
}

export function isPptDocumentAsset(name: string, url = "", contentType = ""): boolean {
  const probe = `${name} ${url}`.toLowerCase();
  if (PPT_DOC_EXT_RE.test(probe)) return true;
  const ct = String(contentType || "").toLowerCase();
  return (
    ct.includes("pdf") ||
    ct.includes("msword") ||
    ct.includes("wordprocessingml") ||
    ct.startsWith("text/")
  );
}

/** 云资源库条目 → chat_stream uploaded_documents 单条（已上传 OSS，无需再传） */
export function uploadedDocumentFromUserAsset(asset: {
  name: string;
  url: string;
  contentType?: string;
}): UploadedDocument | null {
  const url = String(asset.url || "").trim();
  if (!isHttpShareUrl(url)) return null;
  if (!isPptDocumentAsset(asset.name, url, asset.contentType)) return null;
  return {
    url,
    name: asset.name,
    type: inferPptDocumentType(asset.name, asset.contentType),
  };
}

export function validatePptDocumentFile(file: File): string | null {
  if (!isAllowedPptDocumentFile(file)) {
    return "unsupported";
  }
  if (file.size > PPT_DOC_MAX_BYTES) {
    return "too_large";
  }
  return null;
}

export function getPptDocumentLimits() {
  return { maxCount: PPT_DOC_MAX_COUNT, maxBytes: PPT_DOC_MAX_BYTES };
}

export function toUploadedDocumentPayload(
  items: PptDocumentFileItem[]
): UploadedDocument[] {
  return items
    .filter((d) => isHttpShareUrl(d.ossUrl))
    .map((d) => ({
      url: d.ossUrl.trim(),
      name: d.name,
      type: d.type || inferPptDocumentType(d.name),
    }));
}

/** 从 DTO 取出文档列表（兼容 uploaded_documents / uploadedDocuments） */
export function pickUploadedDocumentsFromDto(dto: {
  uploaded_documents?: UploadedDocument[];
  uploadedDocuments?: UploadedDocument[];
}): UploadedDocument[] {
  if (dto.uploaded_documents?.length) return dto.uploaded_documents;
  if (dto.uploadedDocuments?.length) return dto.uploadedDocuments;
  return [];
}

export function isDocumentRagPpt(pptData: unknown): boolean {
  if (!pptData || typeof pptData !== "object") return false;
  const dr = (pptData as Record<string, unknown>).document_rag;
  return !!(
    dr &&
    typeof dr === "object" &&
    (dr as DocumentRagMeta).enabled === true
  );
}

/** SSE ppt_complete 顶层或 ppt_data 内判断文档 RAG 模式 */
export function isDocumentRagFromStreamPayload(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const r = raw as Record<string, unknown>;
  if (r.document_based === true) return true;
  if (isDocumentRagPpt(r)) return true;
  const pptData = r.ppt_data;
  if (pptData && isDocumentRagPpt(pptData)) return true;
  return false;
}

export function isPptDocumentProgressMessage(message: string): boolean {
  const m = String(message || "");
  return /📄|上传的\s*\d+\s*份文档|基于您上传|文档规划|解析您上传/i.test(m);
}

/** 从 PPT 数据中提取 chat-stream 可用的 uploaded_documents */
export function uploadedDocumentsFromPptData(pptData: unknown): UploadedDocument[] {
  if (!pptData || typeof pptData !== "object") return [];
  const dr = (pptData as Record<string, unknown>).document_rag as
    | DocumentRagMeta
    | undefined;
  if (!dr?.enabled || !Array.isArray(dr.documents)) return [];
  return dr.documents
    .filter((d) => d?.url && isHttpShareUrl(d.url) && !d.error)
    .map((d) => ({
      url: String(d.url).trim(),
      name: d.name,
      type: d.type || inferPptDocumentType(d.name || ""),
    }));
}

export function mergeDocumentRagOntoPptData(
  pptData: Record<string, unknown>,
  raw: unknown
): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return pptData;
  const r = raw as Record<string, unknown>;
  if (pptData.document_rag) return pptData;
  const fromRaw = r.document_rag;
  if (fromRaw && typeof fromRaw === "object") {
    return { ...pptData, document_rag: fromRaw };
  }
  return pptData;
}

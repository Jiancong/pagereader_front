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

const PPT_DOC_EXT_RE = /\.(pdf|docx?|md|markdown|txt|epub|mobi|srt)$/i;

/** 书籍专家蒸馏支持的扩展名（含 azw；不含 srt） */
const BOOK_EXPERT_DOC_EXT_RE = /\.(pdf|docx?|md|markdown|txt|epub|mobi|azw3?)$/i;

export function isHttpShareUrl(url: string): boolean {
  const t = String(url || "").trim();
  return t.startsWith("http://") || t.startsWith("https://");
}

const YOUTUBE_URL_RE = /(?:youtube\.com\/(?:watch|shorts|live)|youtu\.be\/)/i;

export function isLikelyYoutubeUrl(raw: string): boolean {
  const t = String(raw || "").trim();
  return YOUTUBE_URL_RE.test(t);
}

/** 用户粘贴的外部链接 → 规范 https URL */
export function normalizeExternalHttpUrl(raw: string): string | null {
  let t = String(raw || "").trim();
  if (!t) return null;
  if (!/^https?:\/\//i.test(t)) {
    if (/^www\./i.test(t)) t = `https://${t}`;
    else return null;
  }
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href;
  } catch {
    return null;
  }
}

export function defaultNameFromExternalUrl(url: string): string {
  try {
    const u = new URL(url);
    if (isLikelyYoutubeUrl(url)) {
      const id = u.searchParams.get("v") || u.pathname.split("/").filter(Boolean).pop() || "";
      return id ? `YouTube (${id})` : `YouTube · ${u.hostname}`;
    }
    const path = u.pathname.length > 1 ? u.pathname : "";
    return `${u.hostname}${path}`.slice(0, 120);
  } catch {
    return String(url).slice(0, 120);
  }
}

export function inferSupplementaryTypeFromExternalUrl(url: string): string {
  if (isLikelyYoutubeUrl(url)) return "youtube";
  const path = String(url || "").split("?")[0];
  if (PPT_DOC_EXT_RE.test(path)) return inferPptDocumentType(path);
  return "url";
}

export function isExternalUrlSupplementaryAttachment(item: {
  url?: string;
  file_key?: string;
  fileKey?: string;
  type?: string;
}): boolean {
  const fk = String(item.file_key ?? item.fileKey ?? "").trim();
  if (fk) return false;
  const url = String(item.url || "").trim();
  if (!isHttpShareUrl(url)) return false;
  const ty = String(item.type || "").toLowerCase();
  if (ty === "youtube" || ty === "url") return true;
  return !isPptDocumentAsset("", url);
}

/** 外部 HTTP(S) 链接 → 补充附件登记（不占云空间、无 fileKey） */
export function supplementaryAttachmentBodyFromExternalUrl(
  userId: string,
  rawUrl: string,
  nameOverride?: string,
): {
  userId: string;
  url: string;
  name: string;
  type: string;
  fileSize: number;
  source: "external_url";
} | null {
  const url = normalizeExternalHttpUrl(rawUrl);
  if (!url) return null;
  const name = String(nameOverride || "").trim() || defaultNameFromExternalUrl(url);
  return {
    userId: String(userId),
    url,
    name,
    type: inferSupplementaryTypeFromExternalUrl(url),
    fileSize: 0,
    source: "external_url",
  };
}

export function inferPptDocumentType(name: string, mime?: string): string {
  const lower = String(name || "").toLowerCase();
  const m = String(mime || "").toLowerCase();
  if (lower.endsWith(".pdf") || m.includes("pdf")) return "pdf";
  if (lower.endsWith(".docx") || m.includes("wordprocessingml")) return "docx";
  if (lower.endsWith(".doc") || m === "application/msword") return "doc";
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "md";
  if (lower.endsWith(".txt") || m.startsWith("text/")) return "txt";
  if (lower.endsWith(".epub") || m === "application/epub+zip") return "epub";
  if (lower.endsWith(".mobi") || m === "application/x-mobipocket-ebook") return "mobi";
  if (lower.endsWith(".srt") || m === "application/x-subrip" || m === "text/srt") return "srt";
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
    m === "text/markdown" ||
    m === "application/epub+zip" ||
    m === "application/x-mobipocket-ebook" ||
    m === "application/x-subrip" ||
    m === "text/srt"
  );
}

export function isBookExpertDocumentAsset(name: string, url = "", contentType = ""): boolean {
  const nameProbe = String(name || "").toLowerCase();
  const urlPath = String(url || "").split("?")[0].toLowerCase();
  if (BOOK_EXPERT_DOC_EXT_RE.test(nameProbe) || BOOK_EXPERT_DOC_EXT_RE.test(urlPath)) {
    return true;
  }
  const ct = String(contentType || "").toLowerCase();
  return (
    ct.includes("pdf") ||
    ct.includes("msword") ||
    ct.includes("wordprocessingml") ||
    ct.includes("epub") ||
    ct.includes("mobi") ||
    ct.startsWith("text/")
  );
}

export function isPptDocumentAsset(name: string, url = "", contentType = ""): boolean {
  // 分别检测文件名与 URL 路径（去掉签名 query）；拼接检测会因 $ 锚定失效：
  // OSS 签名 URL 结尾不是扩展名，而名称在拼接串开头无法命中 $锚点
  const nameProbe = String(name || "").toLowerCase();
  const urlPath = String(url || "").split("?")[0].toLowerCase();
  if (PPT_DOC_EXT_RE.test(nameProbe) || PPT_DOC_EXT_RE.test(urlPath)) return true;
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

/** 云资源库文档 → 补充附件登记 body（不再次上传，不重复占用配额） */
export function supplementaryAttachmentBodyFromUserAsset(
  asset: {
    name: string;
    url: string;
    fileKey: string;
    size?: number;
    contentType?: string;
  },
  userId: string,
): {
  userId: string;
  url: string;
  name: string;
  type: string;
  fileKey: string;
  fileSize: number;
  contentType?: string;
} | null {
  const doc = uploadedDocumentFromUserAsset(asset);
  const fileKey = String(asset.fileKey || "").trim();
  if (!doc || !fileKey) return null;
  return {
    userId: String(userId),
    url: doc.url,
    name: doc.name || asset.name,
    type: doc.type || inferPptDocumentType(asset.name, asset.contentType),
    fileKey,
    fileSize: typeof asset.size === "number" && asset.size >= 0 ? asset.size : 0,
    contentType: asset.contentType,
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

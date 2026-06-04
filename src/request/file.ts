import { request } from "./request";
import { ElMessage } from "element-plus";

interface UploadFileParams {
  file: any;
}

export interface UploadFileByUserParams {
  file: any;
  /** 与现有调用一致：多为数字 id，ChatPanel 等也会传字符串 */
  userId: number | string;
  /** 直传 complete 时写入 ProjectAsset（可选） */
  projectId?: string;
  assetType?: string;
}

interface DirectUploadTokenParams {
  originalName: string;
  contentType: string;
  fileSize: number;
}

interface DirectUploadCompleteParams extends DirectUploadTokenParams {
  fileKey: string;
  userId?: number | string;
  projectId?: string;
  assetType?: string;
}

interface DirectUploadToken {
  uploadUrl: string;
  method?: string;
  uploadHeaders?: Record<string, string>;
  fileKey: string;
}

export interface UserStorageQuota {
  planType?: string;
  usedBytes?: number;
  usedFormatted?: string;
  limitBytes?: number;
  limitGb?: number;
  limitFormatted?: string;
  remainingBytes?: number;
  remainingFormatted?: string;
  exceeded?: boolean;
  wouldExceed?: boolean;
  usagePercentage?: number;
  totalCount?: number;
}

interface GetUserImagesParams {
  taskName?: string;
  page?: number;
  size?: number;
}

interface GetUserFilesParams {
  userId: number;
  pageSize?: number;
  marker?: string;
  /**
   * 可选：仅当后端按 project_asset 等材料表过滤 user files 时有意义。
   * 「我的资源」面板为账号全局列表，不传此字段。
   */
  projectId?: string;
}

export type UserPrivateAssetType = "ALL" | "IMAGE" | "VIDEO";

export type UserPrivateAssetSort = "NEWEST" | "OLDEST" | "SIZE_DESC" | "SIZE_ASC";

interface GetUserPrivateAssetsParams {
  userId: number;
  pageSize?: number;
  marker?: string;
  assetType?: UserPrivateAssetType;
  sort?: UserPrivateAssetSort;
  /**
   * 可选：仅当后端按项目过滤生成素材列表时有意义。
   * 「我的资源」生成 Tab 为账号全局，不传此字段。
   */
  projectId?: string;
}

interface SaveUserImageParams {
  imageUrl: string;
  taskName?: string;
  /** 绑定到项目时传入 */
  projectId?: string;
  [key: string]: any;
}

interface ListUserImagesParams {
  taskName?: string;
  userId?: string;
  date?: string;
  page?: number;
  size?: number;
}

const BASE_FILE_API_URL = '/api2/file';

function isOkResponseCode(code: unknown): boolean {
  return code === undefined || code === 0 || code === "0" || code === 200 || code === "200";
}

function getIncomingBytes(file: any): number | null {
  const size = Number(file?.size);
  return Number.isFinite(size) && size > 0 ? Math.floor(size) : null;
}

function buildQuotaExceededMessage(quota: UserStorageQuota): string {
  const plan = quota.planType || "当前套餐";
  const limit = quota.limitFormatted || "云空间额度";
  const remaining = quota.remainingFormatted || "0 B";
  return `云空间不足，当前套餐 ${plan} 总额度 ${limit}，剩余 ${remaining}。请升级套餐后再上传。`;
}

export class StorageQuotaExceededError extends Error {
  quota: UserStorageQuota;

  constructor(quota: UserStorageQuota) {
    super(buildQuotaExceededMessage(quota));
    this.name = "StorageQuotaExceededError";
    this.quota = quota;
  }
}

class DirectUploadError extends Error {
  stage: "token" | "put" | "complete";
  response?: any;

  constructor(stage: "token" | "put" | "complete", message: string, response?: any) {
    super(message);
    this.name = "DirectUploadError";
    this.stage = stage;
    this.response = response;
  }
}

export function isStorageQuotaExceededError(error: unknown): error is StorageQuotaExceededError {
  return error instanceof StorageQuotaExceededError;
}

export const getUserStorageQuota = (incomingBytes?: number | null) => {
  const query = new URLSearchParams();
  if (typeof incomingBytes === "number" && Number.isFinite(incomingBytes) && incomingBytes > 0) {
    query.set("incomingBytes", String(Math.floor(incomingBytes)));
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request(`${BASE_FILE_API_URL}/user/storage/quota${suffix}`, {
    method: "get",
  });
};

async function assertUserStorageQuotaBeforeUpload(file: any): Promise<void> {
  const quotaRes = await getUserStorageQuota(getIncomingBytes(file));
  if (!isOkResponseCode(quotaRes?.code)) {
    // 配额接口异常时不阻断旧上传路径，避免临时后端故障导致所有上传不可用。
    console.warn("Storage quota check failed, continuing upload:", quotaRes);
    return;
  }

  const quota = quotaRes?.data as UserStorageQuota | undefined;
  if (!quota || typeof quota !== "object") return;

  if (quota.exceeded || quota.wouldExceed) {
    const error = new StorageQuotaExceededError(quota);
    ElMessage.warning(error.message);
    throw error;
  }
}

/**
 * 文件上传（不带用户ID）
 */
export const upload = (params: UploadFileParams) => {
  const formData = new FormData();
  formData.append("file", params.file);
  return request(`${BASE_FILE_API_URL}/put`, {
    method: "post",
    headers: {
      // "content-type": "multipart/form-data",
    },
    body: formData,
  });
};

function normalizeUploadHeaders(headers: unknown): HeadersInit {
  if (!headers || typeof headers !== "object") return {};
  const result: Record<string, string> = {};
  Object.entries(headers as Record<string, unknown>).forEach(([key, value]) => {
    if (value == null) return;
    result[key] = String(value);
  });
  return result;
}

function normalizeDirectUploadToken(data: unknown): DirectUploadToken | null {
  if (!data || typeof data !== "object") return null;
  const raw = data as Record<string, unknown>;
  const uploadUrl = typeof raw.uploadUrl === "string" ? raw.uploadUrl.trim() : "";
  const fileKey = typeof raw.fileKey === "string" ? raw.fileKey.trim() : "";
  if (!uploadUrl || !fileKey) return null;
  return {
    uploadUrl,
    fileKey,
    method: typeof raw.method === "string" && raw.method.trim() ? raw.method.trim() : "PUT",
    uploadHeaders:
      raw.uploadHeaders && typeof raw.uploadHeaders === "object"
        ? (raw.uploadHeaders as Record<string, string>)
        : undefined,
  };
}

/** Common MIME ↔ extension hints so token 阶段能给出准确类型，避免后端按 octet-stream 生成 .bin 对象名 */
const MIME_TO_EXT: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/ogg": ".ogv",
  "video/quicktime": ".mov",
  "video/x-matroska": ".mkv",
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/wav": ".wav",
  "audio/webm": ".webm",
  "audio/mp4": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/aac": ".aac",
  "audio/flac": ".flac",
  "audio/ogg": ".ogg",
  "audio/opus": ".opus",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

const EXT_TO_MIME: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  ogv: "video/ogg",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  m4v: "video/x-m4v",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  aac: "audio/aac",
  flac: "audio/flac",
  ogg: "audio/ogg",
  opus: "audio/opus",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

function hasLikelyFilenameExtension(name: string): boolean {
  return /\.[a-z0-9]{2,8}$/i.test(name);
}

function inferMimeFromFilename(filename: string): string | null {
  const base = filename.split(/[/\\]/).pop() || filename;
  const dot = base.lastIndexOf(".");
  if (dot < 0) return null;
  const ext = base.slice(dot + 1).toLowerCase();
  return EXT_TO_MIME[ext] || null;
}

function appendExtensionFromMime(filename: string, mime: string): string {
  if (hasLikelyFilenameExtension(filename)) return filename;
  const ext = MIME_TO_EXT[mime.toLowerCase()];
  return ext ? `${filename}${ext}` : filename;
}

/** 去掉路径分隔符与少量非法字符，保留扩展名 */
function normalizeDirectUploadFilename(raw: string): string {
  const trimmed = raw.trim().replace(/\\/g, "/");
  const base = trimmed.split("/").pop() || trimmed;
  const cleaned = base.replace(/[<>:"|?*\x00-\x1f]/g, "_").trim();
  return cleaned || `upload-${Date.now()}`;
}

function buildDirectUploadParams(file: any): DirectUploadTokenParams {
  let originalName = normalizeDirectUploadFilename(
    typeof file?.name === "string" && file.name.trim() ? file.name.trim() : `upload-${Date.now()}`
  );

  let contentType =
    typeof file?.type === "string" && file.type.trim() ? file.type.trim() : "";

  // 浏览器常给出空 type 或 octet-stream（尤其录屏/拖拽），优先用扩展名推断，便于后端生成正确后缀与 Content-Type
  if (!contentType || contentType === "application/octet-stream") {
    const fromName = inferMimeFromFilename(originalName);
    if (fromName) contentType = fromName;
  }

  if (!contentType) contentType = "application/octet-stream";

  // 有明确 MIME 但文件名无扩展名时补全，便于展示与后端按名归类
  originalName = appendExtensionFromMime(originalName, contentType);

  const size = Number(file?.size);
  const fileSize = Number.isFinite(size) && size >= 0 ? Math.floor(size) : 0;
  return { originalName, contentType, fileSize };
}

function shouldFallbackToLegacyUpload(error: unknown): boolean {
  if (!(error instanceof DirectUploadError)) return false;
  // complete 失败时 OSS 对象可能已经写入，避免再走旧上传造成重复对象。
  if (error.stage === "complete") return false;
  const code = error.response?.code;
  return code === 404 || code === "404" || code === 500 || code === "500" || error.stage === "put";
}

export const requestDirectUploadToken = (params: DirectUploadTokenParams) => {
  return request(`${BASE_FILE_API_URL}/user/direct-upload/token`, {
    method: "post",
    body: JSON.stringify(params),
  });
};

export const completeDirectUpload = (params: DirectUploadCompleteParams) => {
  return request(`${BASE_FILE_API_URL}/user/direct-upload/complete`, {
    method: "post",
    body: JSON.stringify(params),
  });
};

export const directUploadByUser = async (params: UploadFileByUserParams) => {
  const tokenParams = buildDirectUploadParams(params.file);
  const tokenRes = await requestDirectUploadToken(tokenParams);
  if (!isOkResponseCode(tokenRes?.code)) {
    throw new DirectUploadError(
      "token",
      tokenRes?.message || "direct upload token request failed",
      tokenRes
    );
  }

  const token = normalizeDirectUploadToken(tokenRes?.data);
  if (!token) {
    throw new DirectUploadError("token", "direct upload token response is invalid", tokenRes);
  }

  let putResponse: Response;
  try {
    putResponse = await fetch(token.uploadUrl, {
      method: token.method || "PUT",
      headers: normalizeUploadHeaders(token.uploadHeaders),
      body: params.file,
    });
  } catch (error: any) {
    throw new DirectUploadError("put", error?.message || "direct OSS upload failed", error);
  }

  if (!putResponse.ok) {
    throw new DirectUploadError(
      "put",
      `direct OSS upload failed with HTTP ${putResponse.status}`,
      { status: putResponse.status, statusText: putResponse.statusText }
    );
  }

  const completeRes = await completeDirectUpload({
    ...tokenParams,
    fileKey: token.fileKey,
    userId: params.userId,
    ...(params.projectId ? { projectId: params.projectId } : {}),
    ...(params.assetType ? { assetType: params.assetType } : {}),
  });
  if (!isOkResponseCode(completeRes?.code)) {
    throw new DirectUploadError(
      "complete",
      completeRes?.message || "direct upload complete failed",
      completeRes
    );
  }

  return completeRes;
};

/**
 * 旧版文件上传（带用户ID）兜底：POST /api2/file/putByUser
 */
const legacyUploadByUser = async (params: UploadFileByUserParams) => {
  await assertUserStorageQuotaBeforeUpload(params.file);
  const formData = new FormData();
  formData.append("file", params.file);
  formData.append("userId", String(params.userId));
  return request(`${BASE_FILE_API_URL}/putByUser`, {
    method: "post",
    headers: {
      // "content-type": "multipart/form-data",
    },
    body: formData,
  });
};

/**
 * 文件上传（带用户ID）
 * 优先走 OSS 预签名 PUT 直传；浏览器直传/CORS 或新接口不可用时回退旧 putByUser。
 */
export const uploadByUser = async (params: UploadFileByUserParams) => {
  try {
    return await directUploadByUser(params);
  } catch (error) {
    if (!shouldFallbackToLegacyUpload(error)) {
      throw error;
    }
    console.warn("Direct upload failed, falling back to legacy putByUser:", error);
    return legacyUploadByUser(params);
  }
};

/**
 * 文件上传（带用户ID）- 与后端 FileController.putFileByUser 对齐的命名
 * POST /api2/file/putByUser
 *
 * 说明：历史上前端使用 uploadByUser；这里提供同等功能的别名，便于语义一致。
 */
export const putFileByUser = (params: UploadFileByUserParams) => uploadByUser(params);

/**
 * 从 putByUser / uploadByUser 响应中解析可访问的 OSS URL。
 * 后端历史上使用 ossUrl、fileLink、url，或 data 本身为 URL 字符串（与 useMediaUpload 一致）。
 */
export function getUploadResultUrl(result: any): string | null {
  if (!result || typeof result !== "object") return null;
  const code = result.code;
  if (
    code !== undefined &&
    code !== 0 &&
    code !== "0" &&
    code !== 200 &&
    code !== "200"
  ) {
    return null;
  }
  const d = result.data;
  if (d == null) return null;
  if (typeof d === "string") {
    const s = d.trim();
    return /^https?:\/\//i.test(s) ? s : null;
  }
  if (typeof d === "object") {
    const u = d.ossUrl || d.fileLink || d.url;
    if (typeof u === "string" && /^https?:\/\//i.test(u.trim())) return u.trim();
  }
  return null;
}

/**
 * 下载文件
 */
export const downloadFile = (fileName: string) => {
  return request(`${BASE_FILE_API_URL}/get/image?fileName=${encodeURIComponent(fileName)}`, {
    method: "get",
  });
};

/**
 * 获取图片URL
 */
export const getImageUrl = (fileName: string) => {
  return request(`${BASE_FILE_API_URL}/get/url?fileName=${encodeURIComponent(fileName)}`, {
    method: "get",
  });
};

/**
 * 保存用户图片信息
 */
export const saveUserImage = (params: SaveUserImageParams) => {
  return request(`${BASE_FILE_API_URL}/save/user_image`, {
    method: "post",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(params),
  });
};

/**
 * 获取用户图片列表（分页）
 */
export const getUserImages = (params?: GetUserImagesParams) => {
  if (!params) {
    params = { page: 0, size: 10 };
  }
  const { taskName = '', page = 0, size = 10 } = params;
  const taskNameParam = taskName ? `&taskName=${encodeURIComponent(taskName)}` : '';
  return request(`${BASE_FILE_API_URL}/get/user_image?page=${page}&size=${size}${taskNameParam}`, {
    method: "get",
  });
};

/**
 * 获取用户任务列表
 */
export const getUserTaskList = () => {
  return request(`${BASE_FILE_API_URL}/task/list`, {
    method: "get",
  });
};

/**
 * 列出用户图片（支持更多筛选条件）
 */
export const listUserImages = (params: ListUserImagesParams) => {
  const { taskName = '', userId = '', date = '', page = 0, size = 10 } = params;
  const queryParams = new URLSearchParams();
  if (taskName) queryParams.append('taskName', taskName);
  if (userId) queryParams.append('userId', userId);
  if (date) queryParams.append('date', date);
  queryParams.append('page', page.toString());
  queryParams.append('size', size.toString());
  
  return request(`${BASE_FILE_API_URL}/list/images?${queryParams.toString()}`, {
    method: "get",
  });
};

/**
 * 获取用户上传的文件列表（从OSS，支持分页）
 */
export const getUserFiles = (params: GetUserFilesParams) => {
  const { userId, pageSize = 100, marker, projectId } = params;
  const queryParams = new URLSearchParams();
  queryParams.append('userId', userId.toString());
  queryParams.append('pageSize', pageSize.toString());
  if (marker) queryParams.append('marker', marker);
  const pid = typeof projectId === "string" ? projectId.trim() : "";
  if (pid) queryParams.append("projectId", pid);
  
  return request(`${BASE_FILE_API_URL}/user/files?${queryParams.toString()}`, {
    method: "get",
  });
};

/**
 * 分页获取当前用户生成的私有素材（OSS: user-private/images|videos/{userId}/）
 */
export const getUserPrivateAssets = (params: GetUserPrivateAssetsParams) => {
  const {
    userId,
    pageSize = 100,
    marker,
    assetType = "ALL",
    sort = "NEWEST",
    projectId,
  } = params;
  const queryParams = new URLSearchParams();
  queryParams.append("userId", userId.toString());
  queryParams.append("pageSize", pageSize.toString());
  queryParams.append("assetType", assetType);
  queryParams.append("sort", sort);
  if (marker) queryParams.append("marker", marker);
  const pid = typeof projectId === "string" ? projectId.trim() : "";
  if (pid) queryParams.append("projectId", pid);

  return request(`${BASE_FILE_API_URL}/user/private/assets?${queryParams.toString()}`, {
    method: "get",
  });
};

/**
 * 获取用户文件统计信息
 */
export const getUserFilesStats = (userId: number) => {
  return request(`${BASE_FILE_API_URL}/user/files/stats?userId=${userId}`, {
    method: "get",
  });
};

/**
 * 删除当前登录用户 OSS 对象（允许 user-upload/{userId}/... 与 user-private/images|videos/{userId}/...）
 * DELETE /api2/file/user/file?fileKey=...
 */
export const deleteUserFile = (fileKey: string) => {
  const q = new URLSearchParams({ fileKey });
  return request(`${BASE_FILE_API_URL}/user/file?${q.toString()}`, {
    method: "delete",
    headers: {
      Accept: "application/json",
    },
  });
};

/**
 * 批量删除当前登录用户 OSS 对象（fileKey 数组，body 为 JSON string[]）
 * DELETE /api2/file/user/files
 */
export const deleteUserFiles = (fileKeys: string[]) => {
  return request(`${BASE_FILE_API_URL}/user/files`, {
    method: "delete",
    body: JSON.stringify(fileKeys),
  });
};

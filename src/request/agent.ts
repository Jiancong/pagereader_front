import { request } from "./request";
import { createUserProductPointRecord } from "./generation";
import { useUserStore } from "~/composables/user";
import { getUploadResultUrl, putFileByUser, upload } from "./file";
import {
  getApiContextHeaders,
  getEditorProjectIdForApi,
  withProjectIdBody,
} from "~/utils/apiRequestContext";
import {
  pickUploadedDocumentsFromDto,
  type UploadedDocument,
} from "@/utils/pptDocumentRag";

/** 调用方未传 projectId/sessionId 时，用编辑器同步的 projectId 补全 body（与 X-Project-Id 头一致） */
function applyEditorProjectToAgentBody(requestBody: Record<string, unknown>): void {
  const pid = getEditorProjectIdForApi();
  if (!pid || requestBody.projectId || requestBody.sessionId) return;
  requestBody.projectId = pid;
}

/**
 * 文档 RAG：写入 uploaded_documents（snake_case），且不带 enable_search（后端规范 §2/§4）。
 */
function applyUploadedDocumentsAndSearchFlags(
  requestBody: Record<string, unknown>,
  requestDto: AgentChatRequestDto
): void {
  const uploadedDocs = pickUploadedDocumentsFromDto(requestDto);
  if (uploadedDocs.length > 0) {
    requestBody.uploaded_documents = uploadedDocs;
    delete requestBody.enable_search;
    return;
  }
  if (requestDto.enableSearch !== undefined) {
    requestBody.enable_search = requestDto.enableSearch;
  }
}

function isHttpImageUrl(s: string): boolean {
  const t = (s || "").trim();
  return t.startsWith("http://") || t.startsWith("https://");
}

/**
 * 本地 File 上传至 OSS；与 ChatPanel / putByUser 一致。无 userId 时走匿名 `upload`。
 */
export async function uploadFileToOssForAgent(
  file: File,
  userId: string | undefined
): Promise<string> {
  const uid = String(userId || "").trim();
  const res = uid ? await putFileByUser({ file, userId: uid }) : await upload({ file });
  const url = getUploadResultUrl(res);
  if (!url) {
    throw new Error("Image upload failed: no OSS URL in response");
  }
  return url;
}

async function uploadImageStringToOss(s: string, userId: string | undefined): Promise<string> {
  const t = (s || "").trim();
  if (!t) {
    throw new Error("empty image");
  }
  if (isHttpImageUrl(t)) {
    return t;
  }
  if (t.startsWith("data:") || t.startsWith("blob:")) {
    const r = await fetch(t);
    const b = await r.blob();
    const sub =
      b.type && b.type.indexOf("image/") === 0
        ? b.type.split("/")[1] || "png"
        : (b.type && b.type.split("/")[1]) || "bin";
    const file = new File([b], `agent-image.${sub}`, {
      type: b.type || "image/png",
    });
    return uploadFileToOssForAgent(file, userId);
  }
  throw new Error("image must be http(s) URL, data: URI, blob: URL, or File");
}

/**
 * 将 `images` / `image` 统一为 OSS https 列表，不再在 JSON 里带 `image` 单字段 base64。
 * - `images` 优先于 `image`
 * - 与 sendAgentChatWithJson / sendAgentChatWithStream 共用
 */
export async function resolveAgentChatRequestImages(
  requestDto: AgentChatRequestDto
): Promise<string[]> {
  const uid = String(requestDto.userId || "");
  if (requestDto.images && Array.isArray(requestDto.images) && requestDto.images.length > 0) {
    const out: string[] = [];
    for (const raw of requestDto.images) {
      if (typeof raw !== "string" || !raw.trim()) continue;
      const r = raw.trim();
      if (isHttpImageUrl(r)) {
        out.push(r);
      } else {
        out.push(await uploadImageStringToOss(r, uid));
      }
    }
    if (out.length) return out;
  }
  if (requestDto.image) {
    if (typeof requestDto.image === "string") {
      if (isHttpImageUrl(requestDto.image)) {
        return [requestDto.image.trim()];
      }
      return [await uploadImageStringToOss(requestDto.image, uid)];
    }
    if (requestDto.image instanceof File) {
      return [await uploadFileToOssForAgent(requestDto.image, uid)];
    }
  }
  return [];
}

// Agent聊天请求接口
export interface AgentChatRequestDto {
  message: string;
  sessionId?: string; // 保留以向后兼容
  projectId?: string; // 新增：项目ID（替代 sessionId）
  userId: string;
  /**
   * 单图入参：http(s) / data: / blob: / File；发送前会统一先上传为 OSS，请求体中仅出现 `images: string[]`。
   */
  image?: File | string | null;
  /** 多图；每项为 http(s) 或可上传的 data: / blob: 字符串，发送前会规范为 OSS URL 列表 */
  images?: string[];
  /** Seedance 2.0 等：尾帧 URL（与 images 首帧配合） */
  endImageUrl?: string;
  videoUrl?: string; // 新增：参考视频 URL（用于 Video-Edit 场景）
  aspectRatio?: string;
  model?: string;
  mjVersion?: string;
  enableSearch?: boolean; // 是否启用搜索功能
  isAgent?: boolean; // 是否启用 Agent 模式（true=完整Agent流程，false=直接生图/生视频）
  imageSize?: string; // 图片尺寸：1K, 2K, 4K（对 gemini-3-pro-image-preview 和 ark 有效）
  duration?: number; // 视频时长（秒），对于 text/image-to-video 是生成时长，对于 video-edit 是参考视频时长
  resolution?: '480p' | '720p' | '1080p' | '4K' | '768P' | '1080P'; // 视频分辨率（Seedance / Veo 3.1 / Hailuo）
  generateAudio?: boolean; // 生成音频（Veo 3.1 等使用 camelCase）
  generate_audio?: boolean; // 生成音频（seedance）
  slow_motion?: boolean; // 慢动作效果（视频模型）
  quality?: 'fast' | 'quality'; // 视频质量（Veo 3.1：fast=60点, quality=250点）
  mode?: 'std' | 'pro'; // 视频模式（Kling 3.0：std=标准, pro=专业）
  sound?: boolean; // 是否生成音频（Kling 3.0）
  size?: 'standard' | 'high'; // 视频质量（Sora 2 Pro：standard=标准, high=高质量）
  /**
   * GPT-Image 2.0 等：透传上游/网关的扩展字段（如 quality: low|medium|high, resolution: 1k|2k）。
   * 需由 sendAgentChatWithStream 写入 POST body，否则仅前端赋值不会到服务端。
   */
  extra_body?: Record<string, unknown>;
  /** Grok Imagine 图生视频（站内任务）：与后端 task_id / index 透传 */
  grokTaskId?: string;
  grokImageIndex?: number;
  /** PPT 文档 RAG：OSS 公网可读的 PDF/DOCX/MD/TXT（与 images 可同时传） */
  uploadedDocuments?: UploadedDocument[];
  uploaded_documents?: UploadedDocument[];
}

/**
 * Seedance 异步任务：创建 + 轮询总等待上限（与原先同步 generate-video 体验对齐）。
 */
export const AGENT_GENERATE_VIDEO_TIMEOUT_MS = 15 * 60 * 1000;

/** 轮询 GET /api2/agent/ark-video-task/{id} 的间隔 */
export const ARK_VIDEO_TASK_POLL_INTERVAL_MS = 10_000;

/** 单次创建/轮询请求的 fetch 超时（避免单次挂死） */
export const ARK_VIDEO_TASK_REQUEST_TIMEOUT_MS = 60 * 1000;

/**
 * 遗留：同步 POST /api2/agent/generate-video（非 Seedance 或后端代轮询场景）。
 * Seedance 2.x 请走 postSeedance2Multimodal → ark-video-task。
 */
function abortSignalForGenerateVideo(): AbortSignal | undefined {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(AGENT_GENERATE_VIDEO_TIMEOUT_MS);
  }
  return undefined;
}

function abortSignalForArkVideoShortRequest(): AbortSignal | undefined {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ARK_VIDEO_TASK_REQUEST_TIMEOUT_MS);
  }
  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function gatewayResponseCodeOk(res: any): boolean {
  if (!res || typeof res !== "object") return false;
  const c = res.code;
  return c === undefined || c === 0 || c === "0" || c === 200;
}

function pollErrorLooksTransient(res: any): boolean {
  if (!res || res.code !== 500) return false;
  const msg = String(res.message || "").toLowerCase();
  return (
    msg.includes("fetch") ||
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("aborted")
  );
}

/**
 * Seedance 多模态 / I2V 请求体（与 POST /api2/agent/ark-video-task 及遗留 generate-video 一致）。
 * - 多模态：referenceImages / referenceVideos / referenceAudios（勿与 imageUrl 混用）
 * - 单图/首尾帧 I2V：imageUrl，可选 endImageUrl
 */
export interface Seedance2MultimodalRequestDto {
  /** 与上游 curl 一致的主提示字段 */
  prompt: string;
  /** 网关/会话用 */
  message?: string;
  userId?: string;
  projectId?: string;
  /** 与 curl sessionId 一致；可与 projectId 同时传 */
  sessionId?: string;
  model: string;
  /** 参考图 ≤9 */
  referenceImages?: string[];
  /** 与 referenceImages 合并去重后写入 payload.referenceImages（不再重复传 images） */
  images?: string[];
  referenceVideos?: string[];
  referenceAudios?: string[];
  referenceAudioUrl?: string;
  aspectRatio?: string;
  duration?: number;
  resolution?: string;
  generateAudio?: boolean;
  watermark?: boolean;
  callbackUrl?: string;
  /** I2V 与多模态互斥 */
  imageUrl?: string;
  endImageUrl?: string;
}

export function extractVideoUrlFromSeedanceMultimodalResponse(
  res: any
): string | null {
  if (!res || typeof res !== "object") return null;
  const code = res.code;
  const codeOk =
    code === undefined || code === 0 || code === "0" || code === 200;
  if (!codeOk) return null;
  const pick = (d: any): string | null => {
    if (!d) return null;
    if (typeof d === "string" && /^https?:\/\//i.test(d)) return d;
    if (typeof d !== "object") return null;
    const direct =
      d.video_url || d.videoUrl || d.url || d.ossUrl;
    if (typeof direct === "string" && /^https?:\/\//i.test(direct)) {
      return direct;
    }
    if (d.content && typeof d.content === "object") {
      const cv = d.content.video_url || d.content.videoUrl;
      if (typeof cv === "string" && /^https?:\/\//i.test(cv)) return cv;
    }
    if (Array.isArray(d.videos) && d.videos.length > 0) {
      const first = d.videos[0];
      if (typeof first === "string" && /^https?:\/\//i.test(first)) {
        return first;
      }
      if (first && typeof first === "object") {
        const u =
          first.url ||
          first.videoUrl ||
          first.video_url ||
          first.ossUrl;
        if (typeof u === "string" && /^https?:\/\//i.test(u)) return u;
      }
    }
    // 网关套一层：{ code, data: { videos: [...] } }
    if (d.data != null && typeof d.data === "object") {
      const nested = pick(d.data);
      if (nested) return nested;
    }
    return null;
  };
  return pick(res.data) || pick(res);
}

/** 从创建任务响应解析方舟 task_id（兼容 data.task_id、data.data.task_id） */
export function extractArkVideoTaskIdFromCreateResponse(res: any): string | null {
  if (!res?.data || typeof res.data !== "object") return null;
  const d = res.data as Record<string, unknown>;
  const nested =
    d.data != null && typeof d.data === "object" ? (d.data as Record<string, unknown>) : null;
  const raw =
    (nested?.task_id as string | undefined) ??
    (nested?.taskId as string | undefined) ??
    (d.task_id as string | undefined) ??
    (d.taskId as string | undefined);
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  return s || null;
}

function extractArkVideoTaskStatus(res: any): string | null {
  if (!res?.data || typeof res.data !== "object") return null;
  const d = res.data as Record<string, unknown>;
  const nested =
    d.data != null && typeof d.data === "object" ? (d.data as Record<string, unknown>) : null;
  const raw = (nested?.status ?? d.status) as string | undefined;
  if (typeof raw !== "string" || !raw.trim()) return null;
  return raw.trim().toLowerCase();
}

/** GET 轮询（单次） */
export async function getArkVideoTask(taskId: string): Promise<any> {
  const id = encodeURIComponent(String(taskId).trim());
  const signal = abortSignalForArkVideoShortRequest();
  return request(`/api2/agent/ark-video-task/${id}`, {
    method: "GET",
    ...(signal ? { signal } : {}),
  });
}

/** POST 创建异步任务（单次） */
export async function postArkVideoTaskCreate(built: Record<string, unknown>): Promise<any> {
  const signal = abortSignalForArkVideoShortRequest();
  return request("/api2/agent/ark-video-task", {
    method: "POST",
    body: JSON.stringify(built),
    ...(signal ? { signal } : {}),
  });
}

/** 组装 POST ark-video-task / 遗留 generate-video 的 JSON（仅 camelCase） */
export function buildAgentGenerateVideoPayload(
  body: Seedance2MultimodalRequestDto
): Record<string, unknown> {
  const i2vUrl =
    body.imageUrl && /^https?:\/\//i.test(String(body.imageUrl).trim())
      ? String(body.imageUrl).trim()
      : "";

  const payload: Record<string, unknown> = {
    prompt: body.prompt,
    model: body.model,
  };

  if (body.aspectRatio != null && body.aspectRatio !== "") {
    payload.aspectRatio = body.aspectRatio;
  }
  if (body.duration !== undefined && body.duration !== null) {
    payload.duration = body.duration;
  }
  if (body.resolution) payload.resolution = body.resolution;
  if (body.generateAudio !== undefined) payload.generateAudio = body.generateAudio;
  if (body.watermark !== undefined) payload.watermark = body.watermark;
  if (body.callbackUrl) payload.callbackUrl = body.callbackUrl;
  if (body.userId != null && body.userId !== "") {
    payload.userId = String(body.userId);
  }
  if (body.sessionId) payload.sessionId = body.sessionId;
  if (body.projectId) payload.projectId = body.projectId;
  if (body.message) payload.message = body.message;

  // ─── I2V：与多模态互斥，勿传 reference* ───
  if (i2vUrl) {
    payload.imageUrl = i2vUrl;
    if (body.endImageUrl && /^https?:\/\//i.test(String(body.endImageUrl).trim())) {
      payload.endImageUrl = String(body.endImageUrl).trim();
    }
    return payload;
  }

  const videos = body.referenceVideos?.filter(Boolean) ?? [];
  const refImages = [
    ...new Set([
      ...(body.referenceImages?.filter(Boolean) ?? []),
      ...(body.images?.filter(Boolean) ?? []),
    ]),
  ];
  const audioList = [...(body.referenceAudios?.filter(Boolean) ?? [])];
  if (body.referenceAudioUrl && /^https?:\/\//i.test(body.referenceAudioUrl.trim())) {
    audioList.push(body.referenceAudioUrl.trim());
  }
  const referenceAudios = [...new Set(audioList)];

  if (videos.length > 0) {
    payload.referenceVideos = videos;
  }
  if (refImages.length > 0) {
    payload.referenceImages = refImages;
  }
  if (referenceAudios.length > 0) {
    payload.referenceAudios = referenceAudios;
  }

  return payload;
}

/** @deprecated 使用 buildAgentGenerateVideoPayload */
export const buildSeedance2MultimodalPayload = buildAgentGenerateVideoPayload;

/** 同步长连接：POST /api2/agent/generate-video（非 Seedance 2.x 或后端代轮询时使用） */
export async function postAgentGenerateVideo(
  body: Seedance2MultimodalRequestDto
): Promise<any> {
  const built = buildAgentGenerateVideoPayload(body);
  const hasI2v = typeof built.imageUrl === "string";
  if (!hasI2v) {
    const hasVid = Array.isArray(built.referenceVideos) && built.referenceVideos.length > 0;
    const hasImg =
      Array.isArray(built.referenceImages) && built.referenceImages.length > 0;
    if (!hasVid && !hasImg) {
      console.warn(
        "generate-video: 多模态缺少 referenceVideos 与 referenceImages，上游一般要求至少其一"
      );
    }
  }
  const signal = abortSignalForGenerateVideo();
  return request("/api2/agent/generate-video", {
    method: "POST",
    body: JSON.stringify(built),
    ...(signal ? { signal } : {}),
  });
}

/**
 * Seedance 2.0 / Fast：POST /api2/agent/ark-video-task 创建任务 + GET 轮询，
 * 避免浏览器长时间占用单条 HTTP 导致 499 / ERR_EMPTY_RESPONSE。
 */
export async function postSeedance2Multimodal(
  body: Seedance2MultimodalRequestDto
): Promise<any> {
  const built = buildAgentGenerateVideoPayload(body);
  const hasI2v = typeof built.imageUrl === "string";
  if (!hasI2v) {
    const hasVid = Array.isArray(built.referenceVideos) && built.referenceVideos.length > 0;
    const hasImg =
      Array.isArray(built.referenceImages) && built.referenceImages.length > 0;
    if (!hasVid && !hasImg) {
      console.warn(
        "ark-video-task: 多模态缺少 referenceVideos 与 referenceImages，上游一般要求至少其一"
      );
    }
  }

  const createRes = await postArkVideoTaskCreate(built);
  if (!gatewayResponseCodeOk(createRes)) {
    return createRes;
  }

  const taskId = extractArkVideoTaskIdFromCreateResponse(createRes);
  if (!taskId) {
    console.error("ark-video-task: 创建响应缺少 task_id", createRes);
    return {
      code: 500,
      message: "ark-video-task: missing task_id in response",
      data: createRes?.data ?? null,
    };
  }

  const deadline = Date.now() + AGENT_GENERATE_VIDEO_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const pollRes = await getArkVideoTask(taskId);

    if (!gatewayResponseCodeOk(pollRes)) {
      if (pollErrorLooksTransient(pollRes) && Date.now() < deadline) {
        await sleep(ARK_VIDEO_TASK_POLL_INTERVAL_MS);
        continue;
      }
      return pollRes;
    }

    const st = extractArkVideoTaskStatus(pollRes);
    const videoUrl = extractVideoUrlFromSeedanceMultimodalResponse(pollRes);

    if (st === "failed" || st === "expired" || st === "cancelled" || st === "canceled") {
      return pollRes;
    }

    if (videoUrl) {
      return pollRes;
    }

    if (st === "succeeded" || st === "success") {
      return pollRes;
    }

    await sleep(ARK_VIDEO_TASK_POLL_INTERVAL_MS);
  }

  return {
    code: 500,
    message: "ark-video-task: poll timeout",
    data: { taskId },
  };
}

/** 取消慢队列中的 Agent 任务（本人、flags 含慢队列、PENDING/PROCESSING） */
export function postCancelSlowQueueTask(payload: {
  taskId: number | string;
  userId: string;
}) {
  const rawId = payload.taskId;
  const taskId =
    typeof rawId === "string" ? parseInt(String(rawId), 10) : Number(rawId);
  return request("/api2/agent/task/cancel-slow-queue", {
    method: "POST",
    body: JSON.stringify({
      taskId: Number.isFinite(taskId) ? taskId : rawId,
      userId: String(payload.userId),
    }),
  });
}

// Agent聊天响应接口
export interface AgentChatResponseVo {
  message?: string;
  session_id?: string;
  status?: string;
  error?: string;
  [key: string]: any;
}

// Agent历史记录响应接口
export interface AgentHistoryResponseVo {
  history?: Array<{
    role: string;
    content: string;
    timestamp?: string;
  }>;
  status?: string;
  message?: string;
  [key: string]: any;
}

/**
 * 发送消息到Agent服务 - 表单方式
 * @param message 用户消息
 * @param userId 用户ID
 * @param sessionId 会话ID (可选，已废弃，使用 projectId)
 * @param image 图片文件 (可选)
 * @param aspectRatio 宽高比 (可选)
 * @param model 模型选择 (可选)
 * @param mjVersion Midjourney版本 (可选)
 * @param enableSearch 是否启用搜索功能 (可选)
 * @param projectId 项目ID (可选)
 * @returns 聊天结果
 */
export const sendAgentChatWithForm = async (
  message: string,
  userId: string,
  sessionId?: string,
  image?: File,
  aspectRatio?: string,
  model?: string,
  mjVersion?: string,
  enableSearch?: boolean,
  projectId?: string
): Promise<AgentChatResponseVo> => {
  try {
    // 先扣除用户点数
    // await createUserProductPointRecord(userId, 'AGENT_CHAT', '');

    // 创建FormData
    const formData = new FormData();
    formData.append('message', message);
    formData.append('userId', userId);
    
    // 优先使用 projectId，如果没有则使用 sessionId（向后兼容），再退回编辑器同步的 projectId
    const ctxPid = getEditorProjectIdForApi();
    if (projectId) {
      formData.append('projectId', projectId);
    } else if (sessionId) {
      formData.append('sessionId', sessionId);
    } else if (ctxPid) {
      formData.append('projectId', ctxPid);
    }

    // 添加图片文件
    if (image) {
      formData.append('image', image);
    }

    // 添加宽高比参数
    if (aspectRatio) {
      formData.append('aspectRatio', aspectRatio);
    }

    // 添加模型参数
    if (model) {
      formData.append('model', model);
    }

    // 添加Midjourney版本参数
    if (mjVersion) {
      formData.append('mjVersion', mjVersion);
    }

    // 添加搜索开关参数
    if (enableSearch !== undefined) {
      formData.append('enable_search', enableSearch.toString());
    }

    // 发送请求
    const response = await request('/api2/agent/chat', {
      method: 'post',
      body: formData
    });

    return response;
  } catch (error) {
    console.error('Agent聊天请求失败:', error);
    throw error;
  }
};

/**
 * 发送消息到Agent服务 - JSON方式
 * @param requestDto 请求数据对象
 * @returns 聊天结果
 */
export const sendAgentChatWithJson = async (
  requestDto: AgentChatRequestDto
): Promise<AgentChatResponseVo> => {
  try {
    // // 先扣除用户点数
    // await createUserProductPointRecord(requestDto.userId, 'AGENT_CHAT', '');

    const imagesArray = await resolveAgentChatRequestImages(requestDto);
    const useImagesArray = imagesArray.length > 0;

    // 构建请求体
    const requestBody: any = {
      message: requestDto.message,
      userId: requestDto.userId,
    };
    
    // 优先使用 projectId，如果没有则使用 sessionId（向后兼容）
    if (requestDto.projectId) {
      requestBody.projectId = requestDto.projectId;
    } else if (requestDto.sessionId) {
      requestBody.sessionId = requestDto.sessionId;
    }
    applyEditorProjectToAgentBody(requestBody);

    if (useImagesArray) {
      requestBody.images = imagesArray;
    }
    
    console.log('Agent API 请求体:', {
      ...requestBody,
      images: useImagesArray ? imagesArray : undefined,
      usingImagesArray: useImagesArray,
      usingImageUrl: useImagesArray
    });

    // 添加宽高比参数（如果提供）
    if (requestDto.aspectRatio) {
      requestBody.aspectRatio = requestDto.aspectRatio;
    }

    // 添加模型参数（如果提供）
    if (requestDto.model) {
      requestBody.model = requestDto.model;
    }

    // 添加Midjourney版本参数（如果提供）
    if (requestDto.mjVersion) {
      requestBody.mjVersion = requestDto.mjVersion;
    }

    // 添加 Agent 模式参数（如果提供）
    if (requestDto.isAgent !== undefined) {
      requestBody.isAgent = requestDto.isAgent;
    }

    applyUploadedDocumentsAndSearchFlags(requestBody, requestDto);

    // 添加图片尺寸参数（如果提供，且模型支持）
    if (requestDto.imageSize && requestDto.model) {
      // 只有 gemini-3-pro-image-preview 和 ark 模型支持 imageSize
      if (requestDto.model === 'gemini-3-pro-image-preview' || requestDto.model === 'ark') {
        requestBody.imageSize = requestDto.imageSize;
        console.log('添加 imageSize 参数:', requestDto.imageSize);
      }
    }

    // 添加视频参数（如果提供）
    if (requestDto.videoUrl) {
      requestBody.videoUrl = requestDto.videoUrl;
      console.log('添加 videoUrl 参数:', requestDto.videoUrl);
    }
    if (typeof requestDto.duration === 'number') {
      requestBody.duration = requestDto.duration;
      console.log('添加 duration 参数:', requestDto.duration);
    }
    if (requestDto.resolution) {
      requestBody.resolution = requestDto.resolution;
      console.log('添加 resolution 参数:', requestDto.resolution);
    }
    if (requestDto.generateAudio !== undefined) {
      requestBody.generateAudio = requestDto.generateAudio;
      console.log('添加 generateAudio 参数:', requestDto.generateAudio);
    }
    if (requestDto.generate_audio !== undefined) {
      requestBody.generate_audio = requestDto.generate_audio;
      console.log('添加 generate_audio 参数:', requestDto.generate_audio);
    }
    if (requestDto.slow_motion !== undefined) {
      requestBody.slow_motion = requestDto.slow_motion;
      console.log('添加 slow_motion 参数:', requestDto.slow_motion);
    }
    if (requestDto.quality) {
      requestBody.quality = requestDto.quality;
      console.log('添加 quality 参数:', requestDto.quality);
    }
    if (requestDto.mode) {
      requestBody.mode = requestDto.mode;
      console.log('添加 mode 参数:', requestDto.mode);
    }
    if (requestDto.sound !== undefined) {
      requestBody.sound = requestDto.sound;
      console.log('添加 sound 参数:', requestDto.sound);
    }
    if (requestDto.size) {
      requestBody.size = requestDto.size;
      console.log('添加 size 参数:', requestDto.size);
    }
    if (requestDto.endImageUrl) {
      requestBody.endImageUrl = requestDto.endImageUrl;
      console.log('添加 endImageUrl 参数:', requestDto.endImageUrl);
    }

    // 根据图片类型选择不同的 API 端点
    // 如果有图片（URL 或数组），使用 /chat-image 接口；否则使用 /chat 接口
    const apiEndpoint = useImagesArray ? '/api2/agent/chat-image' : '/api2/agent/chat';
    
    console.log('使用 API 端点:', apiEndpoint);

    // 发送请求
    const response = await request(apiEndpoint, {
      method: 'post',
      body: JSON.stringify(requestBody)
    });

    return response;
  } catch (error) {
    console.error('Agent聊天JSON请求失败:', error);
    throw error;
  }
};

/**
 * 发送消息到Agent服务 - 自动选择表单或JSON方式
 * @param message 用户消息
 * @param userId 用户ID
 * @param sessionId 会话ID (可选)
 * @param image 图片文件 (可选)
 * @returns 聊天结果
 */
export const sendAgentChat = async (
  message: string,
  userId: string,
  sessionId?: string,
  image?: File
): Promise<AgentChatResponseVo> => {
  // 如果有图片，使用表单方式，否则使用JSON方式
  if (image) {
    return sendAgentChatWithForm(message, userId, sessionId, image);
  } else {
    const requestDto: AgentChatRequestDto = {
      message,
      userId,
      sessionId
    };
    return sendAgentChatWithJson(requestDto);
  }
};

/**
 * 获取Agent聊天历史记录
 * @param sessionId 会话ID
 * @param userId 用户ID
 * @returns 历史记录结果
 */
export const getAgentHistory = async (
  sessionId: string,
  userId: string
): Promise<AgentHistoryResponseVo> => {
  try {
    // 构建URL参数
    const url = `/api2/agent/history?sessionId=${encodeURIComponent(sessionId)}&userId=${encodeURIComponent(userId)}`;

    // 发送请求
    const response = await request(url, {
      method: 'get'
    });

    return response;
  } catch (error) {
    console.error('获取Agent历史记录请求失败:', error);
    throw error;
  }
};

/**
 * 重置Agent聊天会话
 * @param sessionId 会话ID
 * @param userId 用户ID
 * @returns 重置结果
 */
export const resetAgentChat = async (
  sessionId: string,
  userId: string
): Promise<{ status?: string; message?: string; [key: string]: any }> => {
  try {
    // 构建URL参数
    const url = `/api2/agent/reset?sessionId=${encodeURIComponent(sessionId)}&userId=${encodeURIComponent(userId)}`;

    // 发送请求
    const response = await request(url, {
      method: 'post'
    });

    return response;
  } catch (error) {
    console.error('重置Agent聊天会话请求失败:', error);
    throw error;
  }
};

/**
 * 检查图片状态
 * @param imageUrl 图片URL
 * @param userId 用户ID
 * @returns 图片状态结果
 */
export const checkAgentImageStatus = async (
  imageUrl: string,
  userId: string,
  sessionId?: string
): Promise<{ status?: string; message?: string; [key: string]: any }> => {
  try {
    // 构建URL参数
    let url = `/api2/agent/check_image_status?imageUrl=${encodeURIComponent(imageUrl)}&userId=${encodeURIComponent(userId)}`;
    
    // 添加 sessionId 参数（如果提供）
    if (sessionId) {
      url += `&sessionId=${encodeURIComponent(sessionId)}`;
    }

    console.log('检查图片状态 URL:', url);

    // 发送请求
    const response = await request(url, {
      method: 'get'
    });

    return response;
  } catch (error) {
    console.error('检查Agent图片状态请求失败:', error);
    throw error;
  }
};

/**
 * 上传图片到Agent服务
 * @param userId 用户ID
 * @param sessionId 会话ID (可选)
 * @param image 图片文件
 * @returns 上传结果
 */
export const uploadAgentImage = async (
  userId: string,
  image: File,
  sessionId?: string
): Promise<{ imageUrl?: string; status?: string; message?: string; [key: string]: any }> => {
  try {
    // 创建FormData
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('image', image);

    const ctxPid = getEditorProjectIdForApi();
    if (sessionId) {
      formData.append('sessionId', sessionId);
    } else if (ctxPid) {
      formData.append('projectId', ctxPid);
    }

    // 发送请求
    const response = await request('/api2/agent/upload_image', {
      method: 'post',
      body: formData
    });

    return response;
  } catch (error) {
    console.error('上传图片到Agent服务请求失败:', error);
    throw error;
  }
};

/**
 * 使用Base64图片数据上传到Agent服务
 * @param userId 用户ID
 * @param base64Image Base64编码的图片数据
 * @param sessionId 会话ID (可选)
 * @returns 上传结果
 */
export const uploadAgentImageWithBase64 = async (
  userId: string,
  base64Image: string,
  sessionId?: string
): Promise<{ imageUrl?: string; status?: string; message?: string; [key: string]: any }> => {
  try {
    // 将Base64转换为Blob
    const byteString = atob(base64Image.split(',')[1]);
    const mimeString = base64Image.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    const file = new File([blob], "image.png", { type: mimeString });

    // 调用上传图片方法
    return uploadAgentImage(userId, file, sessionId);
  } catch (error) {
    console.error('使用Base64上传图片到Agent服务请求失败:', error);
    throw error;
  }
};

// Agent Context 添加接口请求参数
export interface AgentContextAddRequestDto {
  sessionId?: string;
  projectId?: string;
  userId: string | number;
  role: 'user' | 'assistant';
  assistantResponse?: string;
  imageUrls?: string[];
}

/**
 * 添加 Agent 上下文（用于保存 Midjourney 生成的图片等）
 * @param requestDto 请求参数
 * @returns 响应数据
 */
export const addAgentContext = async (
  requestDto: AgentContextAddRequestDto
): Promise<{ code?: number; message?: string; data?: any; [key: string]: any }> => {
  try {
    const requestBody: any = {
      userId: requestDto.userId,
      role: requestDto.role,
      assistantResponse: requestDto.assistantResponse || '',
      imageUrls: requestDto.imageUrls || [],
    };
    
    // 优先使用 projectId，如果没有则使用 sessionId（向后兼容）
    if (requestDto.projectId) {
      requestBody.projectId = requestDto.projectId;
    } else if (requestDto.sessionId) {
      requestBody.sessionId = requestDto.sessionId;
    }
    applyEditorProjectToAgentBody(requestBody);

    const response = await request(
      '/api2/agent/context/add',
      {
        method: 'POST',
        body: JSON.stringify(requestBody),
      }
    );

    return response;
  } catch (error) {
    console.error('添加 Agent 上下文失败:', error);
    throw error;
  }
};

/**
 * SSE事件类型
 */
export type SSEEventType = 
  | 'connected'                    // 连接成功
  | 'task_created'                 // 任务创建（视频任务等）
  | 'model_selected'               // 模型选择
  | 'product_analysis'             // 产品分析
  | 'product_research_complete'    // 产品调研完成
  | 'requirements_collected'       // 需求收集完成
  | 'design_start'                 // 设计开始
  | 'design_complete'              // 设计完成
  | 'image_generation_start'       // 图片生成开始
  | 'image_generation_progress'    // 图片生成进度
  | 'image_generation_complete'    // 图片生成完成
  | 'image_analysis_start'         // 图片分析开始
  | 'image_analysis_complete'      // 图片分析完成
  | 'video_generation_start'       // 视频生成开始
  | 'video_generation_progress'    // 视频生成进度
  | 'video_complete'               // 视频生成完成
  | 'search_understanding'         // 搜索：理解用户需求
  | 'search_query_progress'        // 搜索：查询进度
  | 'search_query_result'          // 搜索：单个查询结果
  | 'search_images_progress'       // 搜索：图片搜索进度
  | 'search_images_result'         // 搜索：图片搜索结果
  | 'search_complete'              // 搜索：搜索完成（AI综合总结）
  | 'knowledge_response'           // 知识库直答
  | 'progress'                     // 通用任务进度（如 status: processing）
  | 'ppt_progress'                 // PPT 生成进度（in_progress）
  | 'ppt_ping'                     // PPT 通道保活（可选 message）
  | 'ppt_complete'                 // PPT 生成完成
  | 'word_complete'                // Word 文档生成完成
  | 'complete'                     // 全部完成
  | 'error'                        // 错误
  | 'llm_text_stream_start'        // LLM 文本分片开始（可选，打字机；完整仍在原事件）
  | 'llm_text_stream_delta'
  | 'llm_text_stream_end';

/**
 * SSE事件数据接口
 */
export interface SSEEventData {
  event: SSEEventType;
  data: {
    analysis?: string;
    image_url?: string;
    image_urls?: string[];
    videos?: string[];
    response?: string;
    message?: string;
    error?: string;
    progress_status?: string;
    estimated_time?: number;
    duration?: number;
    model?: string;
    model_provider?: string;
    intent?: string;
    // PPT 进度字段
    status?: string;          // e.g. "in_progress"
    phase?: number;           // 当前阶段
    current_slide?: number;   // 当前幻灯片
    total_slides?: number;    // 总幻灯片数
    html_template_pick?: { template_id?: string; pick_source?: string };
    /** OSS 产物 URL（与 ppt_data_url / word_data_url 等价，优先使用） */
    remote_url?: string;
    /** OSS 产物 URL（SKILL_ARTIFACT_KEEP_INLINE=0 时由 ppt_complete 返回） */
    ppt_data_url?: string;
    ppt_data_oss_uploaded?: boolean;
    ppt_data_artifact?: {
      artifact_id?: string;
      sha256?: string;
      size_bytes?: number;
      oss_key?: string;
    };
    is_ppt_response?: boolean;
    ppt_generation?: boolean;
    word_data_url?: string;
    word_data_oss_uploaded?: boolean;
    word_data_artifact?: {
      artifact_id?: string;
      sha256?: string;
      size_bytes?: number;
      oss_key?: string;
    };
    _artifact?: boolean;
    _artifact_kind?: string;
    _artifact_url?: string;
    artifact_id?: string;
    word_data?: {
      _artifact?: boolean;
      _artifact_kind?: string;
      _artifact_url?: string;
      title?: string;
      subtitle?: string;
      total_chapters?: number;
      docx_url?: string;
      body?: string;
      chapters?: Array<Record<string, unknown>>;
      outline?: Array<Record<string, unknown>>;
      sections?: Array<Record<string, unknown>>;
      blocks?: Array<Record<string, unknown>>;
      [key: string]: unknown;
    };
    // PPT 完成数据（内联完整 deck 或仅 stub：title / total_slides + _artifact_url）
    ppt_data?: {
      _artifact?: boolean;
      _artifact_kind?: string;
      _artifact_url?: string;
      title?: string;
      subtitle?: string;
      theme?: string;
      palette?: {
        bg_color?: string;
        bg_color_secondary?: string;
        accent_color?: string;
        accent_colors?: string[];
        text_color?: string;
        text_secondary?: string;
        css_variables?: Record<string, string>;
        mood?: string;
        label?: string;
        theme_tokens?: {
          scheme?: string;
          tagline?: string;
          typography?: {
            font_body?: string;
            font_heading?: string;
            google_fonts_urls?: string[];
            heading_letter_spacing?: string | number;
            tagline?: string;
          };
          shape?: {
            card_border_radius_px?: number;
            border_width_px?: number;
          };
        };
      };
      html_template_recommendation?: {
        template_id?: string;
        template_path?: string;
        pick_source?: string;
        accent_colors?: string[];
        css_variables?: Record<string, string>;
        palette_from_html_template?: Record<string, unknown>;
      };
      chapter_images?: Array<{
        chapter_number: string;
        chapter_index: number;
        section_slide_index: number;
        chapter_title: string;
        images: Array<{
          url: string;
          thumbnail?: string;
          title?: string;
          source?: string;
          query?: string;
        }>;
      }>;
      slides?: Array<{
        index?: number;
        layout?: string;
        emphasis_layout?: string;
        metric_cards?: Array<{
          value?: string;
          label?: string;
          detail?: string;
          accent_color?: string;
        }>;
        right_items?: Array<{
          index?: string;
          title?: string;
          description?: string;
          accent_color?: string;
        }>;
        hero_metric?: {
          value?: string;
          caption?: string;
          accent_color?: string;
        };
        chart?: {
          type?: string;
          colors?: string[];
          data?: unknown[];
          [key: string]: unknown;
        };
        [key: string]: unknown;
      }>;
      [key: string]: any;
    };
    // Listing 流程字段
    stage?: string;           // e.g. "listing_generate_image"
    step?: number;
    total?: number;
    display_title?: string;
    slot?: string;
    summary?: string;
    [key: string]: any;
  };
}

/**
 * SSE事件回调函数类型
 */
export type SSEEventCallback = (eventData: SSEEventData) => void;

/**
 * 使用SSE流式接口发送Agent聊天请求
 * @param requestDto 请求数据对象
 * @param onEvent SSE事件回调函数
 * @param onError 错误回调函数
 * @param onComplete 完成回调函数
 * @param timeout 超时时间（毫秒），默认 10 分钟（600000ms）
 * @returns 一个包含close方法的对象，用于关闭连接
 */
export const sendAgentChatWithStream = async (
  requestDto: AgentChatRequestDto,
  onEvent: SSEEventCallback,
  onError?: (error: Error) => void,
  onComplete?: () => void,
  timeout: number = 600000 // 默认 10 分钟超时，适用于视频生成
): Promise<{ close: () => void }> => {
  let eventSource: EventSource | null = null;
  let isClosed = false;
  let timeoutId: NodeJS.Timeout | null = null;

  try {
    const imagesArray = await resolveAgentChatRequestImages(requestDto);
    const useImagesArray = imagesArray.length > 0;
    if (useImagesArray) {
      console.log("SSE: 使用多图 images（OSS URL）:", imagesArray);
    }

    // 构建请求体
    const requestBody: any = {
      message: requestDto.message,
      userId: requestDto.userId,
    };
    
    // 优先使用 projectId，如果没有则使用 sessionId
    if (requestDto.projectId) {
      requestBody.projectId = requestDto.projectId;
    } else if (requestDto.sessionId) {
      requestBody.sessionId = requestDto.sessionId;
    }
    applyEditorProjectToAgentBody(requestBody);

    if (useImagesArray) {
      requestBody.images = imagesArray;
    }

    // 添加可选参数
    if (requestDto.aspectRatio) requestBody.aspectRatio = requestDto.aspectRatio;
    if (requestDto.model) requestBody.model = requestDto.model;
    if (requestDto.mjVersion) requestBody.mjVersion = requestDto.mjVersion;
    if (requestDto.isAgent !== undefined) requestBody.isAgent = requestDto.isAgent;
    applyUploadedDocumentsAndSearchFlags(requestBody, requestDto);
    if (requestDto.imageSize) requestBody.imageSize = requestDto.imageSize;
    if (requestDto.videoUrl) requestBody.videoUrl = requestDto.videoUrl;
    if (typeof requestDto.duration === 'number') requestBody.duration = requestDto.duration;
    if (requestDto.resolution) requestBody.resolution = requestDto.resolution;
    if (requestDto.generateAudio !== undefined) requestBody.generateAudio = requestDto.generateAudio;
    if (requestDto.generate_audio !== undefined) requestBody.generate_audio = requestDto.generate_audio;
    if (requestDto.slow_motion !== undefined) requestBody.slow_motion = requestDto.slow_motion;
    if (requestDto.quality) requestBody.quality = requestDto.quality;
    if (requestDto.mode) requestBody.mode = requestDto.mode;
    if (requestDto.sound !== undefined) requestBody.sound = requestDto.sound;
    if (requestDto.size) requestBody.size = requestDto.size;
    if (requestDto.endImageUrl) requestBody.endImageUrl = requestDto.endImageUrl;
    if (typeof requestDto.grokTaskId === 'string' && requestDto.grokTaskId.trim()) {
      const gid = requestDto.grokTaskId.trim();
      requestBody.grokTaskId = gid;
      requestBody.task_id = gid;
    }
    if (typeof requestDto.grokImageIndex === 'number' && !Number.isNaN(requestDto.grokImageIndex)) {
      requestBody.grokImageIndex = requestDto.grokImageIndex;
      requestBody.index = requestDto.grokImageIndex;
    }
    if (
      requestDto.extra_body != null &&
      typeof requestDto.extra_body === "object" &&
      !Array.isArray(requestDto.extra_body)
    ) {
      requestBody.extra_body = requestDto.extra_body;
      const ex = requestDto.extra_body as Record<string, unknown>;
      // 兼容后端从根节点读 GPT-Image 2.0 的 quality / resolution（与 WaveSpeed 一致）
      if (typeof ex.quality === "string" && ex.quality) {
        (requestBody as Record<string, unknown>).quality = ex.quality;
      }
      if (typeof ex.resolution === "string" && ex.resolution) {
        (requestBody as Record<string, unknown>).resolution = ex.resolution;
      }
    }

    console.log('SSE: 准备连接，请求体:', requestBody);

    // 获取用户 token
    const userStore = useUserStore();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // 添加认证 token（与普通 request 函数保持一致）
    if (userStore.token) {
      headers['Authorization'] = userStore.token;
    }
    Object.assign(headers, getApiContextHeaders());

    console.log('SSE: 请求头（包含认证）:', headers);

    // 创建一个隐藏的iframe来发送POST请求并建立SSE连接
    // 注意：标准的EventSource不支持POST请求，我们需要使用fetch + ReadableStream
    const response = await fetch('/api2/agent/chat-stream', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
      // 保持连接活跃，防止浏览器或中间件关闭长时间空闲的连接
      keepalive: true,
      // 禁用缓存，确保实时接收数据
      cache: 'no-cache',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    // 使用ReadableStream读取SSE数据
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // 超时管理：每次收到数据时重置超时定时器
    const resetTimeout = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (timeout > 0 && !isClosed) {
        timeoutId = setTimeout(() => {
          if (!isClosed) {
            console.warn(`SSE: ⏰ 连接超时（${timeout / 1000}秒内无数据），关闭连接`);
            isClosed = true;
            reader.cancel();
            if (onError) {
              onError(new Error(`SSE connection timeout: no data received for ${timeout / 1000} seconds`));
            }
          }
        }, timeout);
      }
    };

    const normalizeSseEventName = (value: unknown): string =>
      String(value || '').trim().toLowerCase();

    /** chat-stream 内嵌 JSON 可映射为 SSE 事件名的字段（按优先级尝试） */
    const SSE_EVENT_ALIASES = new Set<SSEEventType>([
      'knowledge_response',
      'complete',
      'error',
      'progress',
      'ppt_complete',
      'word_complete',
      'search_complete',
      'design_complete',
      'image_generation_complete',
      'video_complete',
      'llm_text_stream_start',
      'llm_text_stream_delta',
      'llm_text_stream_end',
    ]);

    const payloadHasKnowledgeResponseText = (payload: any): boolean =>
      payload?.response != null ||
      payload?.message != null ||
      payload?.full_text != null;

    /**
     * 统一 SSE 事件名：大小写、以及「event: 行丢失但 JSON 里带 event」的代理场景。
     * 后端有时会通过 `event: message` + `{ event: "progress", data: ... }`
     * 转发 chat-stream 事件，前端需要按内嵌 event 分派才能更新加载条文案。
     * 文档 RAG 等场景还会用 `status: "knowledge_response"` 或
     * `{ source_event, full_text, field }` 收尾，也需在此归一化。
     */
    const resolveEffectiveSseEvent = (
      wire: string,
      payload: any
    ): string => {
      if (payload && typeof payload === 'object') {
        // delta 优先：即使 wire 为 knowledge_response，分片仍走打字机
        if (
          (typeof (payload as any).delta === 'string' || (payload as any).delta != null) &&
          ((payload as any).field != null || (payload as any).stream_id != null)
        ) {
          return 'llm_text_stream_delta';
        }
      }

      const w = normalizeSseEventName(wire);
      if (w && w !== 'message') {
        return w;
      }
      if (payload && typeof payload === 'object') {
        const emb = (payload as any).event ?? (payload as any).type;
        if (typeof emb === 'string') {
          const e = normalizeSseEventName(emb);
          if (e) {
            return e;
          }
        }
        // full_text 收尾包：{ field, full_text, source_event: "knowledge_response" }
        const sourceEvent = normalizeSseEventName((payload as any).source_event);
        if (
          sourceEvent === 'knowledge_response' &&
          payloadHasKnowledgeResponseText(payload)
        ) {
          return 'knowledge_response';
        }
        // 整包状态：{ status: "knowledge_response", response: "..." }
        const status = normalizeSseEventName((payload as any).status);
        if (
          status === 'knowledge_response' &&
          payloadHasKnowledgeResponseText(payload)
        ) {
          return 'knowledge_response';
        }
        if (status && SSE_EVENT_ALIASES.has(status as SSEEventType)) {
          return status;
        }
        // llm_text_stream_end 有时只带 full_text + field
        if (
          (payload as any).full_text != null &&
          (payload as any).field != null &&
          !(payload as any).delta
        ) {
          return 'llm_text_stream_end';
        }
      }
      return w || String(wire || '');
    };

    const unwrapSseEventPayload = (payload: any, effectiveEvent: string): any => {
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return payload;
      }
      const embeddedEvent = normalizeSseEventName((payload as any).event ?? (payload as any).type);
      const innerData = (payload as any).data;
      if (
        embeddedEvent === normalizeSseEventName(effectiveEvent) &&
        typeof innerData === 'string'
      ) {
        return { ...payload, message: innerData };
      }
      if (
        embeddedEvent === normalizeSseEventName(effectiveEvent) &&
        innerData &&
        typeof innerData === 'object' &&
        !Array.isArray(innerData)
      ) {
        return { ...payload, ...innerData };
      }
      return payload;
    };

    // 辅助函数：处理单个事件（必须在 processStream 之前定义）
    const processEvent = (eventType: SSEEventType, dataLines: string[]) => {
      try {
        // 合并多行 data —— 优先无分隔拼接（大 JSON 被传输层拆行时），
        // 如果无分隔拼接解析失败再尝试 \n 拼接（SSE 规范的多行文本场景）
        let dataStr = dataLines.join('');
        
        console.log('SSE: ✅ 处理完整事件:', eventType, `(${dataLines.length}行数据)`);
        console.log('SSE: 📦 数据内容:', dataStr.substring(0, 200) + (dataStr.length > 200 ? '...' : ''));
        
        let eventData: any = null;
        try {
          eventData = JSON.parse(dataStr);
        } catch (e) {
          // 无分隔拼接失败，尝试 \n 拼接（标准 SSE 多行文本）
          if (dataLines.length > 1) {
            const dataStrNewline = dataLines.join('\n');
            try {
              eventData = JSON.parse(dataStrNewline);
            } catch (_e2) {
              console.warn('SSE: ⚠️ 无法解析JSON数据（已尝试两种拼接方式）:', dataStr.substring(0, 300));
              eventData = { message: dataStrNewline }; // 降级处理：将原始文本作为 message
            }
          } else {
            console.warn('SSE: ⚠️ 无法解析JSON数据:', dataStr.substring(0, 300));
            eventData = { message: dataStr }; // 降级处理：将原始文本作为 message
          }
        }
        
        const effectiveEvent = resolveEffectiveSseEvent(String(eventType), eventData) as SSEEventType;
        if (String(eventType) !== effectiveEvent) {
          console.log('SSE: 🔧 归一化事件名:', String(eventType), '→', effectiveEvent);
        }

        const callbackData = unwrapSseEventPayload(eventData, effectiveEvent);

        // 调用事件回调
        onEvent({
          event: effectiveEvent,
          data: callbackData,
        });

        // 如果是 complete / error / video_complete 事件，准备关闭连接（视频流常以 video_complete 收尾）
        if (
          effectiveEvent === 'complete' ||
          effectiveEvent === 'error' ||
          effectiveEvent === 'video_complete'
        ) {
          console.log('SSE: 🏁 收到结束事件，准备关闭连接:', effectiveEvent);
          if (
            (effectiveEvent === 'complete' || effectiveEvent === 'video_complete') &&
            onComplete
          ) {
            onComplete();
          }
          // 清除超时定时器
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          isClosed = true;
        }
      } catch (error) {
        console.error('SSE: ❌ 处理事件时出错:', error);
      }
    };

    const processStream = async () => {
      let eventType: SSEEventType | null = null;
      let dataLines: string[] = [];
      
      try {
        while (!isClosed) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('SSE: 流结束');
            // 清除超时定时器
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            // 流结束后，处理最后可能剩余的事件
            if (dataLines.length > 0) {
              if (eventType) {
                processEvent(eventType, dataLines);
              } else {
                try {
                  const j = JSON.parse(dataLines.join(''));
                  const inferredEvent = resolveEffectiveSseEvent('', j);
                  if (inferredEvent) {
                    processEvent(inferredEvent as SSEEventType, dataLines);
                  }
                } catch {
                  /* noop */
                }
              }
            }
            if (onComplete) onComplete();
            break;
          }

          // 收到数据，重置超时定时器
          resetTimeout();

          // 解码数据并添加到缓冲区
          buffer += decoder.decode(value, { stream: true });
          
          // 按行处理SSE数据
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // 保留最后一行（可能不完整）

          for (const line of lines) {
            const trimmedLine = line.trim();
            
            // 跳过注释和空行（但空行也用于触发事件）
            if (trimmedLine.startsWith(':')) {
              continue; // 注释行
            }
            
            if (trimmedLine.startsWith('event:')) {
              // 新事件开始，处理上一个事件（如果有）
              if (eventType && dataLines.length > 0) {
                processEvent(eventType, dataLines);
              }
              
              // 解析新事件类型
              eventType = trimmedLine.substring(6).trim() as SSEEventType;
              dataLines = [];
              console.log('SSE: 📥 收到事件类型:', eventType);
            } else if (trimmedLine.startsWith('data:')) {
              // 累积 data 行（支持 "data:" 和 "data: " 两种格式）
              const dataStr = trimmedLine.substring(5).trim();
              if (dataStr) {
                dataLines.push(dataStr);
                console.log('SSE: 📝 收到数据行:', dataStr.substring(0, 100) + (dataStr.length > 100 ? '...' : ''));
              }
            } else if (trimmedLine === '') {
              // 空行表示一个完整的事件结束（部分网关只转发 data、无 event:，需从 JSON 推断内嵌事件）
              if (dataLines.length > 0) {
                if (eventType) {
                  processEvent(eventType, dataLines);
                } else {
                  try {
                    const j = JSON.parse(dataLines.join(''));
                    const inferredEvent = resolveEffectiveSseEvent('', j);
                    if (inferredEvent) {
                      processEvent(inferredEvent as SSEEventType, dataLines);
                    }
                  } catch {
                    // 非 JSON 等：忽略本段
                  }
                }
                eventType = null;
                dataLines = [];
              } else {
                eventType = null;
              }
            }
          }
        }
      } catch (error) {
        console.error('SSE: 流处理错误:', error);
        if (onError) onError(error as Error);
      }
    };

    // 开始处理流
    processStream();

    // 初始化超时定时器
    if (timeout > 0) {
      console.log(`SSE: 设置活动超时为 ${timeout / 1000} 秒 (${timeout / 60000} 分钟) - 无数据时触发`);
      resetTimeout();
    }

    // 返回close方法
    return {
      close: () => {
        isClosed = true;
        reader.cancel();
        // 清除超时定时器
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        console.log('SSE: 连接已关闭');
      },
    };
  } catch (error) {
    console.error('SSE: 连接失败:', error);
    if (onError) onError(error as Error);
    throw error;
  }
};

/**
 * 使用SSE流式接口生成 Kling O1 视频 - 文生视频
 * @param prompt 提示词
 * @param userId 用户ID
 * @param duration 视频时长（秒），默认 5
 * @param aspectRatio 宽高比，默认 "16:9"
 * @param projectId 项目ID（可选）
 * @param sessionId 会话ID（可选）
 * @param onEvent SSE事件回调函数
 * @param onError 错误回调函数
 * @param onComplete 完成回调函数
 * @returns 一个包含close方法的对象，用于关闭连接
 */
export const generateKlingVideoWithStream = async (
  prompt: string,
  userId: string,
  duration: number = 5,
  aspectRatio: string = '16:9',
  projectId?: string,
  sessionId?: string,
  onEvent?: SSEEventCallback,
  onError?: (error: Error) => void,
  onComplete?: () => void
): Promise<{ close: () => void }> => {
  const requestDto: AgentChatRequestDto = {
    message: prompt,
    userId,
    model: 'kling-o1',
    duration,
    aspectRatio,
    projectId,
    sessionId,
  };

  return sendAgentChatWithStream(
    requestDto,
    onEvent || (() => {}),
    onError,
    onComplete
  );
};

/**
 * 使用SSE流式接口生成 Kling O1 视频 - 图生视频
 * @param prompt 提示词
 * @param userId 用户ID
 * @param imageUrls 图片URL数组
 * @param duration 视频时长（秒），默认 5
 * @param aspectRatio 宽高比，默认 "16:9"
 * @param projectId 项目ID（可选）
 * @param sessionId 会话ID（可选）
 * @param onEvent SSE事件回调函数
 * @param onError 错误回调函数
 * @param onComplete 完成回调函数
 * @returns 一个包含close方法的对象，用于关闭连接
 */
export const generateKlingVideoWithImagesStream = async (
  prompt: string,
  userId: string,
  imageUrls: string[],
  duration: number = 5,
  aspectRatio: string = '16:9',
  projectId?: string,
  sessionId?: string,
  onEvent?: SSEEventCallback,
  onError?: (error: Error) => void,
  onComplete?: () => void
): Promise<{ close: () => void }> => {
  const requestDto: AgentChatRequestDto = {
    message: prompt,
    userId,
    model: 'kling-o1',
    images: imageUrls,
    duration,
    aspectRatio,
    projectId,
    sessionId,
  };

  return sendAgentChatWithStream(
    requestDto,
    onEvent || (() => {}),
    onError,
    onComplete
  );
};

// ─── summarize_query 接口 ────────────────────────────────────────

export interface SummarizeQueryRequestDto {
  /** 原始用户查询文本 */
  query: string;
  /**
   * 语言：'auto'（自动检测，默认）| 'zh' | 'en' | …
   */
  language?: string;
  /** 摘要最大词数，默认 30 */
  max_words?: number;
  /**
   * 上下文提示，帮助模型理解场景，例如
   * '图像生成需求' / '设计需求' / '视频生成需求'
   */
  context_hint?: string;
}

export interface SummarizeQueryResponseVo {
  code?: number;
  message?: string;
  /** 服务端将结果包装在 data 字段中 */
  data?: {
    summary?: string;
    language?: string;
    original_length?: number;
    fallback?: boolean;
    success?: boolean;
  };
  /** 兼容旧版/直接返回 summary 的格式 */
  summary?: string;
  [key: string]: any;
}

/**
 * 对用户输入的 query 做智能摘要，用于聊天气泡标题等场景
 * @param requestDto 摘要请求参数
 * @returns 摘要结果
 */
export const summarizeQuery = async (
  requestDto: SummarizeQueryRequestDto
): Promise<SummarizeQueryResponseVo> => {
  try {
    const response = await request('/api2/agent/summarize_query', {
      method: 'POST',
      body: JSON.stringify(
        withProjectIdBody({
          query: requestDto.query,
          language: requestDto.language ?? 'auto',
          max_words: requestDto.max_words ?? 30,
          context_hint: requestDto.context_hint ?? '',
        } as Record<string, unknown>)
      ),
    });
    return response;
  } catch (error) {
    console.error('summarizeQuery 请求失败:', error);
    throw error;
  }
};

// ─── Mockup 接口定义 ────────────────────────────────────────────

export interface MapInfo {
  dataId: string;
  width: number;
  height: number;
}

export interface NormalMapInfo {
  nxDataId: string;
  nyDataId: string;
  nzDataId: string;
  width: number;
  height: number;
}

export interface MockupModel {
  version: number;
  imageWidth: number;   // v3: 原图宽度
  imageHeight: number;  // v3: 原图高度
  depthMap: MapInfo;
  depthMapFull?: MapInfo;               // v4: 原图分辨率深度图
  depthDeviationMap?: MapInfo;          // v4: 深度偏差图 (512×512)
  depthScaleMin: number;
  depthScaleMax: number;
  shadeMap: MapInfo;
  segmentationMap: MapInfo;
  curvatureMap?: MapInfo;       // v3: 曲率图
  normalMap?: NormalMapInfo;    // v3: 法线图 (nx, ny, nz)
  xOffsetMap: MapInfo;          // v4: 已重写为 3D 透视投影驱动 (512×512)
  yOffsetMap: MapInfo;
  cameraIntrinsics: { matrix: number[] };
  colorCorrection: string;
  foregroundImage: string;
}

interface MockupResponse {
  code: number;
  data: MockupModel;
  message: string;
}

// ─── Mockup API 方法 ────────────────────────────────────────────

/**
 * 调用 generate-model 获取所有 maps 元数据
 * @param imageUrl 底图 URL
 * @param userid   当前用户 ID
 */
export async function generateMockupModel(
  imageUrl: string,
  userid: string
): Promise<MockupModel> {
  const res = await request("/api2/agent/mockup/generate-model", {
    method: "POST",
    body: JSON.stringify({ image_url: imageUrl, userid }),
  });
  if (res.code !== 0) throw new Error(res.message || "generate-model failed");
  return res.data;
}

/**
 * 下载 .bin 文件并转为 Float32Array
 * .bin 内容是 row-major float32 little-endian
 */
export async function loadMapBin(dataId: string): Promise<Float32Array> {
  const buf = await request(
    `/api2/agent/mockup/data/${dataId}`,
    { method: "GET" },
    (res: Response) => res.arrayBuffer()
  );
  return new Float32Array(buf);
}

// ─── Local LLM（LocalLLMController）POST /api2/local-llm/chat ─────────────────

/** 与 curl 一致：Deepseek 使用 prompt 单字段 */
export interface LocalLlmChatDeepseekBody {
  model: string;
  prompt: string;
  /** 可选；未传时由 withProjectIdBody 从编辑器上下文补全 */
  projectId?: string;
  sessionId?: string;
}

/** 与 curl 一致：Gemma 使用 messages + timeout（秒） */
export interface LocalLlmChatGemmaBody {
  model: string;
  messages: { role: string; content: string }[];
  /** 秒，默认 180 */
  timeout?: number;
  projectId?: string;
  sessionId?: string;
}

const LOCAL_LLM_CHAT_URL = "/api2/local-llm/chat";
const LOCAL_LLM_STREAM_URL = "/api2/local-llm/chat/stream";

/** Gemma 等长耗时：客户端 HTTP 等待略长于 body.timeout */
const LOCAL_LLM_GEMMA_HTTP_BUFFER_MS = 30_000;

function gemmaChatAbortSignal(timeoutSeconds: number): AbortSignal | undefined {
  if (typeof AbortSignal === "undefined" || typeof AbortSignal.timeout !== "function") {
    return undefined;
  }
  return AbortSignal.timeout(timeoutSeconds * 1000 + LOCAL_LLM_GEMMA_HTTP_BUFFER_MS);
}

/**
 * POST /api2/local-llm/chat（Deepseek 形态）
 * @example body: `{ "model":"deepseek-r1:7b", "prompt":"用一句话说你好" }`
 */
export function postLocalLlmChatDeepseek(body: LocalLlmChatDeepseekBody) {
  return request(LOCAL_LLM_CHAT_URL, {
    method: "POST",
    body: JSON.stringify(withProjectIdBody({ ...(body as object) } as Record<string, unknown>)),
  });
}

/**
 * POST /api2/local-llm/chat（Gemma 形态）
 * @example body: `{ "model":"gemma4:26b", "messages":[{"role":"user","content":"你好"}], "timeout":180 }`
 */
export function postLocalLlmChatGemma(body: LocalLlmChatGemmaBody) {
  const timeoutSec = body.timeout ?? 180;
  const payload = withProjectIdBody({
    model: body.model,
    messages: body.messages,
    timeout: timeoutSec,
    ...(body.projectId ? { projectId: body.projectId } : {}),
    ...(body.sessionId ? { sessionId: body.sessionId } : {}),
  } as Record<string, unknown>);
  return request(LOCAL_LLM_CHAT_URL, {
    method: "POST",
    body: JSON.stringify(payload),
    signal: gemmaChatAbortSignal(timeoutSec),
  });
}

/** POST /api2/local-llm/chat/stream：SSE，与 /chat 相同 body（prompt 或 messages + timeout + projectId） */
export interface LocalLlmStreamResult {
  /** 最终正文（不含 thinking） */
  content: string;
  /** 思考过程全文 */
  thinking: string;
  /** 思考阶段耗时（毫秒），无思考或未统计时为 null */
  thinkingDurationMs: number | null;
}

export interface PostLocalLlmChatStreamOptions {
  model: string;
  prompt?: string;
  messages?: { role: string; content: string }[];
  /** 秒，默认 300 */
  timeoutSeconds?: number;
  /** 正文增量（与 onContentDelta 二选一即可；优先 onContentDelta） */
  onDelta?: (chunk: string) => void;
  onThinkingDelta?: (chunk: string) => void;
  onContentDelta?: (chunk: string) => void;
  /** 思考阶段结束（durationMs 可能来自服务端或客户端计时） */
  onThinkingComplete?: (durationMs: number | null) => void;
  signal?: AbortSignal;
}

/** 从单条 SSE JSON 里取正文增量（兼容 text / OpenAI 式 choices[].delta.content 等） */
function streamChunkText(obj: Record<string, unknown>): string {
  const direct = obj.text ?? obj.content;
  if (typeof direct === "string") return direct;
  const delta = obj.delta;
  if (typeof delta === "string") return delta;
  if (delta && typeof delta === "object") {
    const d = delta as Record<string, unknown>;
    if (typeof d.content === "string") return d.content;
    if (typeof d.text === "string") return d.text;
  }
  const choices = obj.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const c0 = choices[0] as Record<string, unknown>;
    const d0 = c0?.delta;
    if (d0 && typeof d0 === "object") {
      const dd = d0 as Record<string, unknown>;
      if (typeof dd.content === "string") return dd.content;
      if (typeof dd.text === "string") return dd.text;
    }
    const m0 = c0?.message;
    if (m0 && typeof m0 === "object") {
      const m = m0 as Record<string, unknown>;
      if (typeof m.content === "string") return m.content;
    }
  }
  return "";
}

function streamIsThinkingPayload(obj: Record<string, unknown>): boolean {
  const typ = String(obj.type || "").toLowerCase();
  if (typ === "thinking" || typ === "reasoning" || typ === "reasoning_delta") return true;
  if (typ === "delta" || typ === "content") {
    if (obj.reasoning === true) return true;
    const part = String(obj.part || "").toLowerCase();
    if (part === "thinking" || part === "reasoning") return true;
    const ch = String(obj.channel || "").toLowerCase();
    if (ch === "thinking" || ch === "reasoning") return true;
  }
  return false;
}

function streamIsThinkingDonePayload(obj: Record<string, unknown>): boolean {
  const typ = String(obj.type || "").toLowerCase();
  return (
    typ === "thinking_done" ||
    typ === "thought_done" ||
    typ === "thinking_complete" ||
    typ === "thought_end" ||
    typ === "reasoning_done"
  );
}

function streamOptNumber(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function postLocalLlmChatStream(
  options: PostLocalLlmChatStreamOptions
): Promise<LocalLlmStreamResult> {
  const timeoutSec = options.timeoutSeconds ?? 300;
  const userStore = useUserStore();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
    ...getApiContextHeaders(),
  };
  if (userStore.token) {
    const tok = String(userStore.token).trim();
    headers.Authorization = /^Bearer\s+/i.test(tok) ? tok : `Bearer ${tok}`;
  }

  const bodyCore: Record<string, unknown> = {
    model: options.model,
    timeout: timeoutSec,
  };
  if (options.prompt != null && options.prompt !== "") {
    bodyCore.prompt = options.prompt;
  }
  if (options.messages && options.messages.length > 0) {
    bodyCore.messages = options.messages;
  }

  const body = JSON.stringify(withProjectIdBody(bodyCore));

  const signal =
    options.signal ??
    (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(timeoutSec * 1000 + LOCAL_LLM_GEMMA_HTTP_BUFFER_MS)
      : undefined);

  const res = await fetch(LOCAL_LLM_STREAM_URL, {
    method: "POST",
    headers,
    body,
    signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let thinkingText = "";
  let contentText = "";
  let inThinking = false;
  let thinkingStartMs = 0;
  let sawThinkingChunk = false;
  let thinkingCompleteEmitted = false;
  let lastThinkingDurationMs: number | null = null;

  const emitThinkingComplete = (
    serverSec?: number,
    serverMs?: number,
    force?: boolean
  ) => {
    if (thinkingCompleteEmitted) return;
    if (!force && !sawThinkingChunk && !inThinking) return;
    thinkingCompleteEmitted = true;
    inThinking = false;
    let ms: number | null = null;
    const sm = streamOptNumber(serverMs);
    const ss = streamOptNumber(serverSec);
    if (sm != null) ms = sm;
    else if (ss != null) ms = ss * 1000;
    else if (thinkingStartMs > 0) ms = Date.now() - thinkingStartMs;
    lastThinkingDurationMs = ms;
    options.onThinkingComplete?.(ms);
  };

  const appendContent = (chunk: string) => {
    if (!chunk) return;
    contentText += chunk;
    (options.onContentDelta ?? options.onDelta)?.(chunk);
  };

  /** 处理一条 SSE JSON；返回 true 表示流已结束（done） */
  const handleSseEvent = (obj: Record<string, unknown>): boolean => {
    const typ = String(obj.type || "").toLowerCase();

    if (typ === "error") {
      throw new Error(typeof obj.message === "string" ? obj.message : "stream error");
    }

    if (typ === "meta") {
      if (obj.thinking === false && inThinking) {
        emitThinkingComplete(
          streamOptNumber(obj.thinking_duration_seconds),
          streamOptNumber(obj.thinking_duration_ms)
        );
      }
      return false;
    }

    if (streamIsThinkingDonePayload(obj)) {
      emitThinkingComplete(
        streamOptNumber(obj.duration_seconds ?? obj.durationSeconds),
        streamOptNumber(obj.duration_ms ?? obj.durationMs),
        true
      );
      return false;
    }

    const chunk = streamChunkText(obj);

    if (streamIsThinkingPayload(obj)) {
      if (chunk) {
        if (!inThinking) {
          inThinking = true;
          thinkingStartMs = Date.now();
        }
        sawThinkingChunk = true;
        thinkingText += chunk;
        options.onThinkingDelta?.(chunk);
      }
      return false;
    }

    if (typ === "delta" || typ === "content") {
      if (chunk) {
        if (inThinking) {
          emitThinkingComplete();
        }
        appendContent(chunk);
      }
      return false;
    }

    if (typ === "done") {
      if (inThinking) emitThinkingComplete();
      return true;
    }

    return false;
  };

  const parseDataLine = (line: string): boolean | null => {
    const s = line.trim();
    if (!s.startsWith("data:")) return null;
    const jsonStr = s.slice(5).trim();
    if (!jsonStr || jsonStr === "[DONE]") return null;
    try {
      const obj = JSON.parse(jsonStr) as Record<string, unknown>;
      return handleSseEvent(obj);
    } catch (e) {
      if (e instanceof SyntaxError) return null;
      throw e;
    }
  };

  /** 处理一段缓冲区：按行解析 data:（兼容仅用 \n 分隔、末尾无 \n\n 的 SSE） */
  const flushBufferLines = (buf: string): boolean => {
    for (const line of buf.split("\n")) {
      const r = parseDataLine(line);
      if (r === true) return true;
    }
    return false;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const block of parts) {
      if (flushBufferLines(block)) {
        return {
          content: contentText,
          thinking: thinkingText,
          thinkingDurationMs: lastThinkingDurationMs,
        };
      }
    }
  }

  if (buffer.trim() && flushBufferLines(buffer)) {
    return {
      content: contentText,
      thinking: thinkingText,
      thinkingDurationMs: lastThinkingDurationMs,
    };
  }

  if (inThinking) emitThinkingComplete();
  return {
    content: contentText,
    thinking: thinkingText,
    thinkingDurationMs: lastThinkingDurationMs,
  };
}

/** 从网关统一响应中解析本地 LLM 返回文本（兼容多种 data 形态） */
export function extractLocalLlmChatReplyText(res: any): string {
  if (!res || typeof res !== "object") return "";
  const code = res.code;
  if (code !== undefined && code !== 0 && code !== "0" && code !== 200) {
    return "";
  }
  const d = res.data !== undefined ? res.data : res;
  if (typeof d === "string") return d.trim();
  if (typeof d?.content === "string") return d.content.trim();
  if (typeof d?.text === "string") return d.text.trim();
  if (typeof d?.message === "string" && !d?.choices) return d.message.trim();
  if (typeof d?.reply === "string") return d.reply.trim();
  const c0 = d?.choices?.[0];
  if (typeof c0?.message?.content === "string") return c0.message.content.trim();
  if (typeof c0?.text === "string") return c0.text.trim();
  return "";
}
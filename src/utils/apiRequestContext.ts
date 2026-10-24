/**
 * 为 Java 网关 Filter / 转发层提供 projectId、session 上下文。
 * - 编辑器路由上的 projectId 由页面同步到 sessionStorage（见 editor/index.vue）。
 * - 无 projectId 时，X-Session-Id 使用「域 × 标签页」隔离的会话 id（见 utils/sessionScope）。
 * - Spec §5：禁止从 Cookie / document.referrer 推断 session_id。
 */

import { getScopedSessionId } from "@/utils/sessionScope";

export const MJ_EDITOR_PROJECT_STORAGE_KEY = "mj_editor_project_id";

/** 编辑器进入/切换项目时写入，供全局 request 与直连 fetch 使用 */
export function setEditorProjectIdForApi(projectId: string | null | undefined): void {
  if (typeof window === "undefined") return;
  try {
    const v = projectId != null ? String(projectId).trim() : "";
    if (v) sessionStorage.setItem(MJ_EDITOR_PROJECT_STORAGE_KEY, v);
    else sessionStorage.removeItem(MJ_EDITOR_PROJECT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getEditorProjectIdForApi(): string {
  if (typeof window === "undefined") return "";
  try {
    return String(sessionStorage.getItem(MJ_EDITOR_PROJECT_STORAGE_KEY) || "").trim();
  } catch {
    return "";
  }
}

/** 浏览器会话：「域 × 标签页」隔离的会话 id（Spec §5，不再读 Cookie） */
export function getBrowserSessionIdForApi(): string {
  if (typeof window === "undefined") return "";
  return getScopedSessionId();
}

/**
 * 附加到 fetch Headers：Filter 在部分请求上无法读 JSON body，需带头。
 * 有 projectId 时 X-Project-Id 与 X-Session-Id 同值（与后端约定一致）。
 */
export function getApiContextHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  const pid = getEditorProjectIdForApi();
  if (pid) {
    h["X-Project-Id"] = pid;
    h["X-Session-Id"] = pid;
  } else {
    const sid = getBrowserSessionIdForApi();
    if (sid) h["X-Session-Id"] = sid;
  }
  return h;
}

/** 合并到 JSON body：LocalLLM 等 POST 需 body 内 projectId */
export function withProjectIdBody<T extends Record<string, unknown>>(body: T): T & { projectId?: string } {
  const pid = getEditorProjectIdForApi();
  if (!pid) return body;
  if ("projectId" in body && (body as { projectId?: string }).projectId) return body;
  return { ...body, projectId: pid };
}

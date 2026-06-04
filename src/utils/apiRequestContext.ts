/**
 * 为 Java 网关 Filter / 转发层提供 projectId、session 上下文。
 * - 编辑器路由上的 projectId 由页面同步到 sessionStorage（见 editor/index.vue）。
 * - 无 projectId 时，X-Session-Id 使用 Cookie 常见会话名，否则为本标签页稳定 id。
 */

export const MJ_EDITOR_PROJECT_STORAGE_KEY = "mj_editor_project_id";
const MJ_TAB_SESSION_STORAGE_KEY = "mj_client_tab_session";

const COOKIE_SESSION_NAMES = ["JSESSIONID", "SESSION", "sessionId", "sid"] as const;

function parseCookieSessionId(cookie: string): string {
  if (!cookie) return "";
  for (const name of COOKIE_SESSION_NAMES) {
    const m = new RegExp(`(?:^|;\\s*)${name}=([^;]*)`).exec(cookie);
    if (m?.[1]) {
      try {
        return decodeURIComponent(m[1]).trim();
      } catch {
        return m[1].trim();
      }
    }
  }
  return "";
}

function ensureTabSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let s = sessionStorage.getItem(MJ_TAB_SESSION_STORAGE_KEY);
    if (!s?.trim()) {
      s = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
      sessionStorage.setItem(MJ_TAB_SESSION_STORAGE_KEY, s);
    }
    return s.trim();
  } catch {
    return "";
  }
}

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

/** 浏览器会话：Cookie 中的服务端 session，否则本标签页 id */
export function getBrowserSessionIdForApi(): string {
  if (typeof window === "undefined") return "";
  try {
    const fromCookie = parseCookieSessionId(typeof document !== "undefined" ? document.cookie : "");
    if (fromCookie) return fromCookie;
  } catch {
    /* ignore */
  }
  return ensureTabSessionId();
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

/**
 * 前端 Session 隔离 Spec（session_id 即 projectId）：
 * - 唯一性按「域 × 浏览器标签页」：sessionStorage 存 tab 绑定（刷新存活、关 tab 失效、新 tab 不继承）；
 * - 归属登记按域分桶：localStorage `pid_known:${host}` 记录在本域创建/接管过的 pid，供 URL pid 校验；
 * - 禁止：全局 localStorage 单键、从 Cookie / document.referrer 推断、跨 tab 广播同步 projectId。
 * 排障：状态变化时输出一行 `[Session] host=... pid=... source=...`（source: url|sessionStorage|new）。
 */

const TAB_PID_PREFIX = "pid:"
const KNOWN_PID_PREFIX = "pid_known:"
/** 历史全局 key（旧版跨 tab 共享）；仅在当前域首次初始化时迁移一次 */
const LEGACY_GLOBAL_PID_KEY = "pr_session_id"
/** 登记表上限，防止无限增长 */
const KNOWN_PID_LIMIT = 200

export type SessionSource = "url" | "sessionStorage" | "new"

export interface ResolvedSession {
  pid: string
  source: SessionSource
}

function currentHost(): string {
  if (typeof window === "undefined" || !window.location) return ""
  return window.location.host
}

function tabKey(host: string): string {
  return `${TAB_PID_PREFIX}${host}`
}

function knownKey(host: string): string {
  return `${KNOWN_PID_PREFIX}${host}`
}

function safeGet(storage: Storage | undefined, key: string): string {
  try {
    return String(storage?.getItem(key) || "").trim()
  } catch {
    return ""
  }
}

function safeSet(storage: Storage | undefined, key: string, value: string): void {
  try {
    storage?.setItem(key, value)
  } catch {
    /* 隐私模式等场景 storage 不可写，退化为内存级（每次新会话） */
  }
}

function readTabBoundPid(host: string): string {
  if (typeof sessionStorage === "undefined") return ""
  return safeGet(sessionStorage, tabKey(host))
}

function bindTabPid(host: string, pid: string): void {
  if (typeof sessionStorage === "undefined") return
  safeSet(sessionStorage, tabKey(host), pid)
}

function readKnownPids(host: string): string[] {
  if (typeof localStorage === "undefined") return []
  const raw = safeGet(localStorage, knownKey(host))
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string" && x.trim()).map(String) : []
  } catch {
    return []
  }
}

function addKnownPid(host: string, pid: string): void {
  if (typeof localStorage === "undefined") return
  const list = readKnownPids(host)
  if (!list.includes(pid)) list.push(pid)
  while (list.length > KNOWN_PID_LIMIT) list.shift()
  safeSet(localStorage, knownKey(host), JSON.stringify(list))
}

/** pid 是否属于当前域：本域登记过（创建/接管过），或当前标签页正绑定它 */
export function isSessionOwnedByHost(pid: string, host: string): boolean {
  const id = String(pid || "").trim()
  if (!id || !host) return false
  if (readTabBoundPid(host) === id) return true
  return readKnownPids(host).includes(id)
}

function newPid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "")
  }
  return `${Date.now().toString(36)}${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`
}

function logSession(source: SessionSource, host: string, pid: string): void {
  try {
    console.info(`[Session] host=${host} pid=${pid} source=${source}`)
  } catch {
    /* ignore */
  }
}

/**
 * 解析当前标签页的会话 id（spec §3）：
 * 1. URL 携带的 pid 必须通过本域归属校验才接管；
 * 2. 其次沿用本标签页已绑定的 pid（同域刷新续会话）；
 * 3. 都没有则生成新 pid（新 tab / 隐私模式不继承）。
 * 仅在绑定关系变化（接管 / 新建）时输出一行 [Session] 日志。
 */
export function resolveSessionId(urlPid?: string | null): ResolvedSession {
  const host = currentHost()
  if (!host) return { pid: "", source: "new" }

  const candidate = String(urlPid || "").trim()
  if (candidate && isSessionOwnedByHost(candidate, host)) {
    const prev = readTabBoundPid(host)
    bindTabPid(host, candidate)
    addKnownPid(host, candidate)
    if (prev !== candidate) logSession("url", host, candidate)
    return { pid: candidate, source: "url" }
  }

  const bound = readTabBoundPid(host)
  if (bound) return { pid: bound, source: "sessionStorage" }

  // 旧版全局 key 迁移：同域历史会话续用一次，之后按 tab 隔离
  const legacy = safeGet(typeof localStorage === "undefined" ? undefined : localStorage, LEGACY_GLOBAL_PID_KEY)
  if (legacy) {
    bindTabPid(host, legacy)
    addKnownPid(host, legacy)
    logSession("sessionStorage", host, legacy)
    return { pid: legacy, source: "sessionStorage" }
  }

  const pid = newPid()
  bindTabPid(host, pid)
  addKnownPid(host, pid)
  logSession("new", host, pid)
  return { pid, source: "new" }
}

/** 当前标签页的会话 id；无则创建并绑定（供请求侧统一取值） */
export function getScopedSessionId(): string {
  return resolveSessionId().pid
}

/** 本域新生成的会话/任务 pid：登记归属，之后同域 URL 携带它可通过 §3 校验 */
export function registerLocalSession(pid: string): string {
  const id = String(pid || "").trim()
  const host = currentHost()
  if (!id || !host) return id
  addKnownPid(host, id)
  const prev = readTabBoundPid(host)
  if (!prev) {
    bindTabPid(host, id)
    logSession("new", host, id)
  }
  return id
}

/** 接管 URL 传入的会话（如共读分享链接），仅做可观测性记录，不做归属强校验（分享场景本就允许跨设备） */
export function logSessionAdoption(source: SessionSource, pid: string): void {
  const host = currentHost()
  if (!pid || !host) return
  logSession(source, host, pid)
}

/**
 * 跨窗口/跨 tab 会话分叉（spec §4）：新窗口禁止自动继承当前 session。
 * 业务确需"从 A 会话分叉出 B"时显式调用；后端接口未就绪时抛错，调用方应回退为全新会话。
 */
export async function forkSession(sourcePid: string): Promise<string> {
  const src = String(sourcePid || "").trim()
  if (!src) throw new Error("forkSession: source session id is required")
  const res = await fetch("/api2/sessions/fork", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_session_id: src }),
  })
  if (!res.ok) throw new Error(`forkSession failed: ${res.status}`)
  const payload = (await res.json()) as { sessionId?: string; session_id?: string; projectId?: string }
  const pid = String(payload.sessionId || payload.session_id || payload.projectId || "").trim()
  if (!pid) throw new Error("forkSession: empty session id in response")
  return registerLocalSession(pid)
}

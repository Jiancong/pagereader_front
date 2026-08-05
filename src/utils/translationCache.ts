// 翻译结果本地缓存（IndexedDB），避免重复请求与限流。
// key: `${fileHash}:${pageNum}:${targetLang}`
// @author hc @date 2026-07-25

const DB_NAME = "pagereader-translate"
const STORE = "pageTranslations"
const DB_VERSION = 1

export interface CachedPageTranslation {
  lines: string[]
  translations: string[]
  ts: number
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE) // key 由调用方提供
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx(
  db: IDBDatabase,
  mode: IDBTransactionMode,
): IDBObjectStore {
  return db.transaction(STORE, mode).objectStore(STORE)
}

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getCachedTranslation(
  key: string,
): Promise<CachedPageTranslation | undefined> {
  try {
    const db = await openDb()
    const result = await promisify<CachedPageTranslation | undefined>(
      tx(db, "readonly").get(key) as IDBRequest<CachedPageTranslation | undefined>,
    )
    return result ?? undefined
  } catch {
    return undefined
  }
}

export async function putCachedTranslation(
  key: string,
  value: CachedPageTranslation,
): Promise<void> {
  try {
    const db = await openDb()
    await promisify(tx(db, "readwrite").put(value, key))
  } catch {
    // 缓存失败不影响主流程
  }
}

export async function clearCachedTranslations(fileHash?: string): Promise<void> {
  try {
    const db = await openDb()
    if (!fileHash) {
      await promisify(tx(db, "readwrite").clear())
      return
    }
    const store = tx(db, "readwrite")
    const cursorReq = store.openKeyCursor()
    await new Promise<void>((resolve) => {
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result
        if (!cursor) return resolve()
        if (typeof cursor.key === "string" && cursor.key.startsWith(fileHash)) {
          store.delete(cursor.key)
        }
        cursor.continue()
      }
      cursorReq.onerror = () => resolve()
    })
  } catch {
    // ignore
  }
}

/**
 * 计算文件轻量哈希：文件名 + 大小 + 前 1MB 的 SHA-256。
 * 避免大文件全量哈希开销，同时具备足够区分度。
 */
export async function computeFileHash(file: File): Promise<string> {
  const headSize = Math.min(file.size, 1024 * 1024)
  const head = await file.slice(0, headSize).arrayBuffer()
  const digest = await crypto.subtle.digest("SHA-256", head)
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  return `${file.name}:${file.size}:${hex}`
}

export function buildCacheKey(
  fileHash: string,
  pageNum: number,
  targetLang: string,
): string {
  return `${fileHash}:${pageNum}:${targetLang}`
}

/**
 * 计算任意字符串的轻量哈希（SHA-256 前 32 位十六进制）。
 * 用于网页翻译按 URL 做缓存键。
 */
export async function computeTextHash(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32)
}

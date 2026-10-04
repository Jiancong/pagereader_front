// 在线阅读：把用户选中的本地文件（PDF / EPUB / MOBI / XLSX）传给阅读器视图。
// 用 objectURL 避免大文件序列化，离开时统一 revoke。
// @author hc @date 2026-08-24

import { defineStore } from "pinia"

export type ReaderFormat = "pdf" | "epub" | "mobi" | "xlsx" | "markdown"

interface ReaderFileState {
  file: File | null
  objectUrl: string
  format: ReaderFormat | ""
  /** 跳转到工作区时保留文件，避免 onBeforeUnmount revoke */
  preserveFileOnLeave: boolean
}

export function detectReaderFormatFromName(fileName: string): ReaderFormat | "" {
  const name = String(fileName || "").toLowerCase()
  if (name.endsWith(".pdf")) return "pdf"
  if (name.endsWith(".epub")) return "epub"
  if (name.endsWith(".mobi") || name.endsWith(".azw") || name.endsWith(".azw3")) return "mobi"
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "xlsx"
  if (
    name.endsWith(".md") ||
    name.endsWith(".markdown") ||
    name.endsWith(".mdown") ||
    name.endsWith(".mkd") ||
    name.endsWith(".txt")
  ) {
    return "markdown"
  }
  return ""
}

function detectFormat(file: File): ReaderFormat | "" {
  return detectReaderFormatFromName(file.name)
}

export const useReaderFileStore = defineStore("reader-file", {
  state: (): ReaderFileState => ({
    file: null,
    objectUrl: "",
    format: "",
    preserveFileOnLeave: false,
  }),
  actions: {
    setFile(file: File) {
      this.revoke()
      this.file = file
      this.format = detectFormat(file)
      this.objectUrl = URL.createObjectURL(file)
    },
    /** 拉取远程文件（如 OSS 签名 URL）后进入 /reader/open */
    async loadFromUrl(url: string, fileName: string) {
      const format = detectReaderFormatFromName(fileName)
      if (!format) throw new Error("READER_UNSUPPORTED")
      const res = await fetch(url, { mode: "cors", credentials: "omit" })
      const blob = await res.blob()
      if (!res.ok) {
        const snippet = await blob.slice(0, 512).text()
        if (/Request has expired|AccessDenied/i.test(snippet)) {
          throw new Error("OSS_URL_EXPIRED")
        }
        throw new Error(`HTTP ${res.status}`)
      }
      const ct = blob.type.toLowerCase()
      if (ct.includes("xml")) {
        const snippet = await blob.slice(0, 512).text()
        if (/Request has expired|AccessDenied/i.test(snippet)) {
          throw new Error("OSS_URL_EXPIRED")
        }
      }
      const file = new File([blob], fileName, {
        type: blob.type && blob.type !== "application/octet-stream" ? blob.type : "application/octet-stream",
      })
      if (!detectFormat(file)) throw new Error("READER_UNSUPPORTED")
      this.setFile(file)
    },
    setPreserveOnLeave(value: boolean) {
      this.preserveFileOnLeave = value
    },
    revoke() {
      if (this.objectUrl) {
        URL.revokeObjectURL(this.objectUrl)
        this.objectUrl = ""
      }
      this.file = null
      this.format = ""
      this.preserveFileOnLeave = false
    },
  },
})

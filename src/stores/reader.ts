// 在线阅读：把用户选中的本地文件（PDF / EPUB / MOBI / XLSX）传给阅读器视图。
// 用 objectURL 避免大文件序列化，离开时统一 revoke。
// @author hc @date 2026-08-24

import { defineStore } from "pinia"

export type ReaderFormat = "pdf" | "epub" | "mobi" | "xlsx"

interface ReaderFileState {
  file: File | null
  objectUrl: string
  format: ReaderFormat | ""
}

function detectFormat(file: File): ReaderFormat | "" {
  const name = file.name.toLowerCase()
  if (name.endsWith(".pdf")) return "pdf"
  if (name.endsWith(".epub")) return "epub"
  if (name.endsWith(".mobi") || name.endsWith(".azw") || name.endsWith(".azw3")) return "mobi"
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "xlsx"
  return ""
}

export const useReaderFileStore = defineStore("reader-file", {
  state: (): ReaderFileState => ({
    file: null,
    objectUrl: "",
    format: "",
  }),
  actions: {
    setFile(file: File) {
      this.revoke()
      this.file = file
      this.format = detectFormat(file)
      this.objectUrl = URL.createObjectURL(file)
    },
    revoke() {
      if (this.objectUrl) {
        URL.revokeObjectURL(this.objectUrl)
        this.objectUrl = ""
      }
      this.file = null
      this.format = ""
    },
  },
})

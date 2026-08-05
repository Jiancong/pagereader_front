// 沉浸式翻译：把用户选中的内容（PDF 文件或网页 URL）传给阅读器视图。
// PDF 用 objectURL 避免大文件序列化，离开时统一 revoke。
// @author hc @date 2026-07-25

import { defineStore } from "pinia"

export type TranslateSourceMode = "pdf" | "web"

interface TranslateFileState {
  mode: TranslateSourceMode
  file: File | null
  objectUrl: string
  /** 网页翻译模式的目标 URL */
  url: string
}

export const useTranslateFileStore = defineStore("translate-file", {
  state: (): TranslateFileState => ({
    mode: "pdf",
    file: null,
    objectUrl: "",
    url: "",
  }),
  actions: {
    setFile(file: File) {
      this.revoke()
      this.mode = "pdf"
      this.file = file
      this.objectUrl = URL.createObjectURL(file)
    },
    setUrl(url: string) {
      this.revoke()
      this.mode = "web"
      this.url = url
    },
    revoke() {
      if (this.objectUrl) {
        URL.revokeObjectURL(this.objectUrl)
        this.objectUrl = ""
      }
      this.file = null
      this.url = ""
    },
  },
})

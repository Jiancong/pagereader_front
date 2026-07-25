// 沉浸式翻译：在落地页选完 PDF 后，把 File 传给阅读器视图。
// 用 objectURL 避免大文件序列化，离开时统一 revoke。
// @author hc @date 2026-07-25

import { defineStore } from "pinia"

interface TranslateFileState {
  file: File | null
  objectUrl: string
}

export const useTranslateFileStore = defineStore("translate-file", {
  state: (): TranslateFileState => ({
    file: null,
    objectUrl: "",
  }),
  actions: {
    setFile(file: File) {
      this.revoke()
      this.file = file
      this.objectUrl = URL.createObjectURL(file)
    },
    revoke() {
      if (this.objectUrl) {
        URL.revokeObjectURL(this.objectUrl)
        this.objectUrl = ""
      }
      this.file = null
    },
  },
})

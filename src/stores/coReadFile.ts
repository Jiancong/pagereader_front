// 沉浸式共读：上传文件暂存（进入 /co-reading 前）
// @author hc @date 2026-10-16

import { defineStore } from "pinia"
import type { CoReadChapter } from "@/types/coReading"
import type { CoReadFileFormat } from "@/utils/coReadChapter"

interface CoReadFileState {
  file: File | null
  fileHash: string
  format: CoReadFileFormat | ""
  chapters: CoReadChapter[]
  returnTo: "workspace" | "reader-hub" | "landing" | ""
}

export const useCoReadFileStore = defineStore("co-read-file", {
  state: (): CoReadFileState => ({
    file: null,
    fileHash: "",
    format: "",
    chapters: [],
    returnTo: "",
  }),
  actions: {
    setParsed(file: File, chapters: CoReadChapter[], fileHash: string, format: CoReadFileFormat) {
      this.file = file
      this.chapters = chapters
      this.fileHash = fileHash
      this.format = format
    },
    setReturnTo(value: CoReadFileState["returnTo"]) {
      this.returnTo = value
    },
    clear() {
      this.file = null
      this.fileHash = ""
      this.format = ""
      this.chapters = []
      this.returnTo = ""
    },
  },
})

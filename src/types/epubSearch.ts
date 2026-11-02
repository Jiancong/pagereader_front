export interface EpubSearchHit {
  cfi: string
  excerpt: string
  spineIndex: number
  chapterLabel: string
  /** locations 网格估算页码（与部分旧逻辑一致） */
  pageHint: number | null
  /** 跳转后由阅读器报告的当前视觉页码 */
  pageDisplay: number | null
}

export interface EpubSearchProgress {
  sectionIndex: number
  sectionTotal: number
  hitsSoFar: number
}

// vue-i18n 配置：补齐 PptViewer 用到的 agent.ppt* / editor.* 文案
// @author hc @date 2026-06-04

import { createI18n } from "vue-i18n";

const zhCN = {
  editor: {
    close: "关闭",
    loginRequired: "请先登录",
  },
  agent: {
    // 分享 / 导出
    pptShare: "分享",
    pptShareViaLink: "复制分享链接",
    pptShareExportPdf: "导出 PDF",
    pptShareExportPptx: "导出 PPTX",
    pptShareExportGoogleSlides: "导出到 Google Slides",
    pptShareExportPngs: "导出 PNG 包",
    pptSharePostLinkedIn: "分享到 LinkedIn",
    pptShareNoProject: "暂无可分享的项目",
    pptShareLinkCopied: "链接已复制",
    pptShareCopyFailed: "复制失败",
    pptExportGoogleSlidesHint: "请将导出的 PPTX 上传到 Google Slides",
    pptExporting: "正在导出...",
    pptExportCapturing: "正在渲染第 {current}/{total} 页...",
    pptExportPngPackaging: "正在打包 PNG...",
    pptExportDownloading: "正在下载...",
    pptExportMerging: "正在合并...",
    pptExportFailed: "导出失败",
    pptExportPptxFailed: "PPTX 导出失败",
    // 全屏 / 关闭
    pptFullscreenExit: "退出全屏",
    pptFullscreenPlay: "全屏演示",
    pptClose: "关闭",
    // 版面文案
    pptDefaultOrg: "演示文稿",
    pptChapterLabel: "第 {number} 章",
    pptChapterHeading: "第 {number} 章",
    pptSources: "参考来源",
    pptSummary: "小结",
    pptLeftColumn: "左栏",
    pptRightColumn: "右栏",
    pptDocumentSourceImage: "文档配图",
    pptSpeakerNotes: "演讲者备注",
    // 图表
    pptComboPrimaryDefaultLabel: "主数据",
    pptSeriesLabel: "系列 {index}",
    pptValueLabel: "数值",
    pptDimensionLabel: "维度 {index}",
    pptChartPrimary: "主要",
    pptChartSecondary: "次要",
    pptChartEstimate: "数据为估算",
    pptModelData: "模型数据",
    pptTableModelData: "模型数据",
    // 划词追问
    pptRelatedSearch: "划词追问",
    pptRelatedSearchTitle: "关于「{term}」",
    pptRelatedSearchHint: "基于当前内容的相关追问",
    pptRelatedSearchIncreaseFont: "增大字号",
    pptRelatedSearchDecreaseFont: "减小字号",
    pptRelatedSearchLoading: "正在搜索...",
    pptRelatedSearchEmpty: "暂无相关结果",
    pptRelatedSearchFailed: "搜索失败",
    pptRelatedSearchSelectText: "请先选中文本",
    sourceFromSearch: "来自搜索",
    sourceFromKnowledge: "来自知识库",
    sourceFromRag: "来自文档",
    imageResults: "图片结果",
    viewSource: "查看来源",
  },
};

// 兜底：漏配的 key 用最后一段做人类可读回退，避免界面显示原始 key
function humanize(key: string): string {
  const last = key.split(".").pop() || key
  return last.replace(/^ppt/, "").replace(/([A-Z])/g, " $1").trim() || key
}

export const i18n = createI18n({
  legacy: false,
  locale: "zh-cn",
  fallbackLocale: "zh-cn",
  missingWarn: false,
  fallbackWarn: false,
  messages: { "zh-cn": zhCN },
  missing: (_locale, key) => humanize(key),
});

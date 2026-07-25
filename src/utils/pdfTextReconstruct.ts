// PDF.js 文本碎片重建：把 getTextContent 返回的散碎 item 按 Y 轴聚类、
// 按间距拼接成完整行/句，便于整句送翻译，避免语序混乱。
// @author hc @date 2026-07-25

/** PDF.js TextContent item 的最小子集 */
export interface PdfTextItem {
  str: string
  /** transform 矩阵 [a, b, c, d, e, f]：e=x, f=y */
  transform: number[]
  width: number
  height: number
  hasEOL?: boolean
}

/** 重建后的一行文本 */
export interface PdfLine {
  /** 行内拼接后的完整文本 */
  text: string
  /** 行起点 x（取该行首个 item 的 x） */
  x: number
  /** 行 y（取该行首个 item 的 y） */
  y: number
  /** 行宽（末 item x + width - 首 item x） */
  width: number
  /** 行高（取该行最大 item.height） */
  height: number
}

/** Y 轴聚类容差（PDF 内部坐标，单位 pt） */
const Y_TOLERANCE = 2
/** 相邻 item 间距小于该值视为同一词内拼接（不补空格）；大于则补空格 */
const JOIN_GAP = 0.5
/** 视为断句的间距阈值（超过则不拼接，单独成行） */
const BREAK_GAP = 12

/**
 * 把 getTextContent().items 重建为行数组。
 * 同 Y（容差内）归为一行，行内按 X 排序后按间距拼接。
 */
export function reconstructLines(items: PdfTextItem[]): PdfLine[] {
  const valid = items.filter(
    (it) => typeof it.str === "string" && it.str.length > 0,
  )
  if (valid.length === 0) return []

  // 1. 按 Y 聚类
  const clusters: PdfTextItem[][] = []
  const clusterYs: number[] = []
  for (const it of valid) {
    const y = it.transform[5]
    let placed = false
    for (let i = 0; i < clusters.length; i++) {
      if (Math.abs(clusterYs[i] - y) <= Y_TOLERANCE) {
        clusters[i].push(it)
        placed = true
        break
      }
    }
    if (!placed) {
      clusters.push([it])
      clusterYs.push(y)
    }
  }

  // 2. 每行内按 X 排序 + 按间距拼接
  const lines: PdfLine[] = []
  for (const cluster of clusters) {
    const sorted = [...cluster].sort(
      (a, b) => a.transform[4] - b.transform[4],
    )
    const clusterY = sorted[0].transform[5]
    const clusterHeight = sorted.reduce(
      (m, it) => Math.max(m, it.height || 0),
      0,
    )

    let segStartX = sorted[0].transform[4]
    let segText = ""
    let prevEndX = sorted[0].transform[4]
    let prevHadSpace = false

    const flush = () => {
      const trimmed = segText.trim()
      if (!trimmed) return
      const segEndX = prevEndX
      lines.push({
        text: trimmed,
        x: segStartX,
        y: clusterY,
        width: segEndX - segStartX,
        height: clusterHeight,
      })
      segText = ""
    }

    for (let i = 0; i < sorted.length; i++) {
      const it = sorted[i]
      const startX = it.transform[4]
      if (i > 0) {
        const gap = startX - prevEndX
        if (gap >= BREAK_GAP) {
          flush()
          segStartX = startX
        } else if (gap > JOIN_GAP) {
          if (!prevHadSpace && !segText.endsWith(" ")) segText += " "
        }
      }
      segText += it.str
      prevEndX = startX + it.width
      prevHadSpace = it.str.endsWith(" ")
      if (it.hasEOL) {
        flush()
        if (i + 1 < sorted.length) {
          segStartX = sorted[i + 1].transform[4]
        }
      }
    }
    flush()
  }

  // 3. 按 Y 降序（PDF 坐标系 y 向上，阅读顺序自上而下）
  lines.sort((a, b) => b.y - a.y)
  return lines
}

/** 仅提取行文本数组，便于直接送翻译 */
export function reconstructTexts(items: PdfTextItem[]): string[] {
  return reconstructLines(items).map((l) => l.text)
}

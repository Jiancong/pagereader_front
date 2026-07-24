// 为社区页划线列表解析 sectionId → 可读章节/页标题
import { buildNovelGuideOutline } from "@/utils/novelGuideSections"
import type { NovelResult } from "@/utils/novelStream"
import type { ProjectAnnotation } from "@/api/types"

/** novel 导读 section.id → label */
export function buildNovelSectionLabelMap(novel: NovelResult | null | undefined): Map<string, string> {
  const map = new Map<string, string>()
  if (!novel?.markdown) return map
  const outline = buildNovelGuideOutline({
    markdown: novel.markdown,
    novelNodes: novel.novelNodes,
    title: novel.title,
  })
  for (const section of outline.sections) {
    map.set(section.id, section.label)
  }
  return map
}

export function enrichAnnotationSectionLabels(
  items: ProjectAnnotation[],
  labelMap: Map<string, string>,
): ProjectAnnotation[] {
  if (!items.length || !labelMap.size) return items
  return items.map((item) => {
    if (item.sectionLabel?.trim()) return item
    const label = labelMap.get(item.sectionId)
    return label ? { ...item, sectionLabel: label } : item
  })
}

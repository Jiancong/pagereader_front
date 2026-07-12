import type { ProjectVo, UserImage } from "@/api/types"

export type GeneratedAssetKind = "ppt" | "novel" | "image"

export interface GeneratedAssetItem {
  id: string
  kind: GeneratedAssetKind
  title: string
  thumbnailUrl?: string
  updatedAt: string
  projectId?: string
  configFilePath?: string
  novelDataUrl?: string
  imageUrl?: string
  raw: ProjectVo | UserImage
}

export interface NovelMetadata {
  is_novel_response?: boolean
  novel_data_url?: string
  novel_nodes?: unknown
  markdown?: string
}

export function isGeneratedProject(p: ProjectVo): boolean {
  return p.lifecycleStatus === "COMPLETED" || !!p.configFilePath
}

export function isNovelProject(p: ProjectVo): boolean {
  return p.categoryId === "novel"
}

export function isPptProject(p: ProjectVo): boolean {
  return !!p.configFilePath && p.categoryId !== "novel"
}

export function shouldIncludeProjectAsAsset(p: ProjectVo): boolean {
  if (!isGeneratedProject(p)) return false
  return isNovelProject(p) || isPptProject(p)
}

export function mapProjectToAsset(p: ProjectVo): GeneratedAssetItem {
  const kind: GeneratedAssetKind = isNovelProject(p) ? "novel" : "ppt"
  return {
    id: p.id,
    kind,
    title: p.title || p.name || "",
    thumbnailUrl: p.thumbnailUrl,
    updatedAt: p.updateTime ?? p.createTime ?? "",
    projectId: p.id,
    configFilePath: p.configFilePath ?? undefined,
    raw: p,
  }
}

export function mapImageToAsset(img: UserImage): GeneratedAssetItem {
  return {
    id: String(img.id),
    kind: "image",
    title: img.originalName || "",
    thumbnailUrl: img.fileLink,
    imageUrl: img.fileLink,
    updatedAt: img.createTime ?? "",
    projectId: img.projectId,
    raw: img,
  }
}

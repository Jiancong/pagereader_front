// Novel 阅读页「划线 + 写想法」（私密批注）
// @author hc @date 2026-07-23

import { del, get, postJson, put } from "./client"
import type {
  CreateProjectAnnotation,
  ProjectAnnotation,
  UpdateProjectAnnotation,
} from "./types"

// 默认高亮色
export const DEFAULT_ANNOTATION_COLOR = "#ffe082"

/**
 * 拉取当前用户在该项目的划线列表。
 * 传 sectionId 时只返回该章节（进入章节时恢复高亮）。
 */
export async function listAnnotations(
  projectId: string,
  sectionId?: string,
): Promise<ProjectAnnotation[]> {
  const query = sectionId ? { sectionId } : undefined
  return get<ProjectAnnotation[]>(
    `/project/${encodeURIComponent(projectId)}/annotations`,
    { query },
  )
}

// 新建划线 / 想法
export async function createAnnotation(
  projectId: string,
  body: CreateProjectAnnotation,
): Promise<ProjectAnnotation> {
  return postJson<ProjectAnnotation>(
    `/project/${encodeURIComponent(projectId)}/annotations`,
    body,
  )
}

// 编辑想法（仅 note / color）
export async function updateAnnotation(
  projectId: string,
  id: string,
  body: UpdateProjectAnnotation,
): Promise<ProjectAnnotation> {
  return put<ProjectAnnotation>(
    `/project/${encodeURIComponent(projectId)}/annotations/${encodeURIComponent(id)}`,
    body,
  )
}

// 删除划线
export async function deleteAnnotation(
  projectId: string,
  id: string,
): Promise<void> {
  await del<unknown>(
    `/project/${encodeURIComponent(projectId)}/annotations/${encodeURIComponent(id)}`,
  )
}

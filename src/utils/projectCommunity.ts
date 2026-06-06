import type { ProjectVo } from "@/api/types"

export function isSharedToCommunity(proj: ProjectVo | null | undefined): boolean {
  if (!proj) return false
  if (proj.sharedToCommunity === true) return true
  const priv = proj.isPrivate
  const rec = proj.isRecommended
  if ((priv === 0 || priv === false) && (rec === 1 || rec === true)) return true
  return false
}

/** PPT deck 已生成即可分享；封面由后端在分享时补全或从 deck 推导 */
export function canShareToCommunity(proj: ProjectVo | null | undefined): boolean {
  return !!proj?.configFilePath
}

export function formatCommentTime(iso: string): string {
  if (!iso) return ""
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString()
  } catch {
    return iso
  }
}

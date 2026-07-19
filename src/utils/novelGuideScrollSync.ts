/** 导读正文：按音频进度估算当前段落并滚到视口中间 */

const SCROLL_TARGET_SELECTOR = [
  ".novel-guide-content h2",
  ".novel-guide-content h3",
  ".novel-guide-content p",
  ".novel-guide-content li",
  ".novel-guide-markdown h2",
  ".novel-guide-markdown h3",
  ".novel-guide-markdown p",
  ".novel-guide-markdown li",
].join(", ")

/** 与 WorkspaceNovelResult 移动版布局一致（md 以下 stacked） */
export function isNovelGuideMobileViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
}

export function collectNovelGuideScrollTargets(root: HTMLElement): HTMLElement[] {
  const seen = new Set<HTMLElement>()
  const ordered: HTMLElement[] = []
  for (const node of root.querySelectorAll<HTMLElement>(SCROLL_TARGET_SELECTOR)) {
    if (seen.has(node)) continue
    if ((node.textContent?.trim().length ?? 0) === 0) continue
    seen.add(node)
    ordered.push(node)
  }
  return ordered
}

/** 按文本长度加权，将 0–1 进度映射到 DOM 块 */
export function pickScrollTargetByProgress(
  targets: HTMLElement[],
  progress: number,
): HTMLElement | null {
  if (!targets.length) return null

  const ratio = Math.min(1, Math.max(0, progress))
  if (ratio >= 1) return targets[targets.length - 1]

  const weights = targets.map((target) => Math.max(1, target.textContent?.trim().length ?? 1))
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  let remaining = ratio * total
  for (let i = 0; i < targets.length; i += 1) {
    remaining -= weights[i]
    if (remaining <= 0) return targets[i]
  }
  return targets[targets.length - 1]
}

/** 滚到视口中间（会联动 article 与外层 main 等可滚动祖先） */
export function scrollElementToViewportCenter(
  element: HTMLElement,
  behavior: ScrollBehavior = "smooth",
) {
  element.scrollIntoView({ behavior, block: "center", inline: "nearest" })
}

export async function waitForNovelGuideLayout(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

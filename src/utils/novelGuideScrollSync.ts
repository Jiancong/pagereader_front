/** 移动端导读正文：按音频进度估算当前段落并滚到容器中间 */

export function isNovelGuideMobileViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
}

export function collectNovelGuideScrollTargets(root: HTMLElement): HTMLElement[] {
  const nodes = root.querySelectorAll<HTMLElement>(
    ".novel-guide-content h2, .novel-guide-content h3, .novel-guide-content p, .novel-guide-content li",
  )
  return [...nodes].filter((el) => (el.textContent?.trim().length ?? 0) > 0)
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

export function scrollElementToContainerCenter(
  container: HTMLElement,
  element: HTMLElement,
  behavior: ScrollBehavior = "smooth",
) {
  const containerRect = container.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()
  const offset =
    elementRect.top +
    elementRect.height / 2 -
    (containerRect.top + containerRect.height / 2)
  container.scrollBy({ top: offset, behavior })
}

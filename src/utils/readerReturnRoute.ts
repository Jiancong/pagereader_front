/** 阅读器返回目标（ReaderView goBack） */
export type ReaderReturnTo = "workspace" | "project-reader" | "reader-hub"

export function readerOpenRouteQuery(options: {
  returnTo?: ReaderReturnTo
  projectId?: string
}): Record<string, string> {
  const returnTo = options.returnTo ?? "reader-hub"
  if (returnTo === "workspace") return { returnTo: "workspace" }
  if (returnTo === "project-reader") {
    const projectId = String(options.projectId || "").trim()
    if (projectId) return { returnTo: "project-reader", projectId }
  }
  return { returnTo: "reader-hub" }
}

export function navigateAfterReaderClose(
  router: { push: (loc: unknown) => void },
  options: {
    query?: Record<string, string | string[] | undefined | null>
    returnTo?: string
    returnProjectId?: string
    /** 未指定 returnTo 时，已登录用户默认回工作区 */
    loggedIn?: boolean
  },
): void {
  const query = options.query ?? {}
  const returnTo = String(options.returnTo || query.returnTo || "").trim()
  const projectId = String(options.returnProjectId || query.projectId || "").trim()
  if (returnTo === "workspace") {
    router.push({ name: "workspace" })
    return
  }
  if (returnTo === "project-reader" && projectId) {
    router.push({ name: "project-reader", params: { projectId } })
    return
  }
  if (returnTo === "reader-hub") {
    router.push({ name: "reader" })
    return
  }
  if (options.loggedIn) {
    router.push({ name: "workspace" })
    return
  }
  router.push({ name: "reader" })
}

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
  query: Record<string, string | string[] | undefined | null>,
): void {
  const returnTo = String(query.returnTo ?? "").trim()
  const projectId = String(query.projectId ?? "").trim()
  if (returnTo === "workspace") {
    router.push({ name: "workspace" })
    return
  }
  if (returnTo === "project-reader" && projectId) {
    router.push({ name: "project-reader", params: { projectId } })
    return
  }
  router.push({ name: "reader" })
}

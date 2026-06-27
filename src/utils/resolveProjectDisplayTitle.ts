import { feedApi } from "@/api"
import { resolvePptDataFromStreamComplete } from "@/utils/pptCompletePayload"
import { collectDeckUrls } from "@/utils/projectCommunity"
import {
  pickGeneratedDeckTitleFromContent,
  pickPptDataTitle,
  pickProjectFallbackTitle,
} from "@/utils/projectTitle"

/** 从 project + conversation/history 解析 deck JSON 的 title（与 ProjectPreview 一致） */
export async function resolveProjectDisplayTitle(projectId: string): Promise<string> {
  const id = String(projectId || "").trim()
  if (!id) return ""

  try {
    const [proj, hist] = await Promise.all([
      feedApi.getProject(id).catch(() => null),
      feedApi.getProjectConversationHistory(id).catch(() => []),
    ])

    const urls = collectDeckUrls(proj, hist)
    for (const ppt_data_url of urls) {
      const resolved = await resolvePptDataFromStreamComplete({ projectId: id, ppt_data_url })
      const title = pickPptDataTitle(resolved?.pptData)
      if (title) return title
    }

    const assistantRows = [...hist].reverse().filter((h) => h.role === "assistant")
    for (const row of assistantRows) {
      const title = pickGeneratedDeckTitleFromContent(row.content)
      if (title) return title
    }

    return pickProjectFallbackTitle(proj)
  } catch {
    return ""
  }
}

/**
 * 专家默认形象（thumbnail / cover_url）预设。
 * 生产可改为 GET /api2/book-experts/avatar-presets 下发；见 docs/book_expert_avatar_presets_spec.md。
 */
export interface BookExpertAvatarPreset {
  id: string
  /** i18n key under bookExpert.avatarPresets.* */
  labelKey: string
  url: string
}

const DICEBEAR = (seed: string) =>
  `https://api.dicebear.com/7.x/notionists/png?seed=${encodeURIComponent(seed)}&size=256&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`

/** 稳定 HTTPS 地址，便于 Python 直接存 cover_url（若 BFF 支持 JSON）或 multipart 回传 OSS */
export const BOOK_EXPERT_AVATAR_PRESETS: BookExpertAvatarPreset[] = [
  { id: "scholar-m", labelKey: "scholarM", url: DICEBEAR("book-expert-scholar-m") },
  { id: "scholar-f", labelKey: "scholarF", url: DICEBEAR("book-expert-scholar-f") },
  { id: "mentor", labelKey: "mentor", url: DICEBEAR("book-expert-mentor") },
  { id: "strategist", labelKey: "strategist", url: DICEBEAR("book-expert-strategist") },
  { id: "historian", labelKey: "historian", url: DICEBEAR("book-expert-historian") },
  { id: "scientist", labelKey: "scientist", url: DICEBEAR("book-expert-scientist") },
  { id: "writer", labelKey: "writer", url: DICEBEAR("book-expert-writer") },
  { id: "coach", labelKey: "coach", url: DICEBEAR("book-expert-coach") },
  { id: "philosopher", labelKey: "philosopher", url: DICEBEAR("book-expert-philosopher") },
  { id: "analyst", labelKey: "analyst", url: DICEBEAR("book-expert-analyst") },
  { id: "guide", labelKey: "guide", url: DICEBEAR("book-expert-guide") },
  { id: "curator", labelKey: "curator", url: DICEBEAR("book-expert-curator") },
]

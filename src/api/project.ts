// 项目与对话历史（侧边栏「我的历史」）
// @author hc @date 2026-06-05

export {
  getProject,
  getProjectConversationHistory,
  appendProjectConversationMessage,
  normalizeProjectConversationHistory,
  normalizeConversationHistoryRow,
  uploadProjectCover,
  getProjectPromptHistory,
  incrementProjectView,
  getMyProjects,
  shareToCommunity,
  shareBookToCommunity,
  updateProjectCategory,
  forkProject,
  listComments,
  postComment,
  toggleCommentLike,
  reportReadingProgress,
  getReadingStats,
  getMyReadingProjects,
  getCommunityStats,
  getRelatedProjects,
  deleteProject,
  getFeedTopicCategories,
} from "./feed"

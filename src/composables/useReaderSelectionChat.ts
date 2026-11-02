import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { usePptRelatedSearch, type PptRelatedSearchContext } from '@/composables/usePptRelatedSearch'

export const READER_SELECTION_CHAT_INTENT = 'reader_selection_chat'

export function useReaderSelectionChat(options: {
  bookTitle: () => string
  pageContext: () => string
  selectionSnippet: () => string
}) {
  const { t } = useI18n()
  const { state, runRelatedSearch, closePanel, closeStream } = usePptRelatedSearch()

  function buildReaderSelectionMessage(query: string, _pptTitle?: string): string {
    const q = query.trim()
    const title = options.bookTitle().trim()
    const selection = options.selectionSnippet().trim()
    const page = options.pageContext().trim().slice(0, 1800)
    const parts: string[] = []
    if (title) parts.push(t('reader.selectionAskBookLine', { title }))
    if (selection) parts.push(`${t('reader.selectionAskSelectionLabel')}\n${selection}`)
    if (page) parts.push(`${t('reader.selectionAskPageContextLabel')}\n${page}`)
    parts.push(`${t('reader.selectionAskQuestionLabel')}\n${q}`)
    return parts.join('\n\n')
  }

  const searchContext = computed((): PptRelatedSearchContext => ({
    pptTitle: options.bookTitle(),
    buildMessage: buildReaderSelectionMessage,
  }))

  async function askAboutTerm(term: string) {
    const q = term.trim()
    if (!q) {
      ElMessage.warning(t('agent.pptRelatedSearchSelectText'))
      return
    }
    await runRelatedSearch({
      term: q,
      pptTitle: options.bookTitle(),
      buildMessage: buildReaderSelectionMessage,
      source: 'MANUAL_SELECTION',
      intent: READER_SELECTION_CHAT_INTENT,
      sessionIdPrefix: 'reader-selection',
    })
    if (state.value.error === 'login_required') {
      ElMessage.warning(t('reader.selectionAskLoginRequired'))
    }
  }

  return {
    selectionChatState: state,
    selectionChatContext: searchContext,
    askAboutTerm,
    closeSelectionChatPanel: closePanel,
    closeSelectionChatStream: closeStream,
  }
}

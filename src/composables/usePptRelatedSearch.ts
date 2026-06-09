import { ref } from "vue";
import { authApi, isLoggedIn } from "@/api";
import { sendAgentChatWithStream } from "@/request/agent";
import type { UploadedDocument } from "@/utils/pptDocumentRag";

/** 与后端 chat-stream §6.1 一致，区分主 PPT 生成与划词追问 */
export const PPT_RELATED_SEARCH_INTENT = "ppt_related_search";

export type PptRelatedSearchSource = "MANUAL_SELECTION" | "AUTO_KEYPOINT";

export interface PptRelatedSearchImage {
  url: string;
  thumbnail?: string;
  title?: string;
  source?: string;
  pageUrl?: string;
  caption?: string;
  license?: string;
}

export interface PptRelatedSearchState {
  visible: boolean;
  term: string;
  content: string;
  imageResults: PptRelatedSearchImage[];
  loading: boolean;
  error: string | null;
  isRagResponse: boolean;
  knowledgeBased: boolean;
  isSearchResponse: boolean;
}

export interface PptRelatedSearchContext {
  pptTitle?: string;
  projectId?: string;
  slideIndex?: number;
  uploadedDocuments?: UploadedDocument[];
  buildMessage: (term: string, pptTitle?: string) => string;
}

export interface PptRelatedSearchOptions {
  term: string;
  pptTitle?: string;
  projectId?: string;
  slideIndex?: number;
  source?: PptRelatedSearchSource;
  uploadedDocuments?: UploadedDocument[];
  buildMessage: (term: string, pptTitle?: string) => string;
}

function extractKnowledgeText(data: Record<string, unknown> | null | undefined): string {
  if (!data) return "";
  const raw =
    data.response ??
    data.message ??
    (data.full_text != null ? data.full_text : "");
  return raw ? String(raw) : "";
}

function extractDeltaText(data: Record<string, unknown> | null | undefined): string {
  if (!data) return "";
  if (data.delta != null) return String(data.delta);
  if (data.text != null) return String(data.text);
  if (data.chunk != null) return String(data.chunk);
  return "";
}

function normalizeImageItem(raw: unknown): PptRelatedSearchImage | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const url = String(item.url || item.thumbnail || "").trim();
  if (!url) return null;
  return {
    url,
    thumbnail: item.thumbnail ? String(item.thumbnail) : undefined,
    title: item.title
      ? String(item.title)
      : item.caption
        ? String(item.caption)
        : undefined,
    source: item.source ? String(item.source) : undefined,
    pageUrl: item.page_url ? String(item.page_url) : undefined,
    caption: item.caption ? String(item.caption) : undefined,
    license: item.license ? String(item.license) : undefined,
  };
}

function extractImageResults(data: Record<string, unknown>): PptRelatedSearchImage[] {
  const seen = new Set<string>();
  const results: PptRelatedSearchImage[] = [];
  const push = (item: PptRelatedSearchImage | null) => {
    if (!item || seen.has(item.url)) return;
    seen.add(item.url);
    results.push(item);
  };

  if (Array.isArray(data.image_results)) {
    for (const raw of data.image_results) {
      push(normalizeImageItem(raw));
    }
  }
  push(normalizeImageItem(data.selected_image));
  return results;
}

async function resolveUserId(): Promise<string | null> {
  if (!isLoggedIn()) return null;
  try {
    const d = await authApi.getCurrentDetail();
    return d?.id != null ? String(d.id) : null;
  } catch {
    return null;
  }
}

export function usePptRelatedSearch() {
  const state = ref<PptRelatedSearchState>({
    visible: false,
    term: "",
    content: "",
    imageResults: [],
    loading: false,
    error: null,
    isRagResponse: false,
    knowledgeBased: false,
    isSearchResponse: false,
  });

  let streamConnection: { close: () => void } | null = null;
  let streamBuf = "";
  let streamHadDelta = false;
  let streamFinalized = false;

  function resetStreamFlags() {
    streamBuf = "";
    streamHadDelta = false;
    streamFinalized = false;
  }

  function closeStream() {
    streamConnection?.close();
    streamConnection = null;
  }

  function closePanel() {
    closeStream();
    state.value.visible = false;
    state.value.loading = false;
  }

  function applyKnowledgePayload(data: Record<string, unknown>) {
    const text = extractKnowledgeText(data);
    if (text) {
      state.value.content = text;
      streamBuf = text;
    } else if (streamBuf) {
      state.value.content = streamBuf;
    }
    state.value.isRagResponse = !!data.is_rag_response;
    state.value.knowledgeBased = !!data.knowledge_based;
    state.value.isSearchResponse = !!data.is_search_response;
    state.value.imageResults = extractImageResults(data);
    streamFinalized = true;
    state.value.loading = false;
  }

  async function runRelatedSearch(
    options: PptRelatedSearchOptions,
  ): Promise<PptRelatedSearchState> {
    const term = String(options.term || "").trim();
    if (!term) return state.value;

    closeStream();
    resetStreamFlags();

    state.value = {
      visible: true,
      term,
      content: "",
      imageResults: [],
      loading: true,
      error: null,
      isRagResponse: false,
      knowledgeBased: false,
      isSearchResponse: false,
    };

    let settle: ((value: PptRelatedSearchState) => void) | null = null;
    let settled = false;
    const streamDone = new Promise<PptRelatedSearchState>((resolve) => {
      settle = resolve;
    });
    const finish = () => {
      if (settled || !settle) return;
      settled = true;
      const done = settle;
      settle = null;
      done({ ...state.value });
    };

    const userId = await resolveUserId();
    if (!userId) {
      state.value.loading = false;
      state.value.error = "login_required";
      finish();
      return streamDone;
    }

    const uploadedDocs = options.uploadedDocuments ?? [];
    const message = options.buildMessage(term, options.pptTitle);
    const pptTitle = String(options.pptTitle || "").trim() || undefined;
    const source: PptRelatedSearchSource = options.source ?? "MANUAL_SELECTION";
    const extraBody: Record<string, unknown> = {
      intent: PPT_RELATED_SEARCH_INTENT,
      term,
      source,
    };
    if (pptTitle) extraBody.pptTitle = pptTitle;
    if (typeof options.slideIndex === "number" && !Number.isNaN(options.slideIndex)) {
      extraBody.slideIndex = options.slideIndex;
    }

    try {
      streamConnection = await sendAgentChatWithStream(
        {
          message,
          userId,
          projectId: options.projectId || undefined,
          sessionId: `ppt-related-${Date.now()}`,
          isAgent: true,
          intent: PPT_RELATED_SEARCH_INTENT,
          extra_body: extraBody,
          uploaded_documents: uploadedDocs.length ? uploadedDocs : undefined,
        },
        async (eventData) => {
          const ev = String(eventData.event || "").toLowerCase();
          const data = (eventData.data || {}) as Record<string, unknown>;

          if (ev === "llm_text_stream_delta") {
            const field = String(data.field ?? data.stream_id ?? "")
              .trim()
              .toLowerCase();
            if (field.includes("response") || field.includes("summary")) {
              const delta = extractDeltaText(data);
              if (!delta) return;
              streamHadDelta = true;
              streamBuf += delta;
              state.value.content = streamBuf;
            }
            return;
          }

          if (ev === "llm_text_stream_end") {
            const fullText = extractKnowledgeText(data);
            if (fullText) {
              streamBuf = fullText;
              state.value.content = fullText;
            }
            return;
          }

          if (ev === "knowledge_response") {
            applyKnowledgePayload(data);
            finish();
            return;
          }

          if (ev === "chat_response") {
            const text =
              extractKnowledgeText(data) ||
              (typeof data.content === "string" ? data.content : "");
            if (text) {
              state.value.content = text;
              streamBuf = text;
              streamFinalized = true;
              state.value.loading = false;
              finish();
            }
            return;
          }

          if (ev === "complete") {
            if (!streamFinalized) {
              if (streamBuf) state.value.content = streamBuf;
              else if (
                !state.value.content.trim() &&
                state.value.imageResults.length === 0
              ) {
                state.value.error = "empty";
              }
            }
            state.value.loading = false;
            finish();
            return;
          }

          if (ev === "error") {
            state.value.error =
              String(data.message || data.error || "error").trim() || "error";
            state.value.loading = false;
            finish();
          }
        },
        () => {
          if (
            state.value.loading &&
            !state.value.content.trim() &&
            state.value.imageResults.length === 0
          ) {
            state.value.error = "error";
          }
          state.value.loading = false;
          finish();
        },
        () => {
          if (state.value.loading) {
            if (streamBuf) state.value.content = streamBuf;
            state.value.loading = false;
          }
          finish();
        },
        180000
      );
    } catch (err) {
      console.error("[ppt related search]", err);
      state.value.error = "error";
      state.value.loading = false;
      finish();
    }

    return streamDone;
  }

  return {
    state,
    runRelatedSearch,
    closePanel,
    closeStream,
  };
}

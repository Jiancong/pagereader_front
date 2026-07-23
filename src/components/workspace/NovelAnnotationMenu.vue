<template>
  <div
    v-show="show"
    class="novel-annot-menu"
    :style="{ left: `${x}px`, top: `${y}px`, zIndex: String(zIndex) }"
    @click.stop
    @contextmenu.prevent
  >
    <!-- 选区预览 -->
    <div v-if="mode === 'create' && selectionText" class="novel-annot-menu-selection">
      「{{ selectionPreview }}」
    </div>

    <!-- 创建模式：两个操作 -->
    <template v-if="mode === 'create'">
      <div
        class="novel-annot-menu-item"
        :class="{ 'novel-annot-menu-item--disabled': !selectionText }"
        @click="onHighlightOnly"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m9 11-6 6v3h3l6-6" />
          <path d="m21 13-2 2-7-7 2-2c1.6-1.6 4.1-1.6 5.7 0l1.3 1.3c1.6 1.6 1.6 4.1 0 5.7Z" />
        </svg>
        <span>{{ t("workspace.novelAnnotateHighlight") }}</span>
      </div>
      <div
        class="novel-annot-menu-item"
        :class="{ 'novel-annot-menu-item--disabled': !selectionText }"
        @click="onStartNote"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        <span>{{ t("workspace.novelAnnotateNote") }}</span>
      </div>
    </template>

    <!-- 编辑模式：显示已有想法 -->
    <template v-else>
      <div v-if="currentNote" class="novel-annot-menu-item novel-annot-menu-item--note">
        {{ currentNote }}
      </div>
      <div v-else class="novel-annot-menu-item novel-annot-menu-item--note novel-annot-menu-item--empty">
        {{ t("workspace.novelAnnotateNoteEmpty") }}
      </div>
      <div
        class="novel-annot-menu-item"
        @click="onEditNote"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        <span>{{ t("workspace.novelAnnotateEdit") }}</span>
      </div>
      <div
        class="novel-annot-menu-item novel-annot-menu-item--danger"
        @click="onDelete"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 6h18" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        <span>{{ t("workspace.novelAnnotateDelete") }}</span>
      </div>
    </template>

    <div class="novel-annot-menu-divider" />

    <!-- 想法输入区（划线时弹出） -->
    <div v-if="showNoteInput" class="novel-annot-menu-note">
      <textarea
        ref="noteInputRef"
        v-model="noteText"
        class="novel-annot-menu-note-input"
        rows="3"
        :placeholder="t('workspace.novelAnnotateNotePlaceholder')"
        @keydown.enter.exact.prevent="onSubmitNote"
        @keydown.esc.prevent="onCancelNote"
        @keydown.stop
        @keyup.stop
        @click.stop
      />
      <div class="novel-annot-menu-note-actions">
        <button type="button" class="novel-annot-menu-btn" @click="onCancelNote">
          {{ t("workspace.novelAnnotateCancel") }}
        </button>
        <button type="button" class="novel-annot-menu-btn novel-annot-menu-btn--primary" @click="onSubmitNote">
          {{ t("workspace.novelAnnotateSave") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue"
import { useI18n } from "vue-i18n"

const props = withDefaults(
  defineProps<{
    show: boolean
    x: number
    y: number
    /** create: 从右键选区新建；edit: 点击已有 mark 编辑 */
    mode?: "create" | "edit"
    selectionText?: string
    /** edit 模式下展示的已有想法 */
    currentNote?: string
    zIndex?: number
  }>(),
  {
    mode: "create",
    selectionText: "",
    currentNote: "",
    zIndex: 12050,
  },
)

const emit = defineEmits<{
  (e: "highlight"): void
  (e: "submit-note", note: string): void
  (e: "edit-note"): void
  (e: "delete"): void
  (e: "close"): void
}>()

const { t } = useI18n()

const noteInputRef = ref<HTMLTextAreaElement | null>(null)
const noteText = ref("")
const showNoteInput = ref(false)

const selectionPreview = computed(() => {
  const text = props.selectionText.trim()
  if (text.length <= 24) return text
  return `${text.slice(0, 24)}…`
})

watch(
  () => props.show,
  (visible) => {
    if (visible) {
      noteText.value = props.mode === "edit" ? (props.currentNote ?? "") : ""
      showNoteInput.value = false
      return
    }
    noteText.value = ""
    showNoteInput.value = false
  },
)

function close() {
  emit("close")
}

function onHighlightOnly() {
  if (!props.selectionText.trim()) return
  emit("highlight")
  close()
}

function onStartNote() {
  if (!props.selectionText.trim()) return
  showNoteInput.value = true
  nextTick(() => noteInputRef.value?.focus())
}

function onSubmitNote() {
  const note = noteText.value.trim()
  emit("submit-note", note)
  showNoteInput.value = false
  close()
}

function onCancelNote() {
  showNoteInput.value = false
  if (props.mode === "create") {
    // 取消输入回到操作列表，菜单仍打开
    return
  }
  close()
}

function onEditNote() {
  showNoteInput.value = true
  noteText.value = props.currentNote ?? ""
  nextTick(() => noteInputRef.value?.focus())
}

function onDelete() {
  emit("delete")
  close()
}
</script>

<style scoped lang="scss">
.novel-annot-menu {
  position: fixed;
  min-width: 220px;
  max-width: min(340px, calc(100vw - 16px));
  padding: 6px 0;
  background: var(--card, #2d2d2d);
  border: 1px solid var(--border, #4a4a4a);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

.novel-annot-menu-selection {
  padding: 0 14px 8px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--muted-foreground, rgba(255, 255, 255, 0.55));
  word-break: break-all;
}

.novel-annot-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-size: 14px;
  color: var(--foreground, #e8e8e8);
  cursor: pointer;
  user-select: none;

  svg {
    flex-shrink: 0;
    color: #409eff;
  }

  &:hover {
    background: var(--secondary, #3a3a3a);
  }

  &--disabled {
    opacity: 0.45;
    cursor: not-allowed;

    &:hover {
      background: transparent;
    }
  }

  &--danger svg {
    color: #f56c6c;
  }

  &--note {
    display: block;
    font-size: 13px;
    line-height: 1.55;
    color: var(--foreground, #e8e8e8);
    white-space: pre-wrap;
    cursor: default;

    &:hover {
      background: transparent;
    }
  }

  &--empty {
    color: var(--muted-foreground, rgba(255, 255, 255, 0.45));
    font-style: italic;
  }
}

.novel-annot-menu-divider {
  height: 1px;
  margin: 4px 10px 6px;
  background: var(--border, rgba(255, 255, 255, 0.1));
}

.novel-annot-menu-note {
  padding: 0 10px 10px;
}

.novel-annot-menu-note-input {
  display: block;
  width: 100%;
  min-height: 72px;
  padding: 8px 10px;
  border: 1px solid var(--border, #4a4a4a);
  border-radius: 6px;
  background: var(--background, #1f1f1f);
  color: var(--foreground, #e8e8e8);
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
  outline: none;

  &::placeholder {
    color: var(--muted-foreground, rgba(255, 255, 255, 0.4));
  }

  &:focus {
    border-color: #409eff;
  }
}

.novel-annot-menu-note-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 6px;
}

.novel-annot-menu-btn {
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--border, #4a4a4a);
  border-radius: 5px;
  background: transparent;
  color: var(--foreground, #e8e8e8);
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;

  &:hover {
    background: var(--secondary, #3a3a3a);
  }

  &--primary {
    background: #409eff;
    border-color: #409eff;
    color: #fff;

    &:hover {
      background: #66b1ff;
      border-color: #66b1ff;
    }
  }
}
</style>

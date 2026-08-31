<template>
  <div :class="(activeTask.pptData || activeTask.cardResult || activeTask.novelResult || activeTask.outlineResult) ? 'mx-auto w-full min-w-0 max-w-[min(100%,96rem)]' : 'mx-auto w-full min-w-0 max-w-3xl'">
    <!-- Tab 切换：两套任务状态独立，可并行生成 -->
    <div class="mb-4 flex w-full justify-center sm:mb-8">
        <div class="inline-flex max-w-full flex-wrap justify-center gap-1 rounded-xl border border-border bg-secondary/30 p-1 sm:flex-nowrap sm:gap-0 sm:p-1.5">
          <button :class="tabClass('upload')" @click="activeTab = 'upload'">
            <Upload class="h-4 w-4" />
            {{ t('workspace.tabUpload') }}
            <span
              v-if="ragTask.isGenerating && activeTab !== 'upload'"
              class="relative ml-1 flex h-2 w-2"
              :title="t('workspace.taskRunning')"
            >
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span class="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          </button>
          <button :class="tabClass('prompt')" @click="activeTab = 'prompt'">
            <MessageSquare class="h-4 w-4" />
            {{ t('workspace.tabQuick') }}
            <span
              v-if="promptTask.isGenerating && activeTab !== 'prompt'"
              class="relative ml-1 flex h-2 w-2"
              :title="t('workspace.taskRunning')"
            >
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span class="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          </button>
          <button :class="tabClass('youtube')" @click="activeTab = 'youtube'">
            <Youtube class="h-4 w-4" />
            {{ t('workspace.tabYoutube') }}
            <span
              v-if="youtubeTask.isGenerating && activeTab !== 'youtube'"
              class="relative ml-1 flex h-2 w-2"
              :title="t('workspace.taskRunning')"
            >
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span class="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          </button>
          <button :class="tabClass('translate')" @click="activeTab = 'translate'">
            <Languages class="h-4 w-4" />
            {{ t('workspace.tabTranslate') }}
          </button>
          <button :class="tabClass('read')" @click="activeTab = 'read'">
            <BookOpen class="h-4 w-4" />
            {{ t('workspace.tabRead') }}
          </button>
        </div>
    </div>

    <!-- 已生成：视频大纲 -->
    <WorkspaceOutlineResult
      v-if="activeTask.outlineResult"
      :result="activeTask.outlineResult"
      :project-id="activeTask.projectId"
      :streaming="activeTask.isGenerating"
      @close="resetActiveTask"
    />

    <!-- 已生成：小说导读 -->
    <WorkspaceNovelResult
      v-else-if="activeTask.novelResult"
      :result="activeTask.novelResult"
      :project-id="activeTask.projectId"
      can-upload-cover
      @close="resetActiveTask"
    />

    <!-- 已生成：卡片模式结果 -->
    <WorkspaceCardResult
      v-else-if="activeTask.cardResult"
      :result="activeTask.cardResult"
      @close="resetActiveTask"
    />

    <!-- 已生成：展示当前标签对应任务的 PptViewer -->
    <div v-else-if="activeTask.pptData" class="min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
      <PptViewer
        :ppt-data="activeTask.pptData"
        :project-id="activeTask.projectId"
        :markdown="activeTask.markdown"
        :ppt-data-url="activeTask.pptDataUrl || ''"
        can-upload-cover
        @close="resetActiveTask"
        @update:ppt-data="(d) => (activeTask.pptData = d)"
      />
    </div>

    <template v-else>
      <div v-if="activeTab !== 'translate'" class="mb-4 rounded-xl border border-border bg-card/80 px-4 py-3 sm:px-5">
        <p class="text-sm font-medium text-foreground">{{ t('workspace.queueLabel') }}</p>
        <div class="mt-2 flex flex-wrap gap-3">
          <label class="queue-mode-option flex cursor-pointer items-center gap-2 text-sm">
            <input v-model="activeTask.queue" type="radio" value="CARD" class="accent-primary" />
            <span>{{ t('workspace.queueCard') }}</span>
            <span class="text-muted-foreground">({{ t('pricing.usageCardCredits') }})</span>
            <span class="queue-mode-tooltip" role="tooltip">{{ t('workspace.queueCardHint') }}</span>
          </label>
          <label class="queue-mode-option flex cursor-pointer items-center gap-2 text-sm">
            <input v-model="activeTask.queue" type="radio" value="DOCUMENT" class="accent-primary" />
            <span>{{ t('workspace.queueDocument') }}</span>
            <span class="text-muted-foreground">({{ t('pricing.usageDocumentCredits') }})</span>
            <span class="queue-mode-tooltip" role="tooltip">{{ t('workspace.queueDocumentHint') }}</span>
          </label>
          <label
            v-if="activeTab === 'upload'"
            class="queue-mode-option flex cursor-pointer items-center gap-2 text-sm"
          >
            <input v-model="activeTask.queue" type="radio" value="NOVEL" class="accent-primary" />
            <span>{{ t('workspace.queueNovel') }}</span>
            <span class="text-muted-foreground">({{ t('pricing.usageNovelCredits') }})</span>
            <span class="queue-mode-tooltip" role="tooltip">{{ t('workspace.queueNovelHint') }}</span>
          </label>
          <label
            v-if="activeTab === 'youtube'"
            class="queue-mode-option flex cursor-pointer items-center gap-2 text-sm"
          >
            <input v-model="activeTask.queue" type="radio" value="OUTLINE" class="accent-primary" />
            <span>{{ t('workspace.queueOutline') }}</span>
            <span class="text-muted-foreground">({{ t('pricing.usageOutlineCredits') }})</span>
            <span class="queue-mode-tooltip" role="tooltip">{{ t('workspace.queueOutlineHint') }}</span>
          </label>
        </div>
        <p class="mt-2 text-xs text-muted-foreground">{{ t('workspace.queueHint') }}</p>
      </div>

      <div class="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <!-- RAG 上传分析 -->
        <div v-if="activeTab === 'upload'" class="p-6 sm:p-8">
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-foreground">{{ t(workspaceCopyKey('uploadTitle')) }}</h3>
            <p class="mt-1 text-sm text-muted-foreground">{{ t(workspaceCopyKey('uploadHint')) }}</p>
          </div>
          <div
            class="cursor-pointer rounded-xl border-2 border-dashed border-border bg-secondary/30 p-8 text-center transition-colors hover:border-primary/50"
            @click="fileInput?.click()"
          >
            <input ref="fileInput" type="file" accept=".pdf,.doc,.docx,.txt,.md,.epub,.mobi,.srt" class="hidden" @change="onFileChange" />
            <div v-if="hasAttachedDoc" class="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-center">
              <FileText class="hidden h-10 w-10 text-primary sm:block" />
              <div class="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
              <FileText class="h-10 w-10 flex-shrink-0 text-primary sm:hidden" />
              <div class="min-w-0 flex-1 text-left">
                <p class="break-words font-medium text-foreground">{{ attachedDocName }}</p>
                <p v-if="attachedDocSizeLabel" class="text-sm text-muted-foreground">{{ attachedDocSizeLabel }}</p>
                <p v-if="cloudDocument" class="text-xs text-muted-foreground">{{ t('workspace.fromCloudLibrary') }}</p>
              </div>
              <button type="button" class="flex-shrink-0 rounded-lg p-1 hover:bg-secondary" @click.stop="clearAttachedDoc">
                <X class="h-5 w-5 text-muted-foreground" />
              </button>
              </div>
            </div>
            <template v-else>
              <Upload class="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p class="mt-4 font-medium text-foreground">{{ t('workspace.pickFile') }}</p>
              <p class="mt-1 text-sm text-muted-foreground">{{ t('workspace.uploadFormatsShort') }}</p>
            </template>
          </div>
          <div
            v-if="srtPreview && srtPreview.cueCount > 0"
            class="mt-4 rounded-xl border border-border bg-secondary/30 p-4 text-left"
          >
            <p class="text-sm font-medium text-foreground">{{ t('workspace.srtPreviewTitle') }}</p>
            <p class="mt-1 text-xs text-muted-foreground">
              {{
                t('workspace.srtPreviewMeta', {
                  cues: srtPreview.cueCount,
                  speakers: srtPreview.speakers.length,
                  chars: srtPreview.charCount,
                })
              }}
            </p>
            <pre
              v-if="srtPreview.previewText"
              class="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground"
            >{{ srtPreview.previewText }}</pre>
          </div>
          <p v-else-if="uploadFileError" class="mt-3 text-sm text-red-400">{{ uploadFileError }}</p>
          <div v-if="hasAttachedDoc && !isNovelMode" class="mt-6">
            <label class="mb-2 block text-sm font-medium text-foreground">{{ t(workspaceCopyKey('uploadPromptLabel')) }}</label>
            <p class="mb-2 text-xs text-muted-foreground">{{ t(workspaceCopyKey('uploadPromptHint')) }}</p>
            <textarea
              v-model="uploadPrompt"
              :placeholder="t(workspaceCopyKey('uploadPromptPlaceholder'))"
              :disabled="ragTask.isGenerating"
              class="min-h-[120px] w-full resize-y rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            />
          </div>
          <button
            :disabled="!hasAttachedDoc || (!isNovelMode && !uploadPrompt.trim()) || ragTask.isGenerating"
            class="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            @click="onAnalyze"
          >
            <Loader2 v-if="ragTask.isGenerating" class="h-5 w-5 animate-spin" />
            <Sparkles v-else class="h-5 w-5" />
            {{ ragTask.isGenerating ? t('workspace.analyzingDoc') : t(workspaceCopyKey('analyzeAndGenerate')) }}
          </button>
        </div>

        <!-- 一句话 / 联网搜索 -->
        <div v-else-if="activeTab === 'prompt'" class="p-6 sm:p-8">
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-foreground">{{ t(workspaceCopyKey('promptTitle')) }}</h3>
            <p class="mt-1 text-sm text-muted-foreground">{{ t(workspaceCopyKey('promptHint')) }}</p>
          </div>
          <form class="space-y-4" @submit.prevent="onPromptSubmit">
            <textarea
              v-model="input"
              :placeholder="t(workspaceCopyKey('promptPlaceholder'))"
              class="min-h-[140px] w-full resize-none rounded-xl border border-border bg-secondary/50 px-4 py-4 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="submit"
              :disabled="promptTask.isGenerating || !input.trim()"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Loader2 v-if="promptTask.isGenerating" class="h-5 w-5 animate-spin" />
              <Sparkles v-else class="h-5 w-5" />
              {{ promptTask.isGenerating ? t('workspace.generating') : t(workspaceCopyKey('generateDeck')) }}
            </button>
          </form>
        </div>

        <!-- 沉浸式翻译（PDF / 网页） -->
        <div v-else-if="activeTab === 'translate'" class="p-6 sm:p-8">
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-foreground">{{ t('workspace.translateTitle') }}</h3>
            <p class="mt-1 text-sm text-muted-foreground">{{ t('workspace.translateHint') }}</p>
          </div>

          <!-- 来源切换：PDF / 网页 -->
          <div class="mb-6 flex gap-1 rounded-xl border border-border bg-secondary/30 p-1">
            <button type="button" :class="translateModeClass('pdf')" @click="translateMode = 'pdf'">
              <FileText class="h-4 w-4" />
              {{ t('workspace.translateModePdf') }}
            </button>
            <button type="button" :class="translateModeClass('url')" @click="translateMode = 'url'">
              <Globe class="h-4 w-4" />
              {{ t('workspace.translateModeUrl') }}
            </button>
          </div>

          <template v-if="translateMode === 'pdf'">
            <div
              @dragover.prevent="isDraggingPdf = true"
              @dragleave="isDraggingPdf = false"
              @drop.prevent="handlePdfDrop"
              :class="[
                'cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors',
                isDraggingPdf ? 'border-primary bg-primary/5' : 'border-border bg-secondary/30 hover:border-primary/50',
              ]"
              @click="pdfFileInput?.click()"
            >
              <input
                ref="pdfFileInput"
                type="file"
                accept=".pdf,application/pdf"
                class="hidden"
                @change="handlePdfSelect"
              />
              <div v-if="hasTranslatePdf" class="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-center">
                <FileText class="h-10 w-10 flex-shrink-0 text-primary" />
                <div class="min-w-0 flex-1 text-left">
                  <p class="break-words font-medium text-foreground">{{ translatePdfName }}</p>
                  <p v-if="translatePdfSizeLabel" class="text-sm text-muted-foreground">{{ translatePdfSizeLabel }}</p>
                  <p v-if="cloudPdfDocument" class="text-xs text-muted-foreground">{{ t('workspace.fromCloudLibrary') }}</p>
                </div>
                <button type="button" class="flex-shrink-0 rounded-lg p-1 hover:bg-secondary" @click.stop="clearTranslatePdf">
                  <X class="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
              <template v-else>
                <Languages class="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p class="mt-4 font-medium text-foreground">{{ t('workspace.translatePickPdf') }}</p>
                <p class="mt-1 text-sm text-muted-foreground">{{ t('workspace.translateFormats') }}</p>
              </template>
            </div>

            <p class="mt-4 text-xs text-muted-foreground">{{ t('workspace.translateFromCloud') }}</p>
          </template>

          <div v-else>
            <label class="mb-2 block text-sm font-medium text-foreground">{{ t('workspace.translateUrlLabel') }}</label>
            <input
              v-model="translateUrl"
              type="url"
              inputmode="url"
              class="w-full rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              :placeholder="t('workspace.translateUrlPlaceholder')"
              @keyup.enter="startImmersiveTranslation"
            />
            <p class="mt-2 text-xs text-muted-foreground">{{ t('workspace.translateUrlHint') }}</p>
          </div>

          <p v-if="translateError" class="mt-4 text-sm text-red-400">{{ translateError }}</p>

          <button
            type="button"
            :disabled="translateMode === 'pdf' ? (!hasTranslatePdf || translateLoading) : !isTranslateUrlValid"
            class="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            @click="startImmersiveTranslation"
          >
            <Loader2 v-if="translateLoading" class="h-5 w-5 animate-spin" />
            <Languages v-else class="h-5 w-5" />
            {{ translateLoading ? t('workspace.translateFetchingPdf') : t('workspace.translateStart') }}
          </button>
        </div>

        <!-- 在线阅读 -->
        <div v-else-if="activeTab === 'read'" class="p-6 sm:p-8">
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-foreground">{{ t('workspace.readTitle') }}</h3>
            <p class="mt-1 text-sm text-muted-foreground">{{ t('workspace.readHint') }}</p>
          </div>

          <div
            @dragover.prevent="isDraggingReader = true"
            @dragleave="isDraggingReader = false"
            @drop.prevent="handleReaderDrop"
            :class="[
              'cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors',
              isDraggingReader ? 'border-primary bg-primary/5' : 'border-border bg-secondary/30 hover:border-primary/50',
            ]"
            @click="readerFileInput?.click()"
          >
            <input
              ref="readerFileInput"
              type="file"
              accept=".pdf,.epub,.mobi,.azw,.azw3,.xlsx,.xls,application/pdf,application/epub+zip,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              class="hidden"
              @change="handleReaderSelect"
            />
            <div v-if="selectedReaderFile" class="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-center">
              <BookOpen class="h-10 w-10 flex-shrink-0 text-primary" />
              <div class="min-w-0 flex-1 text-left">
                <p class="break-words font-medium text-foreground">{{ selectedReaderFile.name }}</p>
                <p v-if="readerFileSizeLabel" class="text-sm text-muted-foreground">{{ readerFileSizeLabel }}</p>
              </div>
              <button type="button" class="flex-shrink-0 rounded-lg p-1 hover:bg-secondary" @click.stop="clearReaderFile">
                <X class="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <template v-else>
              <BookOpen class="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p class="mt-4 font-medium text-foreground">{{ t('workspace.readPickFile') }}</p>
              <p class="mt-1 text-sm text-muted-foreground">{{ t('workspace.readFormats') }}</p>
            </template>
          </div>

          <button
            type="button"
            :disabled="!selectedReaderFile"
            class="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            @click="startReading"
          >
            <BookOpen class="h-5 w-5" />
            {{ t('workspace.readStart') }}
          </button>
        </div>

        <!-- YouTube 视频生成 PPT -->
        <div v-else-if="activeTab === 'youtube'" class="p-6 sm:p-8">
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-foreground">{{ t(workspaceCopyKey('youtubeTitle')) }}</h3>
            <p class="mt-1 text-sm text-muted-foreground">{{ t(workspaceCopyKey('youtubeHint')) }}</p>
          </div>

          <div class="space-y-4">
            <div>
              <label class="mb-2 block text-sm font-medium text-foreground">{{ t('workspace.youtubeUrlLabel') }}</label>
              <input
                v-model="youtubeUrl"
                type="url"
                inputmode="url"
                :disabled="youtubeTask.isGenerating"
                class="w-full rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                :placeholder="t('workspace.youtubeUrlPlaceholder')"
              />
            </div>

            <div v-if="!isNovelMode && !isOutlineMode">
              <label class="mb-2 block text-sm font-medium text-foreground">{{ t('workspace.youtubePromptLabel') }}</label>
              <p class="mb-2 text-xs text-muted-foreground">{{ t('workspace.youtubePromptHint') }}</p>
              <textarea
                v-model="youtubePrompt"
                :disabled="youtubeTask.isGenerating"
                class="min-h-[120px] w-full resize-y rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                :placeholder="t('workspace.youtubePromptPlaceholder')"
              />
            </div>

            <div class="flex flex-wrap gap-3">
              <button
                type="button"
                :disabled="!isYoutubeUrlValid || transcriptLoading || youtubeTask.isGenerating"
                class="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
                @click="onPreviewYoutubeTranscript"
              >
                <Loader2 v-if="transcriptLoading" class="h-4 w-4 animate-spin" />
                {{ transcriptLoading ? t('workspace.youtubeTranscriptLoading') : t('workspace.youtubeTranscriptPreview') }}
              </button>
              <button
                v-if="youtubeTask.isGenerating"
                type="button"
                class="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/15"
                @click="onCancelYoutube"
              >
                {{ t('workspace.youtubeCancel') }}
              </button>
            </div>

            <div
              v-if="transcriptPreview?.success"
              class="rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm text-foreground"
            >
              <p class="font-medium">{{ transcriptPreview.title || transcriptPreview.video_id }}</p>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ t('workspace.youtubeTranscriptMeta', {
                  language: transcriptPreview.language || '-',
                  sections: transcriptPreview.section_count ?? 0,
                  chars: transcriptPreview.char_count ?? 0,
                }) }}
              </p>
              <pre
                v-if="transcriptPreview.script_preview"
                class="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-background/70 p-3 text-xs text-muted-foreground"
              >{{ transcriptPreview.script_preview }}</pre>
            </div>

            <button
              type="button"
              :disabled="!isYoutubeUrlValid || (!isNovelMode && !isOutlineMode && !youtubePrompt.trim()) || youtubeTask.isGenerating"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              @click="onYoutubeSubmit"
            >
              <Loader2 v-if="youtubeTask.isGenerating" class="h-5 w-5 animate-spin" />
              <Sparkles v-else class="h-5 w-5" />
              {{ youtubeTask.isGenerating ? t('workspace.generating') : t(workspaceCopyKey('youtubeGenerate')) }}
            </button>
          </div>
        </div>

        <!-- 错误（当前标签任务） -->
        <div v-if="activeTab !== 'translate' && activeTask.errorMsg" class="border-t border-border bg-red-500/10 px-6 py-4 text-sm text-red-400 sm:px-8">
          <p>{{ activeTask.errorMsg }}</p>
          <RouterLink
            v-if="activeTask.showCreditsCta"
            to="/pricing"
            class="mt-2 inline-block font-medium text-primary hover:underline"
          >
            {{ t('workspace.creditsInsufficientCta') }}
          </RouterLink>
        </div>

        <!-- 进度（当前标签任务） -->
        <div
          v-if="activeTab !== 'translate' && (activeTask.logs.length || activeTask.isGenerating || activeTask.elapsedMs != null)"
          class="border-t border-border bg-secondary/20 p-6 sm:p-8"
        >
          <h4 class="mb-3 flex items-center justify-between gap-3 font-semibold text-foreground">
            <span class="flex items-center gap-2">
              <span v-if="activeTask.isGenerating" class="relative flex h-2.5 w-2.5">
                <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              </span>
              {{ t('workspace.progressTitle') }}
            </span>
            <span
              v-if="activeElapsedDisplay"
              class="shrink-0 font-mono text-sm font-normal tabular-nums text-muted-foreground"
            >
              {{ t('workspace.elapsedTime', { time: activeElapsedDisplay }) }}
            </span>
          </h4>
          <p
            v-if="activeTask.isGenerating"
            class="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs leading-relaxed text-muted-foreground"
          >
            {{ t('workspace.generationLongRunningHint') }}
          </p>
          <div v-if="activeTask.isGenerating" class="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div class="flex items-center gap-3">
              <Loader2 class="h-5 w-5 flex-shrink-0 animate-spin text-primary" />
              <p class="flex-1 text-sm font-medium text-foreground">
                {{ activeTask.logs.length ? activeTask.logs[activeTask.logs.length - 1] : t('workspace.preparing') }}
              </p>
            </div>
            <div class="relative mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div class="ppt-indeterminate-bar" />
            </div>
          </div>
          <div class="space-y-1 rounded-lg border border-border bg-background/50 px-4 py-3 text-sm text-muted-foreground">
            <p
              v-for="(line, i) in activeLastLogs"
              :key="i"
              class="truncate"
              :class="i === activeLastLogs.length - 1 ? 'text-foreground' : 'opacity-50'"
            >
              {{ line }}
            </p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>


<script setup lang="ts">
import { ref, computed, reactive, watch, onBeforeUnmount } from "vue"
import { RouterLink, useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import { ElMessage } from "element-plus"
import { MessageSquare, Upload, Sparkles, FileText, Loader2, X, Youtube, Languages, Globe, BookOpen } from "lucide-vue-next"
import { useTranslateFileStore } from "@/stores/translateFile"
import { useReaderFileStore } from "@/stores/reader"
import PptViewer from "@/components/editor/chat/PptViewer.vue"
import WorkspaceCardResult from "@/components/workspace/WorkspaceCardResult.vue"
import WorkspaceNovelResult from "@/components/workspace/WorkspaceNovelResult.vue"
import WorkspaceOutlineResult from "@/components/workspace/WorkspaceOutlineResult.vue"
import {
  isBookCardStreamPayload,
  parseBookCardStreamPayload,
  type BookCardResult,
} from "@/utils/bookCardStream"
import {
  isOutlineStreamPayload,
  isOutlineCompleteEvent,
  resolveOutlineFromStreamComplete,
  persistOutlineCompleteToHistory,
  parseOutlineSection,
  mergeOutlineSection,
  ensureOutlineResult,
  applyOutlineNodePayload,
  type OutlineResult,
} from "@/utils/outlineStream"
import {
  isNovelStreamPayload,
  resolveNovelFromStreamComplete,
  persistNovelCompleteToHistory,
  type NovelResult,
} from "@/utils/novelStream"
import {
  authApi,
  fileApi,
  agentApi,
  creditsApi,
  isLoggedIn,
  ApiError,
  isCreditsInsufficient,
  isCreditsInsufficientMessage,
  isInvalidQueueMessage,
  canAffordQueue,
} from "../../api"
import type { PptQueue, YoutubeTranscriptResult } from "@/api/types"
import { resolvePptDataFromStreamComplete, isPptStreamPayload } from "@/utils/pptCompletePayload"
import { pollProjectGenerationAfterStreamDisconnect, GENERATION_POLL_MAX_WAIT_MS } from "@/utils/streamProjectPoll"
import { notifyCreditsRefresh } from "@/composables/useCreditsRefresh"
import type { UploadedDocument } from "@/utils/pptDocumentRag"
import { validatePptDocumentFile } from "@/utils/pptDocumentRag"
import { isSrtFileName, readSrtFile, parseSrtContent, type SrtParseResult } from "@/utils/srtParser"
import { formatBytes } from "@/utils/userAssets"
import {
  gtmGenerateStart,
  gtmGenerateComplete,
  gtmGenerateFail,
  gtmAssetAttach,
  gtmFileExt,
} from "@/composables/useGtmDataLayer"

const emit = defineEmits<{
  "project-started": [projectId: string]
  "project-complete": [projectId: string]
}>()

const { t } = useI18n()

const props = defineProps<{ initialPrompt?: string }>()

type GeneratorTask = {
  isGenerating: boolean
  logs: string[]
  errorMsg: string | null
  pptData: any
  markdown: string
  /** OSS 上 ppt_data JSON 的地址，划词追问回传后端 */
  pptDataUrl: string | null
  cardResult: BookCardResult | null
  novelResult: NovelResult | null
  outlineResult: OutlineResult | null
  projectId: string
  queue: PptQueue
  showCreditsCta: boolean
  streamRequestId: string | null
  /** 点击生成时记录；complete 时写入总耗时 */
  timerStartAt: number | null
  elapsedMs: number | null
}

function createTask(defaultQueue: PptQueue): GeneratorTask {
  return {
    isGenerating: false,
    logs: [],
    errorMsg: null,
    pptData: null,
    markdown: "",
    pptDataUrl: null,
    cardResult: null,
    novelResult: null,
    outlineResult: null,
    projectId: "",
    queue: defaultQueue,
    showCreditsCta: false,
    streamRequestId: null,
    timerStartAt: null,
    elapsedMs: null,
  }
}

/** 一句话 / 联网搜索：独立任务 */
const promptTask = reactive<GeneratorTask>(createTask("CARD"))
/** RAG 文档分析：独立任务 */
const ragTask = reactive<GeneratorTask>(createTask("DOCUMENT"))
/** YouTube 视频生成 PPT：独立任务 */
const youtubeTask = reactive<GeneratorTask>(createTask("DOCUMENT"))

const router = useRouter()
const translateFileStore = useTranslateFileStore()
const readerFileStore = useReaderFileStore()

const activeTab = ref<"prompt" | "upload" | "youtube" | "translate" | "read">("upload")
const input = ref(props.initialPrompt || "")
const youtubeUrl = ref("")
const youtubePrompt = ref("")
const transcriptPreview = ref<YoutubeTranscriptResult | null>(null)
const transcriptLoading = ref(false)
let youtubeAbort: AbortController | null = null
const uploadedFile = ref<File | null>(null)
const cloudDocument = ref<UploadedDocument | null>(null)
const cloudDocumentSize = ref<number | undefined>(undefined)
const selectedPdf = ref<File | null>(null)
const cloudPdfDocument = ref<UploadedDocument | null>(null)
const cloudPdfSize = ref<number | undefined>(undefined)
const pdfFileInput = ref<HTMLInputElement | null>(null)
const isDraggingPdf = ref(false)
const translateLoading = ref(false)
const translateError = ref("")
const translateMode = ref<"pdf" | "url">("pdf")
const translateUrl = ref("")
const selectedReaderFile = ref<File | null>(null)
const readerFileInput = ref<HTMLInputElement | null>(null)
const isDraggingReader = ref(false)
const uploadPrompt = ref("")
const uploadFileError = ref("")
const srtPreview = ref<SrtParseResult | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const hasAttachedDoc = computed(() => Boolean(uploadedFile.value || cloudDocument.value))
const isAttachedSrt = computed(() => {
  if (uploadedFile.value) return isSrtFileName(uploadedFile.value.name, uploadedFile.value.type)
  const doc = cloudDocument.value
  if (!doc) return false
  return isSrtFileName(doc.name || "", String(doc.type || ""))
})
const attachedDocName = computed(
  () => uploadedFile.value?.name || cloudDocument.value?.name || "",
)
const attachedDocSizeLabel = computed(() => {
  if (uploadedFile.value) return `${(uploadedFile.value.size / 1024 / 1024).toFixed(2)} MB`
  if (cloudDocumentSize.value != null) return formatBytes(cloudDocumentSize.value)
  return ""
})

const isPdfDocument = (doc: UploadedDocument | null | undefined) => {
  if (!doc) return false
  return /\.pdf$/i.test(doc.name || "") || /pdf/i.test(String(doc.type || ""))
}

const hasTranslatePdf = computed(() => Boolean(selectedPdf.value || cloudPdfDocument.value))

/** 规范化网页地址：补全协议、仅允许 http(s)，非法返回 null */
const normalizeWebUrl = (input: string): string | null => {
  const raw = input.trim()
  if (!raw) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const u = new URL(withScheme)
    if (u.protocol !== "http:" && u.protocol !== "https:") return null
    return u.href
  } catch {
    return null
  }
}

const isTranslateUrlValid = computed(() => normalizeWebUrl(translateUrl.value) !== null)

const translateModeClass = (mode: "pdf" | "url") => [
  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all sm:text-sm",
  translateMode.value === mode
    ? "bg-primary text-primary-foreground shadow"
    : "text-muted-foreground hover:text-foreground",
]
const translatePdfName = computed(
  () => selectedPdf.value?.name || cloudPdfDocument.value?.name || "",
)
const translatePdfSizeLabel = computed(() => {
  if (selectedPdf.value) return formatBytes(selectedPdf.value.size)
  if (cloudPdfSize.value != null) return formatBytes(cloudPdfSize.value)
  return ""
})
const readerFileSizeLabel = computed(() =>
  selectedReaderFile.value ? formatBytes(selectedReaderFile.value.size) : "",
)

const activeTask = computed(() => {
  if (activeTab.value === "prompt") return promptTask
  if (activeTab.value === "youtube") return youtubeTask
  return ragTask
})
const isYoutubeUrlValid = computed(() => agentApi.isLikelyYoutubeUrl(youtubeUrl.value))
const isCardMode = computed(() => activeTask.value.queue === "CARD")
const isNovelMode = computed(() => activeTask.value.queue === "NOVEL")
const isOutlineMode = computed(() => activeTask.value.queue === "OUTLINE")
const activeLastLogs = computed(() => activeTask.value.logs.slice(-3))

function workspaceCopyKey(suffix: string): string {
  if (isOutlineMode.value) return `workspace.${suffix}Outline`
  if (isNovelMode.value) return `workspace.${suffix}Novel`
  return isCardMode.value ? `workspace.${suffix}Card` : `workspace.${suffix}`
}

const timerNow = ref(Date.now())
let timerTickId: ReturnType<typeof setInterval> | null = null

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  if (m > 0) return `${m}:${String(s).padStart(2, "0")}`
  return `${s}s`
}

function ensureTimerTick() {
  if (timerTickId != null) return
  timerTickId = setInterval(() => {
    timerNow.value = Date.now()
  }, 1000)
}

function stopTimerTickIfIdle() {
  if (promptTask.isGenerating || ragTask.isGenerating || youtubeTask.isGenerating) return
  if (timerTickId != null) {
    clearInterval(timerTickId)
    timerTickId = null
  }
}

function stopTaskTimer(task: GeneratorTask) {
  if (task.timerStartAt != null && task.elapsedMs == null) {
    task.elapsedMs = Date.now() - task.timerStartAt
  }
  stopTimerTickIfIdle()
}

const activeElapsedDisplay = computed(() => {
  const task = activeTask.value
  if (task.elapsedMs != null) return formatElapsed(task.elapsedMs)
  if (task.isGenerating && task.timerStartAt != null) {
    return formatElapsed(timerNow.value - task.timerStartAt)
  }
  return null
})

const tabClass = (tab: "prompt" | "upload" | "youtube" | "translate" | "read") => [
  "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm",
  activeTab.value === tab ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground",
]

const appendLog = (task: GeneratorTask, line: string) => task.logs.push(line)

function hasTaskResult(task: GeneratorTask): boolean {
  return Boolean(task.pptData || task.cardResult || task.novelResult || task.outlineResult)
}

async function pollAndRecoverTaskResult(task: GeneratorTask, mode: "prompt" | "upload") {
  appendLog(task, t("workspace.streamDisconnectedPolling"))
  const resolved = await pollProjectGenerationAfterStreamDisconnect(task.projectId, task.queue, {
    maxWaitMs: GENERATION_POLL_MAX_WAIT_MS,
  })

  if (resolved?.kind === "ppt" && resolved.ppt?.pptData) {
    await handlePptStreamComplete(
      task,
      {
        ppt_data: resolved.ppt.pptData,
        project_id: task.projectId,
        markdown: resolved.ppt.markdown,
        ppt_data_url: resolved.ppt.pptDataUrl,
      },
      mode,
    )
    return
  }
  if (resolved?.kind === "novel" && resolved.novel) {
    await handleNovelStreamComplete(
      task,
      {
        output_format: "novel",
        novel_nodes: resolved.novel.novelNodes,
        title: resolved.novel.title,
        markdown: resolved.novel.markdown,
      },
      mode,
    )
    return
  }
  if (resolved?.kind === "outline" && resolved.outline) {
    await handleOutlineStreamComplete(
      task,
      {
        output_format: "outline",
        markdown: resolved.outline.markdown,
        nodes: resolved.outline.sections,
        title: resolved.outline.title,
      },
      mode,
    )
    return
  }
  if (resolved?.kind === "card" && resolved.card) {
    await handleCardStreamComplete(
      task,
      {
        status: "design_complete",
        response: resolved.card.content,
        image_urls: resolved.card.imageUrls,
        message: resolved.card.message,
      },
      mode,
    )
    return
  }

  if (!hasTaskResult(task)) {
    applyStreamError(task, t("workspace.streamPollTimeout"), mode)
  }
}

async function handleOutlineStreamComplete(
  task: GeneratorTask,
  data: unknown,
  mode: "prompt" | "upload",
) {
  stopTaskTimer(task)
  appendLog(task, t("workspace.loadingOutline"))
  try {
    const resolved = await resolveOutlineFromStreamComplete(data)
    if (resolved?.markdown || resolved?.sections.length) {
      task.outlineResult = {
        ...resolved,
        youtubeUrl: resolved.youtubeUrl || youtubeUrl.value.trim() || undefined,
      }
      appendLog(task, resolved.message || t("workspace.outlineResultReady"))
      await persistOutlineCompleteToHistory(task.projectId, data)
      gtmGenerateComplete(mode, task.queue, task.projectId)
      emit("project-complete", task.projectId)
    } else {
      task.errorMsg = t("workspace.outlineResultEmpty")
      gtmGenerateFail(mode, "other")
    }
  } catch {
    task.errorMsg = t("workspace.loadOutlineFailed")
    gtmGenerateFail(mode, "network")
  } finally {
    await refreshCreditsBar()
  }
}

async function handleNovelStreamComplete(
  task: GeneratorTask,
  data: unknown,
  mode: "prompt" | "upload",
) {
  stopTaskTimer(task)
  appendLog(task, t("workspace.loadingNovel"))
  try {
    const resolved = await resolveNovelFromStreamComplete(data)
    if (resolved?.markdown) {
      task.novelResult = resolved
      appendLog(task, resolved.message || t("workspace.novelResultReady"))
      await persistNovelCompleteToHistory(task.projectId, data)
      gtmGenerateComplete(mode, task.queue, task.projectId)
      emit("project-complete", task.projectId)
    } else {
      task.errorMsg = t("workspace.novelResultEmpty")
      gtmGenerateFail(mode, "other")
    }
  } catch {
    task.errorMsg = t("workspace.loadNovelFailed")
    gtmGenerateFail(mode, "network")
  } finally {
    await refreshCreditsBar()
  }
}

async function handlePptStreamComplete(
  task: GeneratorTask,
  data: unknown,
  mode: "prompt" | "upload",
) {
  stopTaskTimer(task)
  appendLog(task, t("workspace.loadingPpt"))
  try {
    const resolved = await resolvePptDataFromStreamComplete(data)
    if (resolved) {
      task.pptData = resolved.pptData
      task.markdown = resolved.markdown || ""
      task.pptDataUrl = resolved.pptDataUrl ?? null
      if (resolved.projectId) task.projectId = resolved.projectId
      gtmGenerateComplete(mode, task.queue, task.projectId)
      emit("project-complete", task.projectId)
    } else {
      task.errorMsg = t("workspace.completeNoPptData")
      gtmGenerateFail(mode, "other")
    }
  } catch {
    task.errorMsg = t("workspace.loadPptFailed")
    gtmGenerateFail(mode, "network")
  } finally {
    await refreshCreditsBar()
  }
}

async function handleCardStreamComplete(
  task: GeneratorTask,
  data: unknown,
  mode: "prompt" | "upload",
) {
  const parsed = parseBookCardStreamPayload(data)
  if (!parsed) {
    task.errorMsg = t("workspace.cardResultEmpty")
    gtmGenerateFail(mode, "other")
    return
  }
  stopTaskTimer(task)
  task.cardResult = parsed
  const doneLine = parsed.message || t("workspace.cardResultReady")
  appendLog(task, doneLine)
  gtmGenerateComplete(mode, task.queue, task.projectId)
  emit("project-complete", task.projectId)
  await refreshCreditsBar()
}

const refreshCreditsBar = () => notifyCreditsRefresh().catch(() => {})

const applyStreamError = (task: GeneratorTask, msg: string, mode: "prompt" | "upload") => {
  if (isCreditsInsufficientMessage(msg)) {
    task.showCreditsCta = true
    task.errorMsg = t("workspace.creditsInsufficient")
    gtmGenerateFail(mode, "credits")
  } else if (isInvalidQueueMessage(msg)) {
    task.errorMsg = t("workspace.invalidQueueError")
    gtmGenerateFail(mode, "other")
  } else {
    task.errorMsg = msg
    gtmGenerateFail(mode, "other")
  }
}

/** 生成前拉取最新余额并校验（/credits/account + /subscribe/my/status） */
async function ensureCreditsForTask(task: GeneratorTask): Promise<boolean> {
  try {
    const status = await creditsApi.getCreditsStatus()
    if (!canAffordQueue(status, task.queue)) {
      task.showCreditsCta = true
      task.errorMsg = t("workspace.creditsInsufficient")
      await refreshCreditsBar()
      return false
    }
    await refreshCreditsBar()
    return true
  } catch {
    return true
  }
}

function docBaseName(filename: string): string {
  const base = filename.split(/[/\\]/).pop() || filename
  const dot = base.lastIndexOf(".")
  return dot > 0 ? base.slice(0, dot) : base
}

/** 按当前 RAG 任务 queue，填充上传分析默认诉求（随 Card / Document 模式切换） */
function applyDefaultUploadPrompt() {
  if (!hasAttachedDoc.value) return
  let key =
    ragTask.queue === "CARD"
      ? "workspace.uploadPromptDefaultCard"
      : ragTask.queue === "NOVEL"
        ? "workspace.uploadPromptDefaultNovel"
        : "workspace.uploadPromptDefault"
  if (isAttachedSrt.value && ragTask.queue !== "NOVEL") {
    key =
      ragTask.queue === "CARD"
        ? "workspace.uploadPromptDefaultSrtCard"
        : "workspace.uploadPromptDefaultSrt"
  }
  uploadPrompt.value = t(key)
}

async function refreshSrtPreview(file: File | null, doc: UploadedDocument | null) {
  srtPreview.value = null
  if (file && isSrtFileName(file.name, file.type)) {
    try {
      srtPreview.value = await readSrtFile(file)
      if (!srtPreview.value.cueCount) {
        uploadFileError.value = t("workspace.srtParseEmpty")
      }
    } catch {
      uploadFileError.value = t("workspace.srtParseFailed")
    }
    return
  }
  if (doc && isSrtFileName(doc.name || "", String(doc.type || ""))) {
    try {
      const res = await fetch(doc.url)
      if (!res.ok) throw new Error("fetch failed")
      srtPreview.value = parseSrtContent(await res.text())
    } catch {
      // 云库 SRT 预览失败不阻断上传
    }
  }
}

watch(
  () => ragTask.queue,
  () => {
    if (activeTab.value === "upload") applyDefaultUploadPrompt()
  },
)

const onFileChange = async (e: Event) => {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  uploadFileError.value = ""
  srtPreview.value = null
  const validationError = validatePptDocumentFile(f)
  if (validationError === "unsupported") {
    uploadFileError.value = t("workspace.uploadUnsupportedType")
    if (fileInput.value) fileInput.value.value = ""
    return
  }
  if (validationError === "too_large") {
    uploadFileError.value = t("workspace.uploadTooLarge")
    if (fileInput.value) fileInput.value.value = ""
    return
  }
  cloudDocument.value = null
  cloudDocumentSize.value = undefined
  uploadedFile.value = f
  await refreshSrtPreview(f, null)
  applyDefaultUploadPrompt()
}

const clearAttachedDoc = () => {
  uploadedFile.value = null
  cloudDocument.value = null
  cloudDocumentSize.value = undefined
  uploadPrompt.value = ""
  uploadFileError.value = ""
  srtPreview.value = null
  if (fileInput.value) fileInput.value.value = ""
}

function attachCloudDocument(payload: { doc: UploadedDocument; size?: number }) {
  if (!payload?.doc?.url) return

  if (isPdfDocument(payload.doc) && activeTab.value === "translate") {
    selectedPdf.value = null
    if (pdfFileInput.value) pdfFileInput.value.value = ""
    cloudPdfDocument.value = payload.doc
    cloudPdfSize.value = payload.size
    translateError.value = ""
    gtmAssetAttach(gtmFileExt(payload.doc.name || ""))
    return
  }

  uploadedFile.value = null
  if (fileInput.value) fileInput.value.value = ""
  cloudDocument.value = payload.doc
  cloudDocumentSize.value = payload.size
  activeTab.value = "upload"
  uploadFileError.value = ""
  void refreshSrtPreview(null, payload.doc)
  applyDefaultUploadPrompt()
  gtmAssetAttach(gtmFileExt(payload.doc.name || ""))
}

const handlePdfSelect = (e: Event) => {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  if (!/\.pdf$/i.test(f.name) && f.type !== "application/pdf") return
  cloudPdfDocument.value = null
  cloudPdfSize.value = undefined
  selectedPdf.value = f
  translateError.value = ""
}

const handlePdfDrop = (e: DragEvent) => {
  isDraggingPdf.value = false
  const f = e.dataTransfer?.files?.[0]
  if (!f) return
  if (!/\.pdf$/i.test(f.name) && f.type !== "application/pdf") return
  cloudPdfDocument.value = null
  cloudPdfSize.value = undefined
  selectedPdf.value = f
  translateError.value = ""
}

const clearTranslatePdf = () => {
  selectedPdf.value = null
  cloudPdfDocument.value = null
  cloudPdfSize.value = undefined
  translateError.value = ""
  if (pdfFileInput.value) pdfFileInput.value.value = ""
}

const handleReaderDrop = (e: DragEvent) => {
  isDraggingReader.value = false
  const files = e.dataTransfer?.files
  if (files && files.length > 0) selectedReaderFile.value = files[0]
}

const handleReaderSelect = (e: Event) => {
  const files = (e.target as HTMLInputElement).files
  if (files && files.length > 0) selectedReaderFile.value = files[0]
}

const clearReaderFile = () => {
  selectedReaderFile.value = null
  if (readerFileInput.value) readerFileInput.value.value = ""
}

const startReading = () => {
  if (!selectedReaderFile.value) return
  readerFileStore.setFile(selectedReaderFile.value)
  router.push({ name: "reader" })
}

const startImmersiveTranslation = async () => {
  translateError.value = ""
  if (translateMode.value === "url") {
    const url = normalizeWebUrl(translateUrl.value)
    if (!url) return
    translateFileStore.setUrl(url)
    router.push({ name: "translate" })
    return
  }
  if (selectedPdf.value) {
    translateFileStore.setFile(selectedPdf.value)
    router.push({ name: "translate" })
    return
  }
  if (!cloudPdfDocument.value?.url) return

  translateLoading.value = true
  try {
    const res = await fetch(cloudPdfDocument.value.url, { credentials: "omit" })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const name = cloudPdfDocument.value.name || "document.pdf"
    const file = new File([blob], name, { type: blob.type || "application/pdf" })
    translateFileStore.setFile(file)
    router.push({ name: "translate" })
  } catch (e: unknown) {
    translateError.value =
      e instanceof Error ? e.message : t("workspace.translateFetchFailed")
  } finally {
    translateLoading.value = false
  }
}

const resolveUserId = async (): Promise<string | null> => {
  if (!isLoggedIn()) return null
  try {
    const d = await authApi.getCurrentDetail()
    return d?.id != null ? String(d.id) : null
  } catch {
    return null
  }
}

const toText = (data: unknown): string => {
  if (typeof data === "string") return data
  const o = data as Record<string, unknown> | null
  if (!o || typeof o !== "object") return String(data)
  if (typeof o.response === "string" && o.response.trim()) return o.response
  if (typeof o.message === "string") return o.message
  if (typeof o.text === "string") return o.text
  if (typeof o.data === "string") return o.data
  if (o.phase != null) return `Phase ${o.phase}${o.current_slide != null ? `: ${o.current_slide}/${o.total_slides ?? "?"}` : ""}`
  if (o.status === "in_progress") return String(o.progress_status || "生成中...")
  return ""
}

const runYoutubeStream = async (task: GeneratorTask, youtubeUrlValue: string, message: string) => {
  const streamRequestId = String(Date.now())
  task.streamRequestId = streamRequestId
  youtubeAbort?.abort()
  youtubeAbort = new AbortController()

  const { completed } = await agentApi.youtubePptStream(
    {
      youtube_url: youtubeUrlValue,
      project_id: task.projectId,
      message,
      queue: task.queue,
      stream_request_id: streamRequestId,
    },
    {
      onStarted: () => {
        emit("project-started", task.projectId)
        refreshCreditsBar()
      },
      onProgress: (data: unknown) => {
        const line = toText(data)
        if (line) appendLog(task, line)
      },
      onBillingDeduct: () => {
        refreshCreditsBar()
      },
      onEvent: async (event, data) => {
        if (event === "agent_billing_deduct_event") {
          refreshCreditsBar()
          return
        }
        if (task.cardResult || task.pptData || task.novelResult || task.outlineResult) return
        if (event === "ppt_ping") {
          appendLog(task, t("workspace.youtubeStillGenerating"))
          return
        }
        if (event === "novel_complete" || (event === "complete" && isNovelStreamPayload(data))) {
          await handleNovelStreamComplete(task, data, "upload")
          return
        }
        if (event === "ppt_complete" || (event === "design_complete" && isPptStreamPayload(data))) {
          await handlePptStreamComplete(task, data, "upload")
          return
        }
        if (event === "design_complete" && isBookCardStreamPayload(data)) {
          await handleCardStreamComplete(task, data, "upload")
        }
      },
      onComplete: async (data: unknown) => {
        if (task.pptData || task.cardResult || task.novelResult || task.outlineResult) return
        const o = (data && typeof data === "object" ? data : {}) as Record<string, unknown>
        if (isOutlineStreamPayload(o)) {
          await handleOutlineStreamComplete(task, data, "upload")
          return
        }
        if (isNovelStreamPayload(o)) {
          await handleNovelStreamComplete(task, data, "upload")
          return
        }
        if (isPptStreamPayload(o)) {
          await handlePptStreamComplete(task, data, "upload")
          return
        }
        if (isBookCardStreamPayload(o)) {
          await handleCardStreamComplete(task, data, "upload")
        }
      },
      onError: (msg: string) => {
        stopTaskTimer(task)
        applyStreamError(task, msg, "upload")
        refreshCreditsBar()
      },
    },
    youtubeAbort.signal,
  )

  if (completed || task.pptData || task.novelResult || task.outlineResult || task.cardResult) return

  appendLog(task, t("workspace.youtubeStreamDisconnectedPolling"))
  const resolved = await pollProjectGenerationAfterStreamDisconnect(task.projectId, task.queue, {
    signal: youtubeAbort?.signal,
    maxWaitMs: GENERATION_POLL_MAX_WAIT_MS,
  })
  if (resolved?.kind === "ppt" && resolved.ppt?.pptData) {
    await handlePptStreamComplete(
      task,
      {
        ppt_data: resolved.ppt.pptData,
        project_id: task.projectId,
        markdown: resolved.ppt.markdown,
        ppt_data_url: resolved.ppt.pptDataUrl,
      },
      "upload",
    )
  } else if (!hasTaskResult(task)) {
    applyStreamError(task, t("workspace.youtubeStreamPollTimeout"), "upload")
  }
}

const runStream = async (
  task: GeneratorTask,
  message: string,
  documents?: any[],
  projectName?: string,
  mode: "prompt" | "upload" = "prompt",
) => {
  const userId = await resolveUserId()
  if (!userId) {
    task.errorMsg = t("workspace.loginRequiredGenerate")
    task.isGenerating = false
    return
  }
  let streamCompleted = false
  try {
    const streamResult = await agentApi.chatStream(
    {
      message,
      userId,
      projectId: task.projectId,
      sessionId: task.projectId,
      isAgent: true,
      queue: task.queue,
      uploaded_documents: documents,
      ...(projectName ? { projectName } : {}),
    },
    {
      onStarted: () => {
        emit("project-started", task.projectId)
        refreshCreditsBar()
      },
      onProgress: (data: unknown) => {
        const line = toText(data)
        if (line) appendLog(task, line)
      },
      onBillingDeduct: () => {
        refreshCreditsBar()
      },
      onEvent: async (event, data) => {
        if (event === "agent_billing_deduct_event") {
          refreshCreditsBar()
          return
        }
        if (task.queue === "OUTLINE") {
          if (event === "outline_section") {
            handleOutlineSection(task, data)
            return
          }
          if (event === "outline_node") {
            task.outlineResult = applyOutlineNodePayload(task.outlineResult, data)
            return
          }
          if (isOutlineCompleteEvent(event, data)) {
            await handleOutlineStreamComplete(task, data, mode)
          }
          return
        }
        if (hasTaskResult(task)) return
        if (event === "novel_complete" || (event === "complete" && isNovelStreamPayload(data))) {
          await handleNovelStreamComplete(task, data, mode)
          return
        }
        if (event === "ppt_complete" || (event === "design_complete" && isPptStreamPayload(data))) {
          await handlePptStreamComplete(task, data, mode)
          return
        }
        if (event === "design_complete" && isBookCardStreamPayload(data)) {
          await handleCardStreamComplete(task, data, mode)
        }
      },
      onComplete: async (data: unknown) => {
        if (task.queue === "OUTLINE") {
          if (isOutlineStreamPayload(data)) {
            await handleOutlineStreamComplete(task, data, mode)
          }
          return
        }
        if (hasTaskResult(task)) return
        const o = (data && typeof data === "object" ? data : {}) as Record<string, unknown>
        if (isOutlineStreamPayload(o)) {
          await handleOutlineStreamComplete(task, data, mode)
          return
        }
        if (isNovelStreamPayload(o)) {
          await handleNovelStreamComplete(task, data, mode)
          return
        }
        if (isPptStreamPayload(o)) {
          await handlePptStreamComplete(task, data, mode)
          return
        }
        if (isBookCardStreamPayload(o)) {
          await handleCardStreamComplete(task, data, mode)
        }
      },
      onError: (msg: string) => {
        if (hasTaskResult(task)) return
        stopTaskTimer(task)
        applyStreamError(task, msg, mode)
        refreshCreditsBar()
      },
    },
  )
    streamCompleted = streamResult.completed
  } catch {
    if (!hasTaskResult(task) && !task.errorMsg) {
      appendLog(task, t("workspace.streamDisconnectedPolling"))
    }
  }

  if (!hasTaskResult(task) && !task.errorMsg && !streamCompleted) {
    await pollAndRecoverTaskResult(task, mode)
  }
}

const newProjectId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `proj-${Date.now()}-${Math.random().toString(16).slice(2)}`

const startTask = (task: GeneratorTask) => {
  task.errorMsg = null
  task.showCreditsCta = false
  task.pptData = null
  task.markdown = ""
  task.pptDataUrl = null
  task.cardResult = null
  task.novelResult = null
  task.outlineResult = null
  task.projectId = newProjectId()
  task.streamRequestId = null
  task.logs = []
  task.timerStartAt = Date.now()
  task.elapsedMs = null
  task.isGenerating = true
  timerNow.value = Date.now()
  ensureTimerTick()
  appendLog(task, t("workspace.generationLongRunningHint"))
  ElMessage.info({
    message: t("workspace.generationLongRunningToast"),
    duration: 8000,
    showClose: true,
  })
}

const handleGenerateError = (task: GeneratorTask, e: unknown, mode: "prompt" | "upload" = "prompt") => {
  if (isCreditsInsufficient(e)) {
    task.showCreditsCta = true
    task.errorMsg = t("workspace.creditsInsufficient")
    gtmGenerateFail(mode, "credits")
    refreshCreditsBar()
    return
  }
  const msg = e instanceof ApiError ? e.message : (e as Error)?.message || t("workspace.generateFailed")
  if (isInvalidQueueMessage(msg)) {
    task.errorMsg = t("workspace.invalidQueueError")
    gtmGenerateFail(mode, "other")
    return
  }
  task.errorMsg = msg
  gtmGenerateFail(mode, "other")
}

const onPromptSubmit = async () => {
  if (!input.value.trim() || promptTask.isGenerating) return
  startTask(promptTask)
  if (!(await ensureCreditsForTask(promptTask))) {
    stopTaskTimer(promptTask)
    promptTask.isGenerating = false
    gtmGenerateFail("prompt", "credits")
    return
  }
  gtmGenerateStart("prompt", promptTask.queue)
  try {
    await runStream(promptTask, input.value.trim(), undefined, undefined, "prompt")
  } catch (e: unknown) {
    handleGenerateError(promptTask, e, "prompt")
  } finally {
    stopTaskTimer(promptTask)
    promptTask.isGenerating = false
    await refreshCreditsBar()
  }
}

const onAnalyze = async () => {
  if (!hasAttachedDoc.value || ragTask.isGenerating) return
  const message = isNovelMode.value
    ? t("workspace.uploadPromptDefaultNovel")
    : uploadPrompt.value.trim()
  if (!message) return
  startTask(ragTask)
  if (!(await ensureCreditsForTask(ragTask))) {
    stopTaskTimer(ragTask)
    ragTask.isGenerating = false
    gtmGenerateFail("upload", "credits")
    return
  }
  const docSource = cloudDocument.value ? "cloud" : "local"
  gtmGenerateStart("upload", ragTask.queue, docSource)
  try {
    let doc: UploadedDocument
    if (cloudDocument.value) {
      doc = cloudDocument.value
      appendLog(ragTask, t("workspace.uploadDoneAnalyzing"))
    } else if (uploadedFile.value) {
      appendLog(ragTask, t("workspace.uploadingDoc"))
      doc = await fileApi.uploadDocument(uploadedFile.value)
      appendLog(ragTask, t("workspace.uploadDoneAnalyzing"))
    } else {
      return
    }
    await runStream(ragTask, message, [doc], docBaseName(doc.name || ""), "upload")
  } catch (e: unknown) {
    handleGenerateError(ragTask, e, "upload")
  } finally {
    stopTaskTimer(ragTask)
    ragTask.isGenerating = false
    await refreshCreditsBar()
  }
}

const YOUTUBE_DECK_DEFAULT_KEY = "workspace.youtubePromptDefault"
const YOUTUBE_NOVEL_DEFAULT_KEY = "workspace.youtubePromptDefaultNovel"

function applyDefaultYoutubePrompt() {
  const defaultKey =
    youtubeTask.queue === "NOVEL" ? YOUTUBE_NOVEL_DEFAULT_KEY : YOUTUBE_DECK_DEFAULT_KEY
  const currentValue = youtubePrompt.value.trim()
  if (!currentValue || currentValue === t(YOUTUBE_DECK_DEFAULT_KEY) || currentValue === t(YOUTUBE_NOVEL_DEFAULT_KEY)) {
    youtubePrompt.value = t(defaultKey)
  }
}

watch(activeTab, (tab) => {
  if (tab === "youtube") {
    if (youtubeTask.queue === "NOVEL") youtubeTask.queue = "OUTLINE"
    if (youtubeTask.queue !== "DOCUMENT" && youtubeTask.queue !== "OUTLINE") {
      youtubeTask.queue = "DOCUMENT"
    }
    applyDefaultYoutubePrompt()
  }
  if (tab === "prompt" && promptTask.queue === "NOVEL") {
    promptTask.queue = "CARD"
  }
  if (tab === "translate" && cloudDocument.value && isPdfDocument(cloudDocument.value)) {
    cloudPdfDocument.value = cloudDocument.value
    cloudPdfSize.value = cloudDocumentSize.value
  }
})

watch(
  () => youtubeTask.queue,
  () => {
    if (activeTab.value === "youtube") applyDefaultYoutubePrompt()
  },
)

const onPreviewYoutubeTranscript = async () => {
  if (!isYoutubeUrlValid.value || transcriptLoading.value || youtubeTask.isGenerating) return
  transcriptPreview.value = null
  transcriptLoading.value = true
  youtubeTask.errorMsg = null
  try {
    if (!(await resolveUserId())) {
      youtubeTask.errorMsg = t("workspace.loginRequiredGenerate")
      return
    }
    const projectId = youtubeTask.projectId || newProjectId()
    if (!youtubeTask.projectId) youtubeTask.projectId = projectId
    transcriptPreview.value = await agentApi.fetchYoutubeTranscript({
      youtube_url: youtubeUrl.value.trim(),
      project_id: projectId,
    })
  } catch (e: unknown) {
    youtubeTask.errorMsg = e instanceof ApiError ? e.message : (e as Error)?.message || t("workspace.generateFailed")
  } finally {
    transcriptLoading.value = false
  }
}

const onCancelYoutube = async () => {
  if (!youtubeTask.isGenerating) return
  youtubeAbort?.abort()
  const projectId = youtubeTask.projectId
  const streamRequestId = youtubeTask.streamRequestId
  if (projectId && streamRequestId) {
    try {
      await agentApi.cancelChatStream({
        project_id: projectId,
        stream_request_id: streamRequestId,
      })
    } catch {
      /* ignore cancel failures */
    }
  }
  stopTaskTimer(youtubeTask)
  youtubeTask.isGenerating = false
  appendLog(youtubeTask, t("workspace.youtubeCanceled"))
}

const onYoutubeSubmit = async () => {
  if (!isYoutubeUrlValid.value || (!isOutlineMode.value && !youtubePrompt.value.trim()) || youtubeTask.isGenerating) return
  startTask(youtubeTask)
  if (!(await ensureCreditsForTask(youtubeTask))) {
    stopTaskTimer(youtubeTask)
    youtubeTask.isGenerating = false
    gtmGenerateFail("upload", "credits")
    return
  }
  gtmGenerateStart("upload", youtubeTask.queue)
  try {
    if (isOutlineMode.value) {
      await runYoutubeOutlineStream(youtubeTask, youtubeUrl.value.trim())
    } else {
      await runYoutubeStream(youtubeTask, youtubeUrl.value.trim(), youtubePrompt.value.trim())
    }
  } catch (e: unknown) {
    if ((e as Error)?.name === "AbortError") return
    handleGenerateError(youtubeTask, e, "upload")
  } finally {
    stopTaskTimer(youtubeTask)
    youtubeTask.isGenerating = false
    youtubeAbort = null
    await refreshCreditsBar()
  }
}

function handleOutlineSection(
  task: GeneratorTask,
  data: unknown,
  youtubeUrlValue?: string,
) {
  const section = parseOutlineSection(data)
  if (!section) return
  const current = ensureOutlineResult(task.outlineResult, youtubeUrlValue)
  task.outlineResult = {
    ...current,
    sections: mergeOutlineSection(current.sections, section),
    sectionCount: section.total || current.sectionCount,
  }
  appendLog(task, section.heading || section.title)
}

const runYoutubeOutlineStream = async (task: GeneratorTask, youtubeUrlValue: string) => {
  const userId = await resolveUserId()
  if (!userId) {
    task.errorMsg = t("workspace.loginRequiredGenerate")
    task.isGenerating = false
    return
  }

  const streamRequestId = String(Date.now())
  task.streamRequestId = streamRequestId
  youtubeAbort?.abort()
  youtubeAbort = new AbortController()
  let outlineFinished = false

  const finishOutline = async (data: unknown) => {
    if (outlineFinished) return
    outlineFinished = true
    await handleOutlineStreamComplete(task, data, "upload")
  }

  let streamCompleted = false
  try {
    const streamResult = await agentApi.chatStream(
    {
      message: youtubeUrlValue,
      userId,
      projectId: task.projectId,
      sessionId: task.projectId,
      isAgent: true,
      queue: "OUTLINE",
      generation_mode: "outline",
      stream_request_id: streamRequestId,
    },
    {
      onStarted: () => {
        emit("project-started", task.projectId)
        refreshCreditsBar()
      },
      onProgress: (data: unknown) => {
        const line = toText(data)
        if (line) appendLog(task, line)
      },
      onBillingDeduct: () => {
        refreshCreditsBar()
      },
      onEvent: async (event, data) => {
        if (event === "agent_billing_deduct_event") {
          refreshCreditsBar()
          return
        }
        if (event === "outline_section") {
          handleOutlineSection(task, data, youtubeUrlValue)
          return
        }
        if (event === "outline_node") {
          task.outlineResult = applyOutlineNodePayload(
            task.outlineResult,
            data,
            youtubeUrlValue,
          )
          return
        }
        if (event === "outline_ping") return
        if (isOutlineCompleteEvent(event, data)) {
          await finishOutline(data)
        }
      },
      onComplete: async (data: unknown) => {
        if (isOutlineStreamPayload(data)) {
          await finishOutline(data)
        }
      },
      onError: (msg: string) => {
        if (hasTaskResult(task)) return
        stopTaskTimer(task)
        applyStreamError(task, msg, "upload")
        refreshCreditsBar()
      },
    },
    youtubeAbort.signal,
  )
    streamCompleted = streamResult.completed
  } catch {
    if (!hasTaskResult(task) && !task.errorMsg) {
      appendLog(task, t("workspace.streamDisconnectedPolling"))
    }
  }

  if (!hasTaskResult(task) && !task.errorMsg && !streamCompleted) {
    await pollAndRecoverTaskResult(task, "upload")
  }
}

onBeforeUnmount(() => {
  youtubeAbort?.abort()
  if (timerTickId != null) clearInterval(timerTickId)
})

const resetActiveTask = () => {
  activeTask.value.pptData = null
  activeTask.value.markdown = ""
  activeTask.value.pptDataUrl = null
  activeTask.value.cardResult = null
  activeTask.value.novelResult = null
  activeTask.value.outlineResult = null
  activeTask.value.projectId = ""
}

defineExpose({ attachCloudDocument })
</script>

<style scoped>
@keyframes ppt-indeterminate {
  0% { left: -40%; width: 40%; }
  50% { width: 55%; }
  100% { left: 100%; width: 40%; }
}
.ppt-indeterminate-bar {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 9999px;
  background: linear-gradient(90deg, transparent, #1d9bf0, #1d9bf0, transparent);
  animation: ppt-indeterminate 1.4s ease-in-out infinite;
}

.queue-mode-option {
  position: relative;
}

.queue-mode-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  z-index: 20;
  width: max-content;
  max-width: min(280px, 70vw);
  padding: 8px 12px;
  border: 1px solid rgba(138, 92, 246, 0.35);
  border-radius: 8px;
  background: rgba(18, 22, 32, 0.96);
  color: rgba(255, 255, 255, 0.95);
  font-size: 12px;
  line-height: 1.45;
  text-align: center;
  white-space: normal;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transform: translateX(-50%) translateY(4px);
  transition:
    opacity 0.15s ease,
    visibility 0.15s ease,
    transform 0.15s ease;
}

.queue-mode-tooltip::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: rgba(18, 22, 32, 0.96);
}

.queue-mode-option:hover .queue-mode-tooltip,
.queue-mode-option:focus-within .queue-mode-tooltip {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
}
</style>

<template>
  <section v-if="visibleSections.length" class="mt-10">
    <div
      v-for="section in visibleSections"
      :key="section.key"
      class="mb-6"
    >
      <h2 class="mb-3 text-base font-semibold text-foreground sm:text-lg">
        {{ sectionTitle(section) }}
      </h2>
      <div class="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 sm:gap-4">
        <button
          v-for="item in section.items"
          :key="itemKey(item)"
          type="button"
          class="group relative flex w-[140px] shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:border-primary/50 hover:shadow-lg sm:w-[168px]"
          @click="$emit('open', item)"
        >
          <div class="aspect-[3/4] w-full overflow-hidden bg-secondary/40">
            <img
              v-if="coverOf(item)"
              :src="coverOf(item)"
              :alt="titleOf(item)"
              loading="lazy"
              class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div
              v-else
              class="flex h-full w-full items-center justify-center px-2 text-center text-[11px] text-muted-foreground"
            >
              {{ t('workspace.noCover') }}
            </div>
          </div>
          <div class="flex flex-1 flex-col p-2 sm:p-2.5">
            <p class="line-clamp-2 text-xs font-medium text-foreground sm:text-sm">{{ titleOf(item) }}</p>
            <div class="mt-1.5 flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground sm:text-[11px]">
              <span v-if="item.authorNickname" class="min-w-0 max-w-full truncate">{{ item.authorNickname }}</span>
              <span class="flex items-center gap-0.5 sm:ml-auto">
                <Eye class="h-3 w-3" />{{ item.viewCount ?? 0 }}
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Eye } from 'lucide-vue-next'

defineOptions({ name: 'RelatedProjects' })

const props = defineProps({
  sections: { type: Array, default: () => [] },
  /** 当前项目 id，用于排除（理论上后端已排除，前端再保险） */
  currentProjectId: { type: String, default: '' },
})

defineEmits(['open'])

const { t } = useI18n()

const visibleSections = computed(() => {
  const cur = String(props.currentProjectId || '').trim()
  return (props.sections ?? [])
    .map((s) => ({
      ...s,
      items: (s.items ?? []).filter((it) => {
        const pid = String(it.projectId ?? '').trim()
        return !cur || pid !== cur
      }),
    }))
    .filter((s) => s.items.length > 0)
})

function coverOf(item) {
  return item.imageUrl || item.imageUrls?.[0] || ''
}

function titleOf(item) {
  return item.name || item.nameEn || item.sourceBookTitle || t('workspace.unnamed')
}

function itemKey(item) {
  return String(item.id || item.projectId || `${item.name}-${item.imageUrl || ''}`)
}

/** section 标题：优先后端 title，其次按 key 走 i18n */
function sectionTitle(section) {
  const title = String(section.title || '').trim()
  if (title) return title
  const key = String(section.key || '').trim()
  if (key === 'SAME_CATEGORY') return t('community.related.sameCategory')
  if (key === 'ALSO_READING') return t('community.related.alsoReading')
  return t('community.related.default')
}
</script>

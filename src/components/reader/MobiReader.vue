<template>
  <div class="mobi-reader">
    <div v-if="loading" class="mobi-reader__placeholder">{{ t('reader.loading') }}</div>
    <div v-else-if="loadError" class="mobi-reader__placeholder mobi-reader__placeholder--error">
      {{ loadError }}
    </div>
    <div v-show="!loading && !loadError" ref="containerRef" class="mobi-reader__container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import 'foliate-js/view.js'

const props = defineProps<{
  file: File
}>()

const { t } = useI18n()

const containerRef = ref<HTMLElement | null>(null)
const loading = ref(true)
const loadError = ref('')

let view: any = null

onMounted(async () => {
  try {
    await nextTick()
    view = document.createElement('foliate-view')
    containerRef.value?.appendChild(view)

    view.addEventListener('load', () => {
      view.renderer.next()
    })

    await view.open(props.file)
    loading.value = false
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e)
    loading.value = false
  }
})

onBeforeUnmount(() => {
  if (view && containerRef.value) {
    containerRef.value.removeChild(view)
    view = null
  }
})

function next() {
  view?.goRight()
}
function prev() {
  view?.goLeft()
}

defineExpose({ next, prev })
</script>

<style scoped>
.mobi-reader {
  display: flex;
  flex: 1;
  min-height: 0;
  background: #f3f4f6;
}
.mobi-reader__container {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.mobi-reader__container :deep(foliate-view) {
  display: block;
  width: 100%;
  height: 100%;
  border: none;
}
.mobi-reader__placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 14px;
}
.mobi-reader__placeholder--error {
  color: #dc2626;
}
</style>

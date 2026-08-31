<template>
  <div class="xlsx-reader">
    <div v-if="loading" class="xlsx-reader__overlay">{{ t('reader.loading') }}</div>
    <div v-else-if="loadError" class="xlsx-reader__overlay xlsx-reader__overlay--error">
      {{ loadError }}
    </div>
    <template v-else>
      <div class="xlsx-reader__zoom" :style="{ zoom: scale ?? 1 }">
        <div class="xlsx-reader__scroll">
          <table v-if="rows.length" class="xlsx-reader__table">
            <tbody>
              <tr v-for="(row, rowIndex) in rows" :key="rowIndex">
                <td v-for="(cell, colIndex) in row" :key="colIndex">{{ formatCell(cell) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="xlsx-reader__empty">{{ t('reader.xlsxEmptySheet') }}</p>
        </div>
      </div>

      <div v-if="sheetNames.length > 1" class="xlsx-reader__tabs">
        <button
          v-for="(name, index) in sheetNames"
          :key="name"
          type="button"
          class="xlsx-reader__tab"
          :class="{ 'xlsx-reader__tab--active': index === activeSheetIndex }"
          @click="selectSheet(index)"
        >
          {{ name }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import * as XLSX from 'xlsx'

const props = defineProps<{
  file: File
  scale?: number
}>()

const emit = defineEmits<{
  'page-change': [page: number]
  'page-count': [count: number]
}>()

const { t } = useI18n()

const loading = ref(true)
const loadError = ref('')
const sheetNames = ref<string[]>([])
const activeSheetIndex = ref(0)
const rows = ref<unknown[][]>([])

let workbook: XLSX.WorkBook | null = null

function formatCell(value: unknown) {
  if (value == null || value === '') return ''
  if (value instanceof Date) return value.toLocaleString()
  return String(value)
}

function loadSheet(index: number) {
  if (!workbook) return
  const name = sheetNames.value[index]
  if (!name) return
  const sheet = workbook.Sheets[name]
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })
  const maxCols = data.reduce((max, row) => Math.max(max, row.length), 0)
  rows.value = data.map((row) => {
    const normalized = [...row]
    while (normalized.length < maxCols) normalized.push('')
    return normalized
  })
  activeSheetIndex.value = index
  emit('page-change', index + 1)
}

function selectSheet(index: number) {
  if (index < 0 || index >= sheetNames.value.length) return
  loadSheet(index)
}

function next() {
  selectSheet(activeSheetIndex.value + 1)
}

function prev() {
  selectSheet(activeSheetIndex.value - 1)
}

function goToPage(page: number) {
  selectSheet(page - 1)
}

defineExpose({ next, prev, goToPage })

onMounted(async () => {
  try {
    const buffer = await props.file.arrayBuffer()
    workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
    sheetNames.value = workbook.SheetNames
    if (sheetNames.value.length === 0) {
      loadError.value = t('reader.xlsxNoSheets')
      loading.value = false
      return
    }
    emit('page-count', sheetNames.value.length)
    loadSheet(0)
    loading.value = false
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e)
    loading.value = false
  }
})
</script>

<style scoped>
.xlsx-reader {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  background: #f3f4f6;
}
.xlsx-reader__zoom {
  flex: 1;
  min-height: 0;
  display: flex;
  transform-origin: top center;
}
.xlsx-reader__scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 12px;
}
.xlsx-reader__table {
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  font-size: 13px;
  line-height: 1.4;
}
.xlsx-reader__table td {
  border: 1px solid #e5e7eb;
  padding: 6px 10px;
  vertical-align: top;
  white-space: pre-wrap;
  word-break: break-word;
  min-width: 72px;
  max-width: 320px;
  color: #111827;
}
.xlsx-reader__empty {
  padding: 24px;
  text-align: center;
  color: #6b7280;
  font-size: 14px;
}
.xlsx-reader__tabs {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  overflow-x: auto;
  background: #1f2937;
  border-top: 1px solid #111827;
  flex-shrink: 0;
}
.xlsx-reader__tab {
  flex-shrink: 0;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #374151;
  background: #111827;
  color: #d1d5db;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}
.xlsx-reader__tab:hover {
  background: #1f2937;
}
.xlsx-reader__tab--active {
  background: #374151;
  border-color: #6366f1;
  color: #fff;
}
.xlsx-reader__overlay {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 14px;
  background: #f3f4f6;
}
.xlsx-reader__overlay--error {
  color: #dc2626;
}
</style>

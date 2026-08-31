<template>
  <div class="xlsx-reader">
    <div v-if="loading" class="xlsx-reader__overlay">{{ t('reader.loading') }}</div>
    <div v-else-if="loadError" class="xlsx-reader__overlay xlsx-reader__overlay--error">
      {{ loadError }}
    </div>
    <template v-else>
      <div v-if="totalDataRows > 0" class="xlsx-reader__meta">
        {{ t('reader.xlsxRowCount', { shown: shownDataRows, total: totalDataRows }) }}
        <span v-if="hasMoreRows" class="xlsx-reader__meta-hint">{{ t('reader.xlsxScrollMore') }}</span>
      </div>

      <div class="xlsx-reader__zoom" :style="{ zoom: scale ?? 1 }">
        <div ref="scrollRef" class="xlsx-reader__scroll" @scroll="onScroll">
          <table v-if="headerRow.length" class="xlsx-reader__table">
            <thead>
              <tr>
                <th v-for="(cell, colIndex) in headerRow" :key="colIndex">{{ formatCell(cell) }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, rowIndex) in bodyRows" :key="rowIndex">
                <td
                  v-for="(cell, colIndex) in row"
                  :key="colIndex"
                  :class="{ 'xlsx-reader__cell--body': isBodyColumn(colIndex) }"
                  @mouseenter="onCellEnter($event, cell, colIndex)"
                  @mouseleave="hideCellPopover"
                >
                  <span
                    v-if="isBodyColumn(colIndex)"
                    class="xlsx-reader__cell-clamp"
                  >{{ formatCell(cell) }}</span>
                  <template v-else>{{ formatCell(cell) }}</template>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else class="xlsx-reader__empty">{{ t('reader.xlsxEmptySheet') }}</p>
          <p v-if="loadingMore" class="xlsx-reader__loading-more">{{ t('reader.xlsxLoadingMore') }}</p>
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

    <Teleport to="body">
      <div
        v-if="cellPopover.visible"
        class="xlsx-reader__popover"
        :style="{ top: `${cellPopover.y}px`, left: `${cellPopover.x}px` }"
        @mouseenter="keepCellPopover"
        @mouseleave="hideCellPopover"
      >
        {{ cellPopover.text }}
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

type XlsxModule = typeof import('xlsx')

const ROW_BATCH = 80
const DATE_HEADER_PATTERN = /^(date|日期|time|时间)$/i
const BODY_HEADER_PATTERN = /^(body|内容|正文|description|描述|summary|摘要)$/i

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
const loadingMore = ref(false)
const sheetNames = ref<string[]>([])
const activeSheetIndex = ref(0)
const scrollRef = ref<HTMLElement | null>(null)

const headerRow = ref<unknown[]>([])
const bodyColIndex = ref(-1)
const allBodyRows = ref<unknown[][]>([])
const visibleCount = ref(ROW_BATCH)
const cellPopover = ref({ visible: false, text: '', x: 0, y: 0 })

let popoverHideTimer: ReturnType<typeof setTimeout> | null = null

function clearPopoverHideTimer() {
  if (popoverHideTimer) {
    clearTimeout(popoverHideTimer)
    popoverHideTimer = null
  }
}

function scheduleHideCellPopover() {
  clearPopoverHideTimer()
  popoverHideTimer = setTimeout(() => {
    cellPopover.value.visible = false
  }, 120)
}

const totalDataRows = computed(() => allBodyRows.value.length)
const shownDataRows = computed(() => Math.min(visibleCount.value, totalDataRows.value))
const hasMoreRows = computed(() => shownDataRows.value < totalDataRows.value)
const bodyRows = computed(() => allBodyRows.value.slice(0, visibleCount.value))

let xlsxModule: XlsxModule | null = null
let workbook: import('xlsx').WorkBook | null = null

async function getXlsx() {
  if (!xlsxModule) xlsxModule = await import('xlsx')
  return xlsxModule
}

function formatCell(value: unknown) {
  if (value == null || value === '') return ''
  if (value instanceof Date) return value.toLocaleString()
  return String(value)
}

function findDateColumnIndex(header: unknown[]) {
  for (let i = 0; i < header.length; i++) {
    const label = String(header[i] ?? '').trim()
    if (DATE_HEADER_PATTERN.test(label)) return i
  }
  return -1
}

function findBodyColumnIndex(header: unknown[]) {
  for (let i = 0; i < header.length; i++) {
    const label = String(header[i] ?? '').trim()
    if (BODY_HEADER_PATTERN.test(label)) return i
  }
  return -1
}

function isBodyColumn(colIndex: number) {
  return colIndex === bodyColIndex.value
}

function onCellEnter(event: MouseEvent, cell: unknown, colIndex: number) {
  if (!isBodyColumn(colIndex)) return
  clearPopoverHideTimer()
  const text = formatCell(cell)
  if (!text) return
  const target = event.currentTarget as HTMLElement | null
  const clamp = target?.querySelector('.xlsx-reader__cell-clamp') as HTMLElement | null
  const truncated = clamp ? clamp.scrollWidth > clamp.clientWidth + 1 : text.length > 48
  if (!truncated) return
  const rect = (clamp ?? target)?.getBoundingClientRect()
  if (!rect) return
  const margin = 8
  const maxWidth = Math.min(420, window.innerWidth - margin * 2)
  let x = rect.left
  if (x + maxWidth > window.innerWidth - margin) {
    x = Math.max(margin, window.innerWidth - maxWidth - margin)
  }
  let y = rect.bottom + 6
  const estimatedHeight = Math.min(280, window.innerHeight * 0.5)
  if (y + estimatedHeight > window.innerHeight - margin) {
    y = Math.max(margin, rect.top - estimatedHeight - 6)
  }
  cellPopover.value = { visible: true, text, x, y }
}

function hideCellPopover() {
  scheduleHideCellPopover()
}

function keepCellPopover() {
  clearPopoverHideTimer()
}

function parseCellDate(value: unknown, XLSX: XlsxModule): number {
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF?.parse_date_code?.(value)
    if (parsed) {
      return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, parsed.S).getTime()
    }
    return value
  }
  if (typeof value === 'string' && value.trim()) {
    const ts = Date.parse(value)
    if (!Number.isNaN(ts)) return ts
  }
  return Number.NEGATIVE_INFINITY
}

function normalizeRows(data: unknown[][]) {
  const maxCols = data.reduce((max, row) => Math.max(max, row.length), 0)
  return data.map((row) => {
    const normalized = [...row]
    while (normalized.length < maxCols) normalized.push('')
    return normalized
  })
}

function sortBodyByDateDesc(body: unknown[][], dateColIndex: number, XLSX: XlsxModule) {
  if (dateColIndex < 0) return body
  return [...body].sort((a, b) => {
    const tb = parseCellDate(b[dateColIndex], XLSX)
    const ta = parseCellDate(a[dateColIndex], XLSX)
    return tb - ta
  })
}

function loadMoreRows() {
  if (!hasMoreRows.value || loadingMore.value) return
  loadingMore.value = true
  requestAnimationFrame(() => {
    visibleCount.value = Math.min(visibleCount.value + ROW_BATCH, totalDataRows.value)
    loadingMore.value = false
  })
}

function onScroll() {
  clearPopoverHideTimer()
  cellPopover.value.visible = false
  const el = scrollRef.value
  if (!el || !hasMoreRows.value) return
  const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 240
  if (nearBottom) loadMoreRows()
}

function loadSheet(index: number) {
  if (!workbook || !xlsxModule) return
  const XLSX = xlsxModule
  const name = sheetNames.value[index]
  if (!name) return
  const sheet = workbook.Sheets[name]
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })
  const normalized = normalizeRows(data)
  if (normalized.length === 0) {
    headerRow.value = []
    bodyColIndex.value = -1
    allBodyRows.value = []
    visibleCount.value = ROW_BATCH
    activeSheetIndex.value = index
    emit('page-change', index + 1)
    return
  }
  const [header, ...body] = normalized
  const dateColIndex = findDateColumnIndex(header)
  headerRow.value = header
  bodyColIndex.value = findBodyColumnIndex(header)
  allBodyRows.value = sortBodyByDateDesc(body, dateColIndex, XLSX)
  visibleCount.value = ROW_BATCH
  activeSheetIndex.value = index
  emit('page-change', index + 1)
  scrollRef.value?.scrollTo({ top: 0 })
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
    const XLSX = await getXlsx()
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
.xlsx-reader__meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 6px 12px;
  background: #1f2937;
  color: #d1d5db;
  font-size: 12px;
  border-bottom: 1px solid #111827;
  flex-shrink: 0;
}
.xlsx-reader__meta-hint {
  color: #9ca3af;
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
.xlsx-reader__cell--body {
  max-width: 180px;
  padding-top: 4px;
  padding-bottom: 4px;
  vertical-align: middle;
}
.xlsx-reader__cell-clamp {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: default;
}
.xlsx-reader__popover {
  position: fixed;
  z-index: 10000;
  max-width: min(420px, calc(100vw - 16px));
  max-height: min(280px, 50vh);
  overflow: auto;
  padding: 10px 12px;
  border-radius: 8px;
  background: #111827;
  color: #f9fafb;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
  pointer-events: auto;
}
.xlsx-reader__table th {
  position: sticky;
  top: 0;
  z-index: 1;
  border: 1px solid #e5e7eb;
  padding: 6px 10px;
  background: #f9fafb;
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
  color: #374151;
}
.xlsx-reader__loading-more {
  padding: 12px;
  text-align: center;
  color: #6b7280;
  font-size: 13px;
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

<template>
  <div class="xlsx-reader">
    <div v-if="loading" class="xlsx-reader__overlay">{{ t('reader.loading') }}</div>
    <div v-else-if="loadError" class="xlsx-reader__overlay xlsx-reader__overlay--error">
      {{ loadError }}
    </div>
    <template v-else>
      <div v-if="totalDataRows > 0 || editMode" class="xlsx-reader__meta">
        <span v-if="totalDataRows > 0">{{ t('reader.xlsxTotalRows', { total: totalDataRows }) }}</span>
        <span v-if="hasMoreRows" class="xlsx-reader__meta-hint">{{ t('reader.xlsxScrollMore') }}</span>
        <div class="xlsx-reader__meta-actions">
          <button
            type="button"
            class="xlsx-reader__meta-btn"
            :class="{ 'xlsx-reader__meta-btn--active': editMode }"
            @click="toggleEditMode"
          >{{ editMode ? '完成编辑' : '编辑' }}</button>
          <button
            v-if="editMode"
            type="button"
            class="xlsx-reader__meta-btn"
            @click="downloadXlsx"
          >下载</button>
        </div>
      </div>

      <div v-if="editMode" class="xlsx-reader__toolbar">
        <select
          class="xlsx-reader__tb-select"
          :value="sel.fontName || ''"
          :disabled="!selected"
          @change="sel.fontName = ($event.target as HTMLSelectElement).value; applyFormat()"
        >
          <option value="">默认字体</option>
          <option v-for="f in FONT_FAMILIES" :key="f" :value="f">{{ f }}</option>
        </select>
        <select
          class="xlsx-reader__tb-select xlsx-reader__tb-select--sm"
          :value="sel.fontSize || ''"
          :disabled="!selected"
          @change="sel.fontSize = Number(($event.target as HTMLSelectElement).value) || undefined; applyFormat()"
        >
          <option value="">字号</option>
          <option v-for="s in FONT_SIZES" :key="s" :value="s">{{ s }}</option>
        </select>
        <span class="xlsx-reader__tb-divider"></span>
        <button type="button" class="xlsx-reader__tb-btn" :class="{ 'is-active': sel.bold }" :disabled="!selected" @click="toggleBold" style="font-weight:700">B</button>
        <button type="button" class="xlsx-reader__tb-btn" :class="{ 'is-active': sel.italic }" :disabled="!selected" @click="toggleItalic" style="font-style:italic">I</button>
        <button type="button" class="xlsx-reader__tb-btn" :class="{ 'is-active': sel.underline }" :disabled="!selected" @click="toggleUnderline" style="text-decoration:underline">U</button>
        <button type="button" class="xlsx-reader__tb-btn" :class="{ 'is-active': sel.strike }" :disabled="!selected" @click="toggleStrike" style="text-decoration:line-through">S</button>
        <span class="xlsx-reader__tb-divider"></span>
        <label class="xlsx-reader__tb-color" :class="{ 'is-disabled': !selected }">
          <span class="xlsx-reader__tb-color-label">A</span>
          <input
            type="color"
            class="xlsx-reader__tb-color-input"
            :value="sel.fontColor || '#000000'"
            :disabled="!selected"
            @input="sel.fontColor = ($event.target as HTMLInputElement).value; applyFormat()"
          >
        </label>
        <label class="xlsx-reader__tb-color" :class="{ 'is-disabled': !selected }">
          <span class="xlsx-reader__tb-color-fill"></span>
          <input
            type="color"
            class="xlsx-reader__tb-color-input"
            :value="sel.fillColor || '#ffffff'"
            :disabled="!selected"
            @input="sel.fillColor = ($event.target as HTMLInputElement).value; applyFormat()"
          >
        </label>
        <span class="xlsx-reader__tb-divider"></span>
        <select
          class="xlsx-reader__tb-select xlsx-reader__tb-select--sm"
          :value="sel.hAlign || ''"
          :disabled="!selected"
          @change="sel.hAlign = ($event.target as HTMLSelectElement).value || undefined; applyFormat()"
        >
          <option value="">对齐</option>
          <option value="left">左对齐</option>
          <option value="center">居中</option>
          <option value="right">右对齐</option>
          <option value="justify">两端</option>
        </select>
        <button
          v-if="selected"
          type="button"
          class="xlsx-reader__tb-btn"
          @click="startEdit"
        >编辑文字</button>
      </div>

      <div class="xlsx-reader__zoom" :style="{ zoom: scale ?? 1 }">
        <div ref="scrollRef" class="xlsx-reader__scroll" @scroll="onScroll">
          <table v-if="headerRow.length" class="xlsx-reader__table">
            <thead>
              <tr>
                <th
                  v-for="(cell, colIndex) in headerRow"
                  :key="colIndex"
                  :class="[
                    editMode ? 'xlsx-reader__th-editable' : 'xlsx-reader__th-sortable',
                    {
                      'xlsx-reader__th-sortable--active': !editMode && sortColIndex === colIndex,
                      'xlsx-reader__th-sortable--asc': !editMode && sortColIndex === colIndex && sortOrder === 'asc',
                      'xlsx-reader__th-sortable--desc': !editMode && sortColIndex === colIndex && sortOrder === 'desc',
                      'xlsx-reader__cell--selected': editMode && isSelected(0, colIndex),
                    },
                  ]"
                  :style="cellStyle(cell)"
                  :title="editMode ? '' : headerSortTitle(colIndex)"
                  :data-r="0"
                  :data-c="colIndex"
                  @click="editMode ? selectCell(0, colIndex) : onHeaderSort(colIndex)"
                  @dblclick="editMode ? (selectCell(0, colIndex), startEdit()) : undefined"
                >
                  <span
                    v-if="editMode && isSelected(0, colIndex) && editing"
                    class="xlsx-reader__cell-edit"
                    contenteditable="true"
                    @keydown="onCellKeydown"
                    @blur="commitEdit"
                    v-text="formatCell(cell)"
                  ></span>
                  <template v-else>
                    <span class="xlsx-reader__th-label">
                      <template v-if="cell && cell.richText">
                        <span
                          v-for="(rt, i) in cell.richText"
                          :key="i"
                          :style="rt.style"
                        >{{ rt.text }}</span>
                      </template>
                      <template v-else>{{ formatCell(cell) }}</template>
                    </span>
                    <span v-if="!editMode" class="xlsx-reader__th-sort-icon" aria-hidden="true">{{ headerSortIcon(colIndex) }}</span>
                  </template>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, rowIndex) in bodyRows" :key="rowIndex">
                <td
                  v-for="(cell, colIndex) in row"
                  :key="colIndex"
                  :class="{
                    'xlsx-reader__cell--body': isBodyColumn(colIndex),
                    'xlsx-reader__cell--selected': editMode && isSelected(rowIndex + 1, colIndex),
                    'xlsx-reader__cell--editable': editMode,
                  }"
                  :style="cellStyle(cell)"
                  :data-r="rowIndex + 1"
                  :data-c="colIndex"
                  @click="editMode ? selectCell(rowIndex + 1, colIndex) : undefined"
                  @dblclick="editMode ? (selectCell(rowIndex + 1, colIndex), startEdit()) : undefined"
                  @mouseenter="!editMode ? onCellEnter($event, cell, colIndex) : undefined"
                  @mouseleave="!editMode ? hideCellPopover : undefined"
                >
                  <span
                    v-if="editMode && isSelected(rowIndex + 1, colIndex) && editing"
                    class="xlsx-reader__cell-edit"
                    contenteditable="true"
                    @keydown="onCellKeydown"
                    @blur="commitEdit"
                    v-text="formatCell(cell)"
                  ></span>
                  <template v-else-if="cell && cell.richText">
                    <span
                      v-for="(rt, i) in cell.richText"
                      :key="i"
                      :style="rt.style"
                    >{{ rt.text }}</span>
                  </template>
                  <span
                    v-else-if="isBodyColumn(colIndex)"
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
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import ExcelJS from 'exceljs'

type RichRun = { text: string; style: Record<string, string> }
type CellFormat = {
  fontName?: string
  fontSize?: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  fontColor?: string
  fillColor?: string
  hAlign?: string
  vAlign?: string
}
type StyledCell = {
  value: unknown
  text: string
  style: Record<string, string>
  format: CellFormat
  richText?: RichRun[]
}

const ROW_BATCH = 80
const DATE_HEADER_PATTERN = /^(date|日期|time|时间)$/i
const BODY_HEADER_PATTERN = /^(body|内容|正文|description|描述|summary|摘要)$/i
type SortOrder = 'asc' | 'desc'

const props = defineProps<{ file: File; scale?: number }>()
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
const headerRow = ref<StyledCell[]>([])
const bodyColIndex = ref(-1)
const dateColIndex = ref(-1)
const sortColIndex = ref(-1)
const sortOrder = ref<SortOrder>('desc')
const rawBodyRows = ref<StyledCell[][]>([])
const allBodyRows = ref<StyledCell[][]>([])
const visibleCount = ref(ROW_BATCH)
const cellPopover = ref({ visible: false, text: '', x: 0, y: 0 })

let popoverHideTimer: ReturnType<typeof setTimeout> | null = null
let workbook: ExcelJS.Workbook | null = null
let worksheets: ExcelJS.Worksheet[] = []

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
const hasMoreRows = computed(() => visibleCount.value < totalDataRows.value)
const bodyRows = computed(() => allBodyRows.value.slice(0, visibleCount.value))

// ---- color / style helpers ----
const THEME_COLORS = [
  '#FFFFFF', '#000000', '#E7E6E6', '#44546A', '#4472C4', '#ED7D31',
  '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47', '#0563C1', '#954F72',
]
const INDEXED_COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#800000', '#008000', '#000080', '#808000', '#800080', '#008080', '#C0C0C0', '#808080',
  '#9999FF', '#993366', '#FFFFCC', '#CCFFFF', '#660066', '#FF8080', '#0066CC', '#CCCCFF',
]

function applyTint(hex: string, tint?: number): string {
  if (tint == null || tint === 0) return hex
  const h = hex.replace('#', '')
  if (h.length !== 6) return hex
  let r = parseInt(h.slice(0, 2), 16)
  let g = parseInt(h.slice(2, 4), 16)
  let b = parseInt(h.slice(4, 6), 16)
  const apply = (c: number) =>
    tint < 0 ? Math.round(c * (1 + tint)) : Math.round(c * (1 - tint) + 255 * tint)
  r = apply(r); g = apply(g); b = apply(b)
  const toHex = (c: number) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')
  return '#' + toHex(r) + toHex(g) + toHex(b)
}

type ColorLike = { argb?: string; theme?: number; indexed?: number; tint?: number }
function colorToCss(color?: ColorLike): string | undefined {
  if (!color) return undefined
  if (color.argb) {
    const a = color.argb
    return '#' + (a.length === 8 ? a.slice(2) : a)
  }
  if (color.theme != null && color.theme >= 0 && color.theme < THEME_COLORS.length) {
    return applyTint(THEME_COLORS[color.theme], color.tint)
  }
  if (color.indexed != null && color.indexed >= 0 && color.indexed < INDEXED_COLORS.length) {
    return INDEXED_COLORS[color.indexed]
  }
  return undefined
}

const BORDER_STYLE_MAP: Record<string, string> = {
  thin: '1px solid', medium: '2px solid', thick: '3px solid', dotted: '1px dotted',
  dashed: '1px dashed', double: '3px double', hair: '1px solid', mediumDashed: '2px dashed',
  mediumDashDot: '2px solid', mediumDashDotDot: '2px solid', slantDashDot: '2px solid',
}
function borderCss(b?: { style?: string; color?: ColorLike }): string | undefined {
  if (!b || !b.style) return undefined
  const ws = BORDER_STYLE_MAP[b.style]
  if (!ws) return undefined
  return `${ws} ${colorToCss(b.color) || '#000000'}`
}

function fontToCss(font?: Partial<ExcelJS.Font>): Record<string, string> {
  const css: Record<string, string> = {}
  if (!font) return css
  if (font.bold) css['font-weight'] = '700'
  if (font.italic) css['font-style'] = 'italic'
  if (font.size) css['font-size'] = `${font.size}px`
  if (font.name) css['font-family'] = `"${font.name}", sans-serif`
  const deco: string[] = []
  if (font.underline) deco.push('underline')
  if (font.strike) deco.push('line-through')
  if (deco.length) css['text-decoration'] = deco.join(' ')
  const color = colorToCss(font.color as ColorLike)
  if (color) css['color'] = color
  return css
}

function cellStyle(cell?: StyledCell | null): Record<string, string> {
  return cell?.style ?? {}
}

// ---- value / text helpers ----
function richTextRuns(value: unknown): RichRun[] | undefined {
  if (value && typeof value === 'object' && 'richText' in value) {
    const rt = (value as { richText: { text: string; font?: Partial<ExcelJS.Font> }[] }).richText
    return rt.map((r) => ({ text: r.text, style: fontToCss(r.font) }))
  }
  return undefined
}

function rawValue(value: unknown): unknown {
  if (value == null) return ''
  if (value instanceof Date) return value
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>
    if (Array.isArray(v.richText)) return v.richText.map((r: { text: string }) => r.text).join('')
    if ('result' in v && v.result != null) return v.result
    if ('formula' in v) return (v.result as unknown) ?? ''
    if ('text' in v) return v.text
    if ('error' in v) return v.error
  }
  return value
}

function displayText(cell: ExcelJS.Cell, raw: unknown): string {
  if (raw == null || raw === '') return ''
  if (raw instanceof Date) return raw.toLocaleString()
  const text = (cell as unknown as { text?: string }).text
  if (typeof text === 'string' && text !== '') return text
  return String(raw)
}

function makeStyledCell(cell: ExcelJS.Cell): StyledCell {
  const value = cell.value
  const richText = richTextRuns(value)
  const raw = rawValue(value)
  const text = displayText(cell, raw)
  const style: Record<string, string> = {}
  Object.assign(style, fontToCss(cell.font))

  const format: CellFormat = {}
  const font = cell.font
  if (font) {
    if (font.name) format.fontName = font.name
    if (font.size) format.fontSize = font.size
    if (font.bold) format.bold = true
    if (font.italic) format.italic = true
    if (font.underline) format.underline = true
    if (font.strike) format.strike = true
    const fc = colorToCss(font.color as ColorLike)
    if (fc) format.fontColor = fc
  }

  const fill = cell.fill
  if (fill && fill.type === 'pattern' && fill.pattern && fill.pattern !== 'none') {
    const fg = colorToCss(fill.fgColor as ColorLike)
    const bg = colorToCss(fill.bgColor as ColorLike)
    const fillcolor = fg ?? bg
    if (fillcolor) {
      style['background-color'] = fillcolor
      format.fillColor = fillcolor
    }
  }

  const align = cell.alignment
  if (align) {
    if (align.horizontal) {
      style['text-align'] = align.horizontal
      format.hAlign = align.horizontal
    }
    if (align.vertical) {
      style['vertical-align'] = align.vertical
      format.vAlign = align.vertical
    }
    style['white-space'] = 'pre-wrap'
  }

  const border = cell.border
  if (border) {
    const top = borderCss(border.top as { style?: string; color?: ColorLike })
    const bottom = borderCss(border.bottom as { style?: string; color?: ColorLike })
    const left = borderCss(border.left as { style?: string; color?: ColorLike })
    const right = borderCss(border.right as { style?: string; color?: ColorLike })
    if (top) style['border-top'] = top
    if (bottom) style['border-bottom'] = bottom
    if (left) style['border-left'] = left
    if (right) style['border-right'] = right
  }
  return { value: raw, text, style, format, richText }
}

function formatCell(cell?: StyledCell | null): string {
  return cell?.text ?? ''
}

function emptyCell(): StyledCell {
  return { value: '', text: '', style: {}, format: {} }
}

// ---- column detection / sorting ----
function findDateColumnIndex(header: StyledCell[]) {
  for (let i = 0; i < header.length; i++) {
    if (DATE_HEADER_PATTERN.test((header[i]?.text ?? '').trim())) return i
  }
  return -1
}
function findBodyColumnIndex(header: StyledCell[]) {
  for (let i = 0; i < header.length; i++) {
    if (BODY_HEADER_PATTERN.test((header[i]?.text ?? '').trim())) return i
  }
  return -1
}
function isBodyColumn(colIndex: number) {
  return colIndex === bodyColIndex.value
}

function onCellEnter(event: MouseEvent, cell: StyledCell | null, colIndex: number) {
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
function hideCellPopover() { scheduleHideCellPopover() }
function keepCellPopover() { clearPopoverHideTimer() }

function parseCellDate(value: unknown): number {
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const ts = Date.parse(value)
    if (!Number.isNaN(ts)) return ts
  }
  return Number.NEGATIVE_INFINITY
}

function normalizeRows(data: StyledCell[][]) {
  const maxCols = data.reduce((max, row) => Math.max(max, row.length), 0)
  return data.map((row) => {
    const normalized = [...row]
    while (normalized.length < maxCols) normalized.push(emptyCell())
    return normalized
  })
}

function isDateColumn(colIndex: number) {
  return colIndex === dateColIndex.value
}

function getSortValue(value: unknown, colIndex: number): number | string {
  if (isDateColumn(colIndex)) return parseCellDate(value)
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return ''
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed)
    return trimmed.toLocaleLowerCase()
  }
  if (value == null || value === '') return ''
  return String(value).toLocaleLowerCase()
}

function compareRows(a: StyledCell[], b: StyledCell[], colIndex: number) {
  const va = getSortValue(a[colIndex]?.value, colIndex)
  const vb = getSortValue(b[colIndex]?.value, colIndex)
  if (typeof va === 'number' && typeof vb === 'number') {
    if (va === vb) return 0
    return va < vb ? -1 : 1
  }
  return String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' })
}

function sortBodyByColumn(body: StyledCell[][], colIndex: number, order: SortOrder) {
  if (colIndex < 0) return body
  return [...body].sort((a, b) => {
    const cmp = compareRows(a, b, colIndex)
    return order === 'asc' ? cmp : -cmp
  })
}

function applySort() {
  if (!editMode.value && sortColIndex.value >= 0) {
    allBodyRows.value = sortBodyByColumn(
      rawBodyRows.value,
      sortColIndex.value,
      sortOrder.value,
    )
  } else {
    allBodyRows.value = rawBodyRows.value
  }
}

function defaultSortForColumn(colIndex: number): SortOrder {
  return isDateColumn(colIndex) ? 'desc' : 'asc'
}

function onHeaderSort(colIndex: number) {
  if (sortColIndex.value === colIndex) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColIndex.value = colIndex
    sortOrder.value = defaultSortForColumn(colIndex)
  }
  applySort()
  visibleCount.value = ROW_BATCH
  scrollRef.value?.scrollTo({ top: 0 })
}

function headerSortIcon(colIndex: number) {
  if (sortColIndex.value !== colIndex) return '↕'
  return sortOrder.value === 'asc' ? '↑' : '↓'
}

function headerSortTitle(colIndex: number) {
  if (sortColIndex.value !== colIndex) return t('reader.xlsxSortClick')
  return sortOrder.value === 'asc' ? t('reader.xlsxSortAsc') : t('reader.xlsxSortDesc')
}

function resetSortState(header: StyledCell[]) {
  dateColIndex.value = findDateColumnIndex(header)
  const defaultCol = dateColIndex.value >= 0 ? dateColIndex.value : -1
  sortColIndex.value = defaultCol
  sortOrder.value = defaultCol >= 0 ? defaultSortForColumn(defaultCol) : 'asc'
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

function buildGrid(sheet: ExcelJS.Worksheet): StyledCell[][] {
  const rowCount = sheet.rowCount
  const colCount = sheet.columnCount
  const grid: StyledCell[][] = []
  for (let r = 1; r <= rowCount; r++) {
    const row = sheet.getRow(r)
    const cells: StyledCell[] = []
    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c)
      cells[c - 1] = makeStyledCell(cell)
    }
    grid.push(cells)
  }
  return grid
}

function loadSheet(index: number) {
  if (!workbook) return
  const sheet = worksheets[index]
  if (!sheet) return
  selected.value = null
  editing.value = false
  const grid = buildGrid(sheet)
  const normalized = normalizeRows(grid)
  if (normalized.length === 0) {
    headerRow.value = []
    bodyColIndex.value = -1
    dateColIndex.value = -1
    sortColIndex.value = -1
    rawBodyRows.value = []
    allBodyRows.value = []
    visibleCount.value = ROW_BATCH
    activeSheetIndex.value = index
    emit('page-change', index + 1)
    return
  }
  const [header, ...body] = normalized
  headerRow.value = header
  bodyColIndex.value = findBodyColumnIndex(header)
  resetSortState(header)
  rawBodyRows.value = body
  applySort()
  visibleCount.value = ROW_BATCH
  activeSheetIndex.value = index
  emit('page-change', index + 1)
  scrollRef.value?.scrollTo({ top: 0 })
}

function selectSheet(index: number) {
  if (index < 0 || index >= sheetNames.value.length) return
  loadSheet(index)
}

function next() { selectSheet(activeSheetIndex.value + 1) }
function prev() { selectSheet(activeSheetIndex.value - 1) }
function goToPage(page: number) { selectSheet(page - 1) }

// ---- editing ----
const editMode = ref(false)
const selected = ref<{ row: number; col: number } | null>(null)
const editing = ref(false)
const sel = ref<CellFormat>({})
const FONT_FAMILIES = [
  'Calibri', 'Arial', 'Times New Roman', 'Microsoft YaHei', 'SimSun',
  'SimHei', 'KaiTi', 'FangSong', 'Verdana', 'Courier New', 'Georgia',
]
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72]

function toggleEditMode() {
  editMode.value = !editMode.value
  if (!editMode.value) {
    selected.value = null
    editing.value = false
  } else {
    applySort()
  }
}

function getGridRow(row: number): StyledCell[] | null {
  if (row === 0) return headerRow.value
  const body = allBodyRows.value[row - 1]
  return body ?? null
}

function getExcelCell(gridRow: number, gridCol: number): ExcelJS.Cell | null {
  const sheet = worksheets[activeSheetIndex.value]
  if (!sheet) return null
  return sheet.getCell(gridRow + 1, gridCol + 1)
}

function selectCell(row: number, col: number) {
  if (!editMode.value) return
  editing.value = false
  selected.value = { row, col }
  const gridRow = getGridRow(row)
  const cell = gridRow?.[col]
  sel.value = { ...(cell?.format ?? {}) }
}

function isSelected(row: number, col: number) {
  return selected.value?.row === row && selected.value?.col === col
}

function startEdit() {
  if (!selected.value) return
  editing.value = true
}

function commitEdit() {
  if (!selected.value || !editing.value) return
  const { row, col } = selected.value
  const gridRow = getGridRow(row)
  if (!gridRow) { editing.value = false; return }
  const cell = gridRow[col]
  if (!cell) { editing.value = false; return }
  const el = scrollRef.value?.querySelector(`[data-r="${row}"][data-c="${col}"] .xlsx-reader__cell-edit`) as HTMLElement | null
  const newText = el?.innerText ?? ''
  cell.text = newText
  cell.value = newText
  cell.richText = undefined
  const ex = getExcelCell(row, col)
  if (ex) ex.value = newText
  editing.value = false
}

function cancelEdit() {
  editing.value = false
}

watch(editing, (val) => {
  if (!val || !selected.value) return
  nextTick(() => {
    const { row, col } = selected.value!
    const el = scrollRef.value?.querySelector(`[data-r="${row}"][data-c="${col}"] .xlsx-reader__cell-edit`) as HTMLElement | null
    if (el) {
      el.focus()
      const range = document.createRange()
      range.selectNodeContents(el)
      const selObj = window.getSelection()
      selObj?.removeAllRanges()
      selObj?.addRange(range)
    }
  })
})

function onCellKeydown(e: KeyboardEvent) {
  if (!editing.value) return
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit() }
  else if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
}

function cssToArgb(css?: string): string | undefined {
  if (!css) return undefined
  const h = css.replace('#', '')
  if (h.length === 6) return 'FF' + h
  if (h.length === 8) return h
  return undefined
}

function applyFormat() {
  if (!selected.value) return
  const { row, col } = selected.value
  const gridRow = getGridRow(row)
  const cell = gridRow?.[col]
  if (!cell) return
  cell.format = { ...sel.value }
  const s: Record<string, string> = {}
  const f = cell.format
  if (f.bold) s['font-weight'] = '700'
  if (f.italic) s['font-style'] = 'italic'
  if (f.fontSize) s['font-size'] = `${f.fontSize}px`
  if (f.fontName) s['font-family'] = `"${f.fontName}", sans-serif`
  const deco: string[] = []
  if (f.underline) deco.push('underline')
  if (f.strike) deco.push('line-through')
  if (deco.length) s['text-decoration'] = deco.join(' ')
  if (f.fontColor) s['color'] = f.fontColor
  if (f.fillColor) s['background-color'] = f.fillColor
  if (f.hAlign) s['text-align'] = f.hAlign
  if (f.vAlign) s['vertical-align'] = f.vAlign
  s['white-space'] = 'pre-wrap'
  // preserve borders
  if (cell.style['border-top']) s['border-top'] = cell.style['border-top']
  if (cell.style['border-bottom']) s['border-bottom'] = cell.style['border-bottom']
  if (cell.style['border-left']) s['border-left'] = cell.style['border-left']
  if (cell.style['border-right']) s['border-right'] = cell.style['border-right']
  cell.style = s
  // write to exceljs
  const ex = getExcelCell(row, col)
  if (ex) {
    ex.font = {
      ...(f.fontName ? { name: f.fontName } : {}),
      ...(f.fontSize ? { size: f.fontSize } : {}),
      bold: !!f.bold,
      italic: !!f.italic,
      underline: !!f.underline,
      strike: !!f.strike,
      ...(f.fontColor ? { color: { argb: cssToArgb(f.fontColor) } } : {}),
    }
    if (f.fillColor) {
      ex.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cssToArgb(f.fillColor) } }
    }
    ex.alignment = {
      ...(f.hAlign ? { horizontal: f.hAlign } : {}),
      ...(f.vAlign ? { vertical: f.vAlign } : {}),
      wrapText: true,
    }
  }
}

function toggleBold() { sel.value.bold = !sel.value.bold; applyFormat() }
function toggleItalic() { sel.value.italic = !sel.value.italic; applyFormat() }
function toggleUnderline() { sel.value.underline = !sel.value.underline; applyFormat() }
function toggleStrike() { sel.value.strike = !sel.value.strike; applyFormat() }

async function downloadXlsx() {
  if (!workbook) return
  try {
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const base = props.file.name.replace(/\.xlsx$/i, '')
    a.download = `${base}-edited.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e)
  }
}

defineExpose({ next, prev, goToPage })

onMounted(async () => {
  try {
    const buffer = await props.file.arrayBuffer()
    workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    worksheets = workbook.worksheets
    sheetNames.value = worksheets.map((w) => w.name)
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
  border-spacing: 0;
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
.xlsx-reader__th-sortable {
  cursor: pointer;
  user-select: none;
  transition: box-shadow 0.15s;
}
.xlsx-reader__th-sortable:hover {
  box-shadow: inset 0 0 0 2px #c7d2fe;
}
.xlsx-reader__th-sortable--active {
  box-shadow: inset 0 0 0 2px #6366f1;
}
.xlsx-reader__th-label {
  margin-right: 4px;
}
.xlsx-reader__th-sort-icon {
  display: inline-block;
  min-width: 12px;
  font-size: 11px;
  color: #9ca3af;
  vertical-align: middle;
}
.xlsx-reader__th-sortable--active .xlsx-reader__th-sort-icon {
  color: #6366f1;
}
.xlsx-reader__th-sortable--asc .xlsx-reader__th-sort-icon,
.xlsx-reader__th-sortable--desc .xlsx-reader__th-sort-icon {
  color: #4338ca;
  font-weight: 700;
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
/* meta actions */
.xlsx-reader__meta-actions {
  margin-left: auto;
  display: flex;
  gap: 6px;
}
.xlsx-reader__meta-btn {
  padding: 3px 10px;
  border-radius: 6px;
  border: 1px solid #374151;
  background: #111827;
  color: #d1d5db;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.xlsx-reader__meta-btn:hover {
  background: #1f2937;
}
.xlsx-reader__meta-btn--active {
  background: #4338ca;
  border-color: #6366f1;
  color: #fff;
}
/* toolbar */
.xlsx-reader__toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px 12px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}
.xlsx-reader__tb-select {
  padding: 4px 6px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #fff;
  font-size: 12px;
  color: #111827;
  cursor: pointer;
  max-width: 140px;
}
.xlsx-reader__tb-select--sm {
  max-width: 80px;
}
.xlsx-reader__tb-select:disabled {
  background: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
}
.xlsx-reader__tb-btn {
  min-width: 28px;
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #fff;
  color: #111827;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
}
.xlsx-reader__tb-btn:hover:not(:disabled) {
  background: #f3f4f6;
}
.xlsx-reader__tb-btn:disabled {
  color: #9ca3af;
  cursor: not-allowed;
}
.xlsx-reader__tb-btn.is-active {
  background: #eef2ff;
  border-color: #6366f1;
  color: #4338ca;
}
.xlsx-reader__tb-divider {
  display: inline-block;
  width: 1px;
  height: 22px;
  background: #e5e7eb;
  margin: 0 4px;
}
.xlsx-reader__tb-color {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  overflow: hidden;
}
.xlsx-reader__tb-color.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.xlsx-reader__tb-color-label {
  font-weight: 700;
  font-size: 14px;
  color: #111827;
  pointer-events: none;
}
.xlsx-reader__tb-color-fill {
  width: 14px;
  height: 14px;
  border: 1px solid #9ca3af;
  background: #fff;
  pointer-events: none;
}
.xlsx-reader__tb-color-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}
.xlsx-reader__tb-color-input:disabled {
  cursor: not-allowed;
}
/* editable cells */
.xlsx-reader__cell--editable {
  cursor: cell;
}
.xlsx-reader__cell--selected {
  outline: 2px solid #4338ca;
  outline-offset: -2px;
}
.xlsx-reader__th-editable {
  cursor: cell;
  user-select: none;
}
.xlsx-reader__cell-edit {
  display: block;
  outline: none;
  min-height: 1.2em;
  min-width: 40px;
  white-space: pre-wrap;
  word-break: break-word;
}
.xlsx-reader__cell-edit:focus {
  box-shadow: inset 0 0 0 2px #c7d2fe;
}
</style>

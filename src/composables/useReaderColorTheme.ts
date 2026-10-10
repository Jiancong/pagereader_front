// 阅读器日间 / 夜间配色（本地持久化）
// @author hc

import { ref, computed, watch } from "vue"

export type ReaderColorTheme = "light" | "dark"

const STORAGE_KEY = "page2top.reader.colorTheme"

function readStored(): ReaderColorTheme {
  if (typeof localStorage === "undefined") return "light"
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === "dark" ? "dark" : "light"
  } catch {
    return "light"
  }
}

export function useReaderColorTheme() {
  const theme = ref<ReaderColorTheme>(readStored())

  watch(
    theme,
    (v) => {
      try {
        localStorage.setItem(STORAGE_KEY, v)
      } catch {
        /* ignore */
      }
    },
    { immediate: false },
  )

  const isDark = computed(() => theme.value === "dark")

  function toggleTheme() {
    theme.value = theme.value === "dark" ? "light" : "dark"
  }

  return { theme, isDark, toggleTheme }
}

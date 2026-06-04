/** 从鼠标事件解析 PPT / 关联搜索面板中的选中文本（优先选区，否则取光标处单词） */
export function resolveContextSelectionText(event: MouseEvent): string {
  const selected = window.getSelection()?.toString().trim() ?? "";
  if (selected) return selected.slice(0, 200);
  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const range = doc.caretRangeFromPoint?.(event.clientX, event.clientY);
  if (range) {
    try {
      range.expand("word");
      const word = range.toString().trim();
      if (word) return word.slice(0, 200);
    } catch {
      /* ignore */
    }
  }
  return "";
}

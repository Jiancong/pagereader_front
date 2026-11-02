const MAX_SELECTION_LEN = 500;

/** 从指定 document 解析选中文本（优先选区，否则取光标处单词） */
export function resolveDocumentSelectionText(doc: Document, event: MouseEvent): string {
  const selected = doc.getSelection()?.toString().trim() ?? "";
  if (selected) return selected.slice(0, MAX_SELECTION_LEN);
  const docWithCaret = doc as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const range = docWithCaret.caretRangeFromPoint?.(event.clientX, event.clientY);
  if (range) {
    try {
      range.expand("word");
      const word = range.toString().trim();
      if (word) return word.slice(0, MAX_SELECTION_LEN);
    } catch {
      /* ignore */
    }
  }
  return "";
}

/** 从鼠标事件解析 PPT / 关联搜索面板中的选中文本（优先选区，否则取光标处单词） */
export function resolveContextSelectionText(event: MouseEvent): string {
  return resolveDocumentSelectionText(document, event);
}

/** iframe 内右键坐标转换到顶层 window，供 fixed 菜单定位 */
export function mapIframeClientPointToViewport(doc: Document, event: MouseEvent) {
  const frame = doc.defaultView?.frameElement as HTMLElement | null | undefined;
  const rect = frame?.getBoundingClientRect();
  return {
    clientX: (rect?.left ?? 0) + event.clientX,
    clientY: (rect?.top ?? 0) + event.clientY,
  };
}

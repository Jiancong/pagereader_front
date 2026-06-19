import { watch } from "vue";
import { ElMessage } from "element-plus";
import type {
  CustomChineseFontCatalogEntry,
  CustomChineseFontFile,
} from "@/composables/useCustomChineseFontsCatalog";
import { forgetInjectedFileCustomFont } from "@/composables/useFontLoader";
import { setUserUploadedFontCatalog } from "@/utils/runtimeCustomFontRegistry";

const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPT_EXT = new Set([".otf", ".ttf", ".ttc", ".woff", ".woff2"]);

function guessFormat(fileName: string): CustomChineseFontFile["format"] {
  const l = fileName.toLowerCase();
  if (l.endsWith(".woff2")) return "woff2";
  if (l.endsWith(".woff")) return "woff";
  if (l.endsWith(".otf")) return "opentype";
  return "truetype";
}

function makeUniqueValue(baseLabel: string): string {
  const slug = baseLabel
    .replace(/["'`\\]/g, "")
    .replace(/[^\w\u4e00-\u9fff-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36) || "font";
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 10)
      : Math.random().toString(36).slice(2, 12);
  return `UserFont-${slug}-${id}`;
}

function fileToEntry(file: File): CustomChineseFontCatalogEntry | null {
  const ext = ("." + (file.name.split(".").pop() || "")).toLowerCase();
  if (!ACCEPT_EXT.has(ext)) return null;
  if (file.size > MAX_BYTES) return null;
  const blobUrl = URL.createObjectURL(file);
  const baseName = file.name.replace(/\.[^.]+$/i, "") || "上传字体";
  const value = makeUniqueValue(baseName);
  return {
    label: baseName,
    value,
    category: "uploaded",
    preview: baseName,
    sourceType: "file",
    files: [
      {
        url: blobUrl,
        format: guessFormat(file.name),
        weight: 400,
        style: "normal",
      },
    ],
    license: "用户本地上传，商用授权请自行确认",
  };
}

/**
 * 编辑器内用户上传的字体（当前标签页有效，刷新后需重新上传）。
 * 与 useState 同步并写入 runtime registry，供 loadFont / 画布使用。
 */
export function useUserUploadedFonts() {
  const list = useState<CustomChineseFontCatalogEntry[]>(
    "user-uploaded-fonts",
    () => []
  );

  watch(
    list,
    (v) => setUserUploadedFontCatalog(Array.isArray(v) ? v : []),
    { deep: true, immediate: true }
  );

  /**
   * @returns 成功添加的数量与最后一项 value（便于自动选中）
   */
  function addFontFiles(
    files: FileList | File[] | null
  ): { added: number; lastValue?: string } {
    if (!files?.length) return { added: 0 };
    const arr = Array.from(files);
    const skipped: string[] = [];
    const newEntries: CustomChineseFontCatalogEntry[] = [];

    for (const file of arr) {
      const ent = fileToEntry(file);
      if (!ent) {
        skipped.push(file.name);
        continue;
      }
      newEntries.push(ent);
    }

    if (skipped.length) {
      const sample = skipped.slice(0, 3).join("、");
      ElMessage.warning(
        `已跳过不支持或超过 20MB 的文件：${sample}${skipped.length > 3 ? "…" : ""}`
      );
    }

    if (newEntries.length) {
      list.value = [...list.value, ...newEntries];
      const last = newEntries[newEntries.length - 1];
      ElMessage.success(
        newEntries.length === 1
          ? `已添加字体「${last.label}」`
          : `已添加 ${newEntries.length} 个字体`
      );
      return { added: newEntries.length, lastValue: last.value };
    }

    return { added: 0 };
  }

  function removeFont(value: string) {
    forgetInjectedFileCustomFont(value);
    const ent = list.value.find((f) => f.value === value);
    const u = ent?.files?.[0]?.url;
    if (u?.startsWith("blob:")) URL.revokeObjectURL(u);
    list.value = list.value.filter((f) => f.value !== value);
  }

  return { uploadedFonts: list, addFontFiles, removeFont };
}

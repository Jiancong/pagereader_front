import fs from "fs";
import path from "path";

const root = path.resolve("src/components/editor/chat");
const src = fs.readFileSync(path.join(root, "PptViewer.vue"), "utf8");
const lines = src.split(/\r?\n/);

const base = path.join(root, "ppt");
for (const d of [
  base,
  path.join(base, "shared"),
  path.join(base, "charts"),
  path.join(base, "themes/editorialBrutalist"),
  path.join(base, "themes/modernLiterary"),
]) {
  fs.mkdirSync(d, { recursive: true });
}

function slice(start, end) {
  return lines.slice(start - 1, end).join("\n");
}

fs.writeFileSync(
  path.join(base, "themes/editorialBrutalist/_template.fragment.html"),
  slice(432, 1267)
);
fs.writeFileSync(
  path.join(base, "themes/modernLiterary/_template.fragment.html"),
  slice(1276, 1942)
);
fs.writeFileSync(
  path.join(base, "themes/editorialBrutalist/editorialBrutalist.scss"),
  slice(21566, 23063)
);
fs.writeFileSync(
  path.join(base, "themes/modernLiterary/modernLiterary.scss"),
  slice(23065, 24698)
);
fs.writeFileSync(
  path.join(base, "themes/editorialBrutalist/_helpers.fragment.ts"),
  slice(12822, 13149)
);
fs.writeFileSync(
  path.join(base, "themes/modernLiterary/_helpers.fragment.ts"),
  slice(13151, 13421)
);
fs.writeFileSync(
  path.join(base, "charts/_brutalistChart.fragment.html"),
  slice(942, 1204)
);

console.log("Extracted fragments OK");

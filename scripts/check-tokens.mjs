// Fails when app code hardcodes a color, size, shadow or easing instead of a token.
// Escape hatch for justified cases: put `token-ok` in a comment on the same line.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const targets = [join(root, "apps/web/src")];

const rules = [
  { name: "hex color", re: /#[0-9a-fA-F]{3,8}\b(?![\w-])/g, files: /\.(css|tsx?)$/ },
  { name: "rgb/hsl color", re: /\b(rgba?|hsla?|oklch|lab)\(/g, files: /\.(css|tsx?)$/ },
  { name: "px/rem size", re: /(?<![\w-])-?\d*\.?\d+(px|rem|em)\b/g, files: /\.(css|tsx?)$/ },
  { name: "easing keyword", re: /\b(ease-in-out|ease-in|ease-out|cubic-bezier\()|(?<![\w-])ease(?![\w-])/g, files: /\.css$/ },
  { name: "font-size literal", re: /font-size:(?!\s*(var\(|calc\(var\(|inherit))/g, files: /\.css$/ },
  { name: "font-weight literal", re: /font-weight:(?!\s*(var\(|inherit))/g, files: /\.css$/ },
  { name: "shadow literal", re: /box-shadow:(?![^;]*var\()(?!\s*(none|inherit)\s*;)/g, files: /\.css$/ },
  { name: "radius literal", re: /border-radius:(?![^;]*var\()(?!\s*(0|50%|inherit)\s*;)/g, files: /\.css$/ },
  { name: "z-index literal", re: /z-index:(?!\s*(var\(|calc\(var\(|auto|0;|1;|-1;))/g, files: /\.css$/ },
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

const problems = [];
for (const dir of targets) {
  for (const file of walk(dir)) {
    if (/\.test\.tsx?$/.test(file)) continue;
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (line.includes("token-ok")) return;
      // Media queries can't read custom properties; the phone breakpoint is allowed there.
      if (/@media/.test(line) && line.includes("--layout-phone")) return;
      // Ignore comments and import paths.
      const code = line.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "").replace(/^\s*import .*$/, "");
      for (const rule of rules) {
        if (!rule.files.test(file)) continue;
        for (const m of code.matchAll(rule.re)) {
          problems.push(`${relative(root, file)}:${i + 1}  ${rule.name}: ${m[0]}`);
        }
      }
    });
  }
}

if (problems.length) {
  console.error(`Off-token values (use DESIGN.md tokens):\n${problems.join("\n")}`);
  process.exit(1);
}
console.log("Token check passed.");

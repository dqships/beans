// Generates src/tokens.css and src/tokens.ts from the tables in DESIGN.md.
// DESIGN.md is the source of truth. Run `pnpm tokens` after editing it.
// `--check` fails if the generated files are out of date.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const designPath = resolve(here, "../../../DESIGN.md");
const cssPath = resolve(here, "../src/tokens.css");
const tsPath = resolve(here, "../src/tokens.ts");
const design = readFileSync(designPath, "utf8");

const PX_TOKENS = /^--(space|layout|radius|text|border|focus|control|icon|bean)/;

/** Collects table rows whose first cell is a backticked custom property. */
function tableRows(markdown) {
  const rows = [];
  for (const line of markdown.split("\n")) {
    const match = line.match(/^\|\s*`(--[a-z0-9-]+)`\s*\|(.*)\|\s*$/);
    if (!match) continue;
    const cells = match[2].split("|").map((c) => c.trim().replace(/^`|`$/g, ""));
    rows.push({ name: match[1], cells });
  }
  return rows;
}

function section(title) {
  const start = design.indexOf(`## ${title}`);
  if (start < 0) throw new Error(`DESIGN.md is missing the "${title}" section`);
  const next = design.indexOf("\n## ", start + 3);
  return design.slice(start, next < 0 ? undefined : next);
}

const light = {};
const dark = {};
const shared = {};

// Color: Light | Dark | Use, and label colors: Value
for (const { name, cells } of tableRows(section("Color"))) {
  if (cells.length >= 3 && name.startsWith("--color-")) {
    light[name] = cells[0];
    dark[name] = cells[1];
  } else {
    shared[name] = cells[0];
  }
}

// Mascot constants, from the sentence in the Color section.
const mascotLine = section("Color").match(/Mascot colors[^\n]+/)?.[0] ?? "";
const mascot = {
  bean: /bean `(#[0-9A-F]{6})`/i,
  shade: /shade `(#[0-9A-F]{6})`/i,
  highlight: /highlight `(#[0-9A-F]{6})`/i,
  leaf: /leaf `(#[0-9A-F]{6})`/i,
  "leaf-2": /leaf `#[0-9A-F]{6}` and `(#[0-9A-F]{6})`/i,
  stem: /stem `(#[0-9A-F]{6})`/i,
  cheek: /cheek `(#[0-9A-F]{6})`/i,
  eyes: /eyes `(#[0-9A-F]{6})`/i,
  glint: /glint `(#[0-9A-F]{6})`/i,
};
for (const [key, re] of Object.entries(mascot)) {
  const found = mascotLine.match(re)?.[1];
  if (!found) throw new Error(`Mascot color "${key}" not found in DESIGN.md`);
  shared[`--mascot-${key}`] = found;
}

// Type: Size / line | Weight | Use
for (const { name, cells } of tableRows(section("Type"))) {
  const [size, line] = cells[0].split("/").map((v) => v.trim());
  shared[`${name}-size`] = `${size}px`;
  shared[`${name}-line`] = `${line}px`;
  shared[`${name}-weight`] = cells[1];
}

// Spacing scale sentence plus the layout table.
const spacingSection = section("Spacing");
for (const m of spacingSection.matchAll(/`(--space-\d)`\s+(\d+)/g)) {
  shared[m[1]] = `${m[2]}px`;
}
for (const { name, cells } of tableRows(spacingSection)) shared[name] = `${cells[0]}px`;

// Shape and depth. Dark shadows use black at double opacity.
for (const { name, cells } of tableRows(section("Shape and depth"))) {
  if (name.startsWith("--shadow-")) {
    light[name] = cells[0];
    dark[name] = cells[0].replace(
      /rgb\(\d+ \d+ \d+ \/ ([0-9.]+)\)/,
      (_, a) => `rgb(0 0 0 / ${+(Number(a) * 2).toFixed(2)})`,
    );
  } else {
    shared[name] = `${cells[0]}px`;
  }
}

// Motion: spring constants and plain duration tokens.
const motion = section("Motion");
const spring = {};
for (const { name, cells } of tableRows(motion)) {
  if (name.startsWith("--spring-")) {
    spring[name.replace("--spring-", "")] = Number(cells[0]);
    shared[name] = cells[0];
  } else {
    shared[name] = cells[0];
  }
}

/** Simulates the spring and returns a CSS linear() easing plus its settle time. */
function springEasing({ stiffness, damping, mass }) {
  const dt = 1 / 1000;
  let x = 0;
  let v = 0;
  const samples = [];
  let t = 0;
  let settledAt = null;
  while (t < 3) {
    const a = (-stiffness * (x - 1) - damping * v) / mass;
    v += a * dt;
    x += v * dt;
    t += dt;
    samples.push([t, x]);
    if (Math.abs(x - 1) < 0.001 && Math.abs(v) < 0.01) {
      if (settledAt === null) settledAt = t;
      if (t - settledAt > 0.02) break;
    } else {
      settledAt = null;
    }
  }
  const duration = samples[samples.length - 1][0];
  const points = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const target = (duration * i) / steps;
    const sample = samples.find(([st]) => st >= target) ?? samples[samples.length - 1];
    points.push(i === steps ? 1 : Number(sample[1].toFixed(4)));
  }
  return { easing: `linear(${[0, ...points.slice(1)].join(", ")})`, ms: Math.round(duration * 1000) };
}

const { easing, ms } = springEasing(spring);
shared["--ease-spring"] = easing;
shared["--duration-spring"] = `${ms}ms`;

// Supporting tokens.
for (const { name, cells } of tableRows(section("Supporting tokens"))) {
  let value = cells[0];
  if (name === "--font-sans") {
    value =
      'var(--font-figtree, "Figtree"), ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
  } else if (/^\d+$/.test(value) && PX_TOKENS.test(name)) {
    value = `${value}px`;
  }
  shared[name] = value;
}

function block(selector, vars) {
  const body = Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  return `${selector} {\n${body}\n}\n`;
}

const css = [
  "/* Generated from DESIGN.md by packages/tokens/scripts/build.mjs. Do not edit. */\n",
  block(":root", { ...shared, ...light, "color-scheme": "light" }),
  "@media (prefers-color-scheme: dark) {\n" +
    block(':root:not([data-theme="light"])', { ...dark, "color-scheme": "dark" })
      .split("\n")
      .map((l) => (l ? `  ${l}` : l))
      .join("\n") +
    "}\n",
  block(':root[data-theme="dark"]', { ...dark, "color-scheme": "dark" }),
].join("\n");

const ts = `// Generated from DESIGN.md by packages/tokens/scripts/build.mjs. Do not edit.

/** Spring used by every animation. */
export const spring = ${JSON.stringify(spring)} as const;

/** Label color names, in the order shown in pickers. */
export const labelColors = ${JSON.stringify(
  Object.keys(shared)
    .filter((k) => k.startsWith("--label-"))
    .map((k) => k.replace("--label-", "")),
)} as const;

export type LabelColor = (typeof labelColors)[number];

/** CSS variable reference for a token, for inline styles. */
export function token(name: \`--\${string}\`): string {
  return \`var(\${name})\`;
}

/** Phone breakpoint in px (\`--layout-phone\`). */
export const phoneBreakpoint = ${parseInt(shared["--layout-phone"], 10)};

/** Calendar hour height at 100% zoom (\`--layout-hour\`). */
export const hourHeight = ${parseInt(shared["--layout-hour"], 10)};
`;

const check = process.argv.includes("--check");
const outputs = [
  [cssPath, css],
  [tsPath, ts],
];
let stale = false;
for (const [path, content] of outputs) {
  if (check) {
    let current = "";
    try {
      current = readFileSync(path, "utf8");
    } catch {}
    if (current !== content) {
      console.error(`${path} is out of date. Run \`pnpm tokens\`.`);
      stale = true;
    }
  } else {
    writeFileSync(path, content);
  }
}
if (stale) process.exit(1);
console.log(check ? "Tokens are up to date." : `Wrote tokens (spring settles in ${ms}ms).`);

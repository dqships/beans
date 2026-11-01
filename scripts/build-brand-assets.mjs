// Builds every logo, icon and social image from the master SVGs in assets/logo.
// Colors and text sizes come from packages/tokens. Run with `pnpm assets`.
// The file list and sizes are fixed in section 1 of docs/launch/assets.md.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appDir = resolve(root, "apps/web/src/app");
const brandDir = resolve(root, "apps/web/public/brand");
const socialDir = resolve(root, "apps/web/public/social");
const uploadDir = resolve(root, "assets/brand");

const appIcon = readFileSync(resolve(root, "assets/logo/beans-app-icon.svg"), "utf8");
const mascot = readFileSync(resolve(root, "assets/logo/beans-mascot.svg"), "utf8");
const tokensCss = readFileSync(resolve(root, "packages/tokens/src/tokens.css"), "utf8");

/** The mascot's shapes in its 512 box, ready to place inside another SVG. */
const mascotArt = mascot.replace(/^[\s\S]*?<\/title>/, "").replace(/<\/svg>\s*$/, "");

/** The bean body alone, used for the seeds planted in the soil. */
const beanPath = mascot.match(/<!-- Bean -->\s*<path d="([^"]+)"/)?.[1].replace(/\s+/g, " ");
if (!beanPath) throw new Error("beans-mascot.svg no longer has a <!-- Bean --> path");

/** Crop of the 512 box that fits the art tightly, so small icons draw it as large as they can. */
const TIGHT_VIEW_BOX = "28 20 448 448";

/** Reads a token's light theme value from the first `:root` block of tokens.css. */
function token(name) {
  const value = tokensCss.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1];
  if (!value) throw new Error(`tokens.css has no ${name}`);
  return value;
}

/** Reads a px token as a number. */
const px = (name) => Number.parseFloat(token(name));

function svg(width, height, viewBox, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}">${body}</svg>`;
}

/** The app icon at a size. Keeps the master's rounded corners and transparency. */
const roundedIcon = (size) => appIcon.replace("<svg ", `<svg width="${size}" height="${size}" `);

/** The app icon with square corners on paper, for platforms that apply their own mask. */
function squareIcon(size) {
  const square = roundedIcon(size).replace(/\s+rx="228"/, "");
  if (square.length === roundedIcon(size).length) throw new Error('beans-app-icon.svg no longer has rx="228"');
  return square;
}

/** The mascot in a tight crop with no tile. Reads on light and dark tabs at tab sizes. */
const tightMascot = (size) => svg(size, size, TIGHT_VIEW_BOX, mascotArt);

/** The mascot's own box at a width, transparent. */
const fullMascot = (size) => svg(size, size, "0 0 512 512", mascotArt);

/** Full-bleed paper with the mascot inside the circle every mask leaves visible. */
function safeZoneIcon(size) {
  return svg(
    size,
    size,
    "0 0 1024 1024",
    `<rect width="1024" height="1024" fill="${token("--color-bg")}"/>` +
      `<g transform="translate(167 158) scale(1.3)">${mascotArt}</g>`,
  );
}

function loadFigtree(weight) {
  const require = createRequire(import.meta.url);
  const path = require.resolve(`@fontsource/figtree/files/figtree-latin-${weight}-normal.woff`);
  const file = readFileSync(path);
  return opentype.parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.length));
}

/**
 * Text as outlines, so the images don't depend on the fonts installed on this machine.
 * Builds the path data by hand: opentype.js `toPathData` can print `NaN`, and the
 * SVG renderer then drops every glyph after it.
 */
function textPath(text, x, y, size, weight, fill) {
  const point = (px, py) => `${px.toFixed(2)} ${py.toFixed(2)}`;
  const data = loadFigtree(weight)
    .getPath(text, x, y, size, { kerning: true })
    .commands.map((c) => {
      if (c.type === "Q") return `Q${point(c.x1, c.y1)} ${point(c.x, c.y)}`;
      if (c.type === "C") return `C${point(c.x1, c.y1)} ${point(c.x2, c.y2)} ${point(c.x, c.y)}`;
      return c.type === "Z" ? "Z" : `${c.type}${point(c.x, c.y)}`;
    })
    .join("");
  return `<path d="${data}" fill="${fill}"/>`;
}

/**
 * The social card: a line of copy and the mascot standing on one soil line,
 * with seeds planted in a row below it.
 */
function socialCard(width, height) {
  const margin = px("--layout-section-sm");
  const seedGap = px("--layout-section");
  const soilY = height - seedGap - px("--space-6");
  const soilLine = px("--space-1");

  const mascotSize = soilY - margin / 2;
  const scale = mascotSize / 512;
  // In its 512 box the art's right edge is at 412 and its lowest point at 462.
  // It lines up with the right margin and sits a little into the soil, like something planted.
  const mascotX = width - margin - 412 * scale;
  const mascotY = soilY + px("--space-3") - 462 * scale;

  // The bean body spans 92 to 402 across, so each seed starts that far left of its slot.
  const seedScale = 0.11;
  const seedWidth = 310 * seedScale;
  const seedCount = Math.floor((width - 2 * margin - seedWidth) / seedGap) + 1;
  const seedStep = (width - 2 * margin - seedWidth) / (seedCount - 1);
  const seedY = soilY + px("--space-6");
  const seeds = Array.from({ length: seedCount }, (_, i) => {
    const x = margin + i * seedStep - 92 * seedScale;
    return `<path transform="translate(${x} ${seedY}) scale(${seedScale})" d="${beanPath}" fill="${token("--color-border")}"/>`;
  });

  const textSize = px("--text-display-size");
  const line = textPath(
    "Spill the beans.",
    margin,
    soilY - px("--space-5"),
    textSize,
    token("--text-display-weight"),
    token("--color-text"),
  );

  return svg(
    width,
    height,
    `0 0 ${width} ${height}`,
    `<rect width="${width}" height="${height}" fill="${token("--color-bg")}"/>` +
      `<g transform="translate(${mascotX} ${mascotY}) scale(${scale})">${mascotArt}</g>` +
      `<rect y="${soilY}" width="${width}" height="${height - soilY}" fill="${token("--color-surface-2")}"/>` +
      `<rect y="${soilY}" width="${width}" height="${soilLine}" fill="${token("--label-soil")}"/>` +
      seeds.join("") +
      line,
  );
}

const png = (source) => sharp(Buffer.from(source)).png({ compressionLevel: 9 });

/** The same, for art that fills its whole canvas: drops the alpha channel. */
const opaquePng = (source) => sharp(Buffer.from(source)).removeAlpha().png({ compressionLevel: 9 });

/** Fails if any art falls outside the centered circle of 80% diameter that masks keep. */
async function assertInsideSafeZone(buffer, paper) {
  const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true });
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(paper.slice(i, i + 2), 16));
  const center = (info.width - 1) / 2;
  const radius = info.width * 0.4;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (Math.hypot(x - center, y - center) <= radius) continue;
      const i = (y * info.width + x) * info.channels;
      if (data[i] !== r || data[i + 1] !== g || data[i + 2] !== b) {
        throw new Error(`Maskable icon has art outside the safe zone at ${x},${y}`);
      }
    }
  }
}

/** An ICO that holds one PNG per size. */
function ico(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  let offset = header.length + entries.length * 16;
  const directory = entries.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size, 0);
    entry.writeUInt8(size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  return Buffer.concat([header, ...directory, ...entries.map(({ data }) => data)]);
}

function manifest() {
  const paper = token("--color-bg");
  return `// Generated by scripts/build-brand-assets.mjs. Do not edit.
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Beans",
    short_name: "Beans",
    description: "A daily planner for your tasks, your week and your hours.",
    id: "/app",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "${paper}", // token-ok: --color-bg, light theme
    theme_color: "${paper}", // token-ok: --color-bg, light theme
    icons: [
      { src: "/brand/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
`;
}

function write(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
  console.log(`${relative(root, path)}  ${(data.length / 1024).toFixed(1)} KB`);
}

const paper = token("--color-bg");

const icoEntries = await Promise.all(
  [16, 32, 48].map(async (size) => ({ size, data: await png(tightMascot(size)).toBuffer() })),
);
write(resolve(appDir, "favicon.ico"), ico(icoEntries));
write(resolve(appDir, "icon.svg"), Buffer.from(`${tightMascot(512).replace(/ width="512" height="512"/, "")}\n`));
write(resolve(appDir, "icon.png"), await png(tightMascot(512)).toBuffer());
write(resolve(appDir, "apple-icon.png"), await opaquePng(squareIcon(180)).toBuffer());
write(resolve(appDir, "manifest.ts"), Buffer.from(manifest()));

write(resolve(brandDir, "pwa-192.png"), await png(roundedIcon(192)).toBuffer());
write(resolve(brandDir, "pwa-512.png"), await png(roundedIcon(512)).toBuffer());
const maskable = await opaquePng(safeZoneIcon(512)).toBuffer();
await assertInsideSafeZone(maskable, paper);
write(resolve(brandDir, "pwa-maskable-512.png"), maskable);

write(resolve(brandDir, "mascot-1x.png"), await png(fullMascot(256)).toBuffer());
write(resolve(brandDir, "mascot-2x.png"), await png(fullMascot(512)).toBuffer());
write(
  resolve(brandDir, "mascot.webp"),
  await sharp(Buffer.from(fullMascot(512))).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toBuffer(),
);
write(
  resolve(brandDir, "mascot.avif"),
  await sharp(Buffer.from(fullMascot(512))).avif({ quality: 70, effort: 6 }).toBuffer(),
);

const social = await opaquePng(socialCard(1200, 630)).toBuffer();
write(resolve(socialDir, "og-image.png"), social);
write(resolve(socialDir, "twitter-image.png"), social);

write(resolve(uploadDir, "clerk-logo.png"), await png(tightMascot(512)).toBuffer());
write(resolve(uploadDir, "google-oauth-logo.png"), await opaquePng(safeZoneIcon(120)).toBuffer());
write(resolve(uploadDir, "github-social-preview.png"), await opaquePng(socialCard(1280, 640)).toBuffer());

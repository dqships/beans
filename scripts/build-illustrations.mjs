// Builds every mascot pose. Run with `pnpm illustrations`.
//
// Generated poses start from assets/illustrations/raw/<name>.png (flat art on
// cream paper). The paper is cut out so the art works on both themes.
// Code-drawn poses start from the SVG scenes below, built on the master mascot.
//
// Output: assets/illustrations/<name>.png (transparent, at 2x size) and
// apps/web/public/illustrations/<name>@{1x,2x}.{avif,webp}, each under 60 KB.
// See docs/launch/assets.md section 2 for sizes, alt text and how to redo a pose.
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rawDir = join(root, "assets/illustrations/raw");
const srcDir = join(root, "assets/illustrations");
const webDir = join(root, "apps/web/public/illustrations");
const MAX_BYTES = 60 * 1024;

/**
 * `minIsland`: loose specks smaller than this (in raw pixels) are paper texture, not art.
 * `soil`: this pose's soil color, retinted to C.soil. `band` limits that to a row range of the
 * raw image, for poses where something else in the picture is close to the soil color.
 * The hero has no `soil` on purpose: DQ reviews it as generated.
 */
const generated = {
  hero: { width: 800, height: 600, minIsland: 700 },
  "brain-dump": { width: 640, height: 480, soil: { from: "#794925", band: [705, 727] } },
  planning: { width: 640, height: 480, soil: { from: "#694020" } },
  focus: { width: 640, height: 480, soil: { from: "#623918", band: [652, 676] } },
  rollover: { width: 640, height: 480, soil: { from: "#6C4324", band: [670, 760] } },
  analytics: { width: 640, height: 480, soil: { from: "#BE7535", band: [704, 722] } },
  phone: { width: 480, height: 480, soil: { from: "#824722", band: [950, 968] } },
};

// Art colors. The mascot's are the brand constants in DESIGN.md. Soil and sage
// match the generated poses, so code-drawn poses sit beside them.
const C = {
  bean: "#C4552F",
  shade: "#A14322",
  highlight: "#F0B08C",
  leaf: "#6CC48E",
  leaf2: "#4FA874",
  stem: "#2F7D4F",
  soil: "#6F4327",
  soilDeep: "#4A2A17",
  sage: "#93C48F",
  sageDark: "#6FA56E",
  sageDeep: "#3F6B45",
  rain: "#4F93D1",
  sun: "#F2CE7C",
};

/** The master mascot, drawn at 512 units. Placed with scale and position. */
const masterBody = readFileSync(join(root, "assets/logo/beans-mascot.svg"), "utf8")
  .replace(/<\/?svg[^>]*>/g, "")
  .replace(/<title[\s\S]*?<\/title>/, "")
  .replace(/<!--[\s\S]*?-->/g, "");

const mascot = (x, y, size, turn = 0) => {
  const s = size / 512;
  return `<g transform="translate(${x} ${y}) rotate(${turn} ${size / 2} ${size / 2}) scale(${s})">${masterBody}</g>`;
};

const soilLine = (x1, x2, y, weight = 7) =>
  `<path d="M${x1} ${y} L${x2} ${y}" stroke="${C.soil}" stroke-width="${weight}" stroke-linecap="round" fill="none"/>`;

/** A plain small bean, no face. (x, y) is its center. */
const bean = (x, y, length, turn = 0) => {
  const s = length / 330;
  return `<g transform="translate(${x} ${y}) rotate(${turn}) scale(${s}) translate(-247 -294)">
    <path d="M278 126 C346 126 402 182 402 256 C402 350 306 462 196 462 C136 462 92 414 92 354 C92 306 128 270 176 266 C198 264 208 248 198 232 C184 214 176 196 180 178 C188 148 228 126 278 126 Z" fill="${C.bean}"/>
    <path d="M384 196 C392 214 402 234 402 256 C402 350 306 462 196 462 C150 462 112 434 98 394 C124 428 166 442 208 438 C304 428 388 322 384 196 Z" fill="${C.shade}"/>
  </g>`;
};

/** A two-leaf seedling rising from (x, y). */
const seedling = (x, y, size) => {
  const s = size / 100;
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M0 0 C0 -22 0 -40 2 -58" stroke="${C.stem}" stroke-width="7" stroke-linecap="round" fill="none"/>
    <path d="M2 -58 C8 -84 34 -94 60 -86 C58 -60 28 -44 2 -58 Z" fill="${C.leaf}"/>
    <path d="M2 -58 C22 -64 40 -74 56 -84 C58 -60 28 -44 2 -58 Z" fill="${C.leaf2}"/>
    <path d="M0 -50 C-10 -72 -32 -78 -54 -68 C-50 -46 -22 -36 0 -50 Z" fill="${C.leaf}"/>
    <path d="M0 -50 C-18 -54 -34 -60 -50 -66 C-48 -46 -22 -38 0 -50 Z" fill="${C.leaf2}"/>
  </g>`;
};

/** One two-tone leaf growing from (x, y), pointing along `turn` degrees (0 is right). */
const leaf = (x, y, size, turn, colors = [C.leaf, C.leaf2]) => {
  const s = size / 100;
  return `<g transform="translate(${x} ${y}) rotate(${turn}) scale(${s})">
    <path d="M0 0 C22 -34 66 -38 100 0 C66 34 22 34 0 0 Z" fill="${colors[0]}"/>
    <path d="M0 0 C34 -2 66 -2 100 0 C66 34 22 34 0 0 Z" fill="${colors[1]}"/>
  </g>`;
};

/** Points at even steps along a cubic Bezier: [p0, p1, p2, p3], with the direction at each. */
const evenSteps = ([p0, p1, p2, p3], count) => {
  const at = (t) => {
    const u = 1 - t;
    return [0, 1].map((k) => u ** 3 * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t ** 3 * p3[k]);
  };
  const samples = Array.from({ length: 801 }, (_, i) => at(i / 800));
  const lengths = [0];
  for (let i = 1; i < samples.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(samples[i][0] - samples[i - 1][0], samples[i][1] - samples[i - 1][1]));
  }
  const total = lengths.at(-1);
  return Array.from({ length: count }, (_, step) => {
    const goal = (total * (step + 1)) / (count + 1);
    const i = lengths.findIndex((l) => l >= goal);
    const [x, y] = samples[i];
    const [px, py] = samples[i - 1];
    return { x, y, heading: (Math.atan2(y - py, x - px) * 180) / Math.PI };
  });
};

/** An open seed packet, tipped over. (x, y) is its center. No writing. */
const packet = (x, y, size, turn) => {
  const s = size / 100;
  return `<g transform="translate(${x} ${y}) rotate(${turn}) scale(${s})">
    <path d="M-38 -54 L38 -54 L44 54 Q44 60 38 60 L-38 60 Q-44 60 -44 54 Z" fill="${C.sage}"/>
    <path d="M-38 -54 L38 -54 L39 -36 L-39 -36 Z" fill="${C.sageDark}"/>
    ${bean(0, 12, 42, -turn)}
  </g>`;
};

const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w * 2}" height="${h * 2}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

const vine = [[300, 450], [236, 330], [262, 180], [352, 52]];

const coded = {
  // Clinging to the beanstalk: the kidney notch hooks around the vine. Leaves mark even steps,
  // with one bean-colored leaf above the mascot, like the now marker in the Timebox.
  timebox: {
    width: 640,
    height: 480,
    draw: (w, h) => {
      // Steps 1, 2 and 5 sit behind the mascot and its sprout, so they aren't drawn.
      const marks = evenSteps(vine, 8)
        .map(({ x, y, heading }, i) => {
          if ([1, 2, 5].includes(i)) return "";
          const now = i === 6;
          return leaf(x, y, now ? 52 : 44, heading - 62, now ? [C.bean, C.shade] : [C.leaf, C.leaf2]);
        })
        .join("");
      return svg(w, h, `
        ${soilLine(150, 490, 450)}
        <path d="M${vine[0]} C${vine[1]} ${vine[2]} ${vine[3]}" stroke="${C.stem}" stroke-width="13" stroke-linecap="round" fill="none"/>
        ${leaf(352, 52, 46, -62)}
        ${marks}
        ${mascot(166, 124, 262, -8)}
      `);
    },
  },
  // Digging and finding nothing: the soil line dips into an empty hole.
  404: {
    width: 640,
    height: 480,
    draw: (w, h) =>
      svg(w, h, `
        <path d="M322 408 C326 474 436 474 440 408 Z" fill="${C.soilDeep}"/>
        <path d="M56 408 L322 408 C326 474 436 474 440 408 L592 408" stroke="${C.soil}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        ${mascot(2, 106, 326)}
        <path d="M456 408 C472 356 544 354 570 408 Z" fill="${C.soil}"/>
        <g transform="rotate(24 512 366)">
          <path d="M505 300 L519 300 L519 346 L505 346 Z" fill="${C.sageDark}"/>
          <rect x="499" y="268" width="26" height="40" rx="9" fill="${C.sageDark}"/>
          <path d="M490 344 L534 344 L530 382 Q512 396 494 382 Z" fill="${C.sage}"/>
        </g>
        <path d="M456 408 C466 386 488 376 500 376 C522 376 556 382 570 408 Z" fill="${C.soil}"/>
      `),
  },
  // Watering a seedling: the same idea as the old sign-in art, on model.
  welcome: {
    width: 480,
    height: 480,
    draw: (w, h) =>
      svg(w, h, `
        ${soilLine(48, 432, 392)}
        ${mascot(26, 84, 330)}
        ${seedling(388, 389, 60)}
        <g transform="rotate(14 372 236)">
          <path d="M326 206 L402 206 L396 276 Q395 284 387 284 L341 284 Q333 284 332 276 Z" fill="${C.sage}"/>
          <path d="M326 206 L402 206 L400 224 L328 224 Z" fill="${C.sageDark}"/>
          <path d="M340 206 C340 170 388 170 388 206" stroke="${C.sageDark}" stroke-width="9" fill="none"/>
          <path d="M398 238 L450 206" stroke="${C.sageDark}" stroke-width="12" stroke-linecap="round" fill="none"/>
        </g>
        <path d="M424 268 C418 280 430 280 424 268 Z" fill="${C.rain}" stroke="${C.rain}" stroke-width="8" stroke-linejoin="round"/>
        <path d="M402 296 C396 308 408 308 402 296 Z" fill="${C.rain}" stroke="${C.rain}" stroke-width="8" stroke-linejoin="round"/>
        <path d="M428 312 C422 324 434 324 428 312 Z" fill="${C.rain}" stroke="${C.rain}" stroke-width="8" stroke-linejoin="round"/>
      `),
  },
  // A knocked-over pot: something tipped, the mascot stays calm.
  error: {
    width: 480,
    height: 480,
    draw: (w, h) =>
      svg(w, h, `
        ${soilLine(40, 448, 392)}
        ${mascot(-6, 92, 326)}
        <path d="M236 392 C252 352 322 348 346 392 Z" fill="${C.soil}"/>
        <g transform="rotate(7 392 392)">
          <path d="M350 300 L438 314 Q446 315 446 323 L446 361 Q446 369 438 370 L350 384 Z" fill="${C.sage}"/>
          <rect x="332" y="288" width="22" height="108" rx="6" fill="${C.sageDark}"/>
        </g>
        <g transform="translate(292 362) rotate(-28)">${seedling(0, 0, 46).replace("translate(0 0) ", "")}</g>
      `),
  },
  // An empty bucket with nothing left to dig up.
  "empty-trash": {
    width: 480,
    height: 480,
    draw: (w, h) =>
      svg(w, h, `
        ${soilLine(48, 432, 392)}
        ${mascot(14, 76, 340)}
        <path d="M322 268 C322 214 424 214 424 268" stroke="${C.sageDark}" stroke-width="8" fill="none"/>
        <path d="M322 268 L424 268 L412 382 Q411 390 403 390 L343 390 Q335 390 334 382 Z" fill="${C.sage}"/>
        <ellipse cx="373" cy="268" rx="51" ry="13" fill="${C.sageDark}"/>
        <ellipse cx="373" cy="270" rx="41" ry="8" fill="${C.sageDeep}"/>
      `),
  },
  // A row growing from bean to sprout, for the top of an email.
  "email-header": {
    width: 600,
    height: 200,
    draw: (w, h) =>
      svg(w, h, `
        ${soilLine(40, 560, 172, 6)}
        ${mascot(36, 8, 180)}
        ${bean(258, 156, 30, -10)}
        ${seedling(336, 169, 34)}
        ${seedling(420, 169, 56)}
        ${seedling(512, 169, 84)}
      `),
  },
  // Morning: the sun comes up behind the row.
  "video-intro": {
    width: 960,
    height: 540,
    draw: (w, h) =>
      svg(w, h, `
        <path d="M566 432 A130 130 0 0 1 826 432 Z" fill="${C.sun}"/>
        ${soilLine(90, 870, 432, 9)}
        ${mascot(190, 86, 370)}
        ${seedling(624, 428, 62)}
        ${seedling(712, 428, 62)}
        ${seedling(800, 428, 62)}
      `),
  },
  // "Spill the beans." The left half stays empty for the outro line.
  "video-outro": {
    width: 960,
    height: 540,
    draw: (w, h) =>
      svg(w, h, `
        ${soilLine(470, 900, 452, 9)}
        ${mascot(590, 118, 356)}
        ${packet(560, 316, 118, -128)}
        ${bean(528, 368, 30, 20)}
        ${bean(500, 396, 30, -35)}
        ${bean(548, 412, 30, 60)}
        ${bean(476, 436, 30, 10)}
        ${bean(522, 436, 30, -60)}
        ${bean(566, 438, 30, 30)}
        ${bean(610, 438, 30, -20)}
      `),
  },
};

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Squared distance between two colors, in sRGB. */
const dist2 = (r1, g1, b1, r2, g2, b2) => (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2;

/**
 * Removes the cream paper from flat art.
 * 1. The paper color is the median of the image's border.
 * 2. Paper reachable from the border goes. So do closed-in pockets of paper,
 *    except eye glints, which are ringed by dark eye color, and bean highlights.
 * 3. Loose specks go.
 * 4. Edge pixels get a soft alpha and take the color of the art beside them,
 *    so no cream fringe shows on the dark theme.
 * 5. The soil, if given, is retinted to the shared soil color. It's a shift, not a
 *    fill, so shading inside the soil survives.
 */
async function cutOut(path, { minIsland = 40, soil }) {
  const { data, info } = await sharp(path).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const n = w * h;
  const at = (i) => [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]];

  const border = [];
  for (let x = 0; x < w; x += 4) border.push(at(x), at(n - 1 - x));
  for (let y = 0; y < h; y += 4) border.push(at(y * w), at(y * w + w - 1));
  const paper = [0, 1, 2].map((c) => border.map((p) => p[c]).sort((a, b) => a - b)[border.length >> 1]);

  const near = new Uint8Array(n); // 1 = close to the paper color
  const T = 24 ** 2;
  for (let i = 0; i < n; i++) if (dist2(...at(i), ...paper) < T) near[i] = 1;

  const neighbours = (i) => {
    const x = i % w;
    const out = [];
    if (x > 0) out.push(i - 1);
    if (x < w - 1) out.push(i + 1);
    if (i >= w) out.push(i - w);
    if (i < n - w) out.push(i + w);
    return out;
  };
  const regions = (mask, value) => {
    const seen = new Uint8Array(n);
    const found = [];
    for (let s = 0; s < n; s++) {
      if (seen[s] || mask[s] !== value) continue;
      const pixels = [s];
      seen[s] = 1;
      for (let k = 0; k < pixels.length; k++) {
        for (const j of neighbours(pixels[k])) {
          if (!seen[j] && mask[j] === value) {
            seen[j] = 1;
            pixels.push(j);
          }
        }
      }
      found.push(pixels);
    }
    return found;
  };

  /** What surrounds a pocket, a few steps out: the share that's eye-dark and the share that's bean. */
  const ring = (pixels) => {
    const inside = new Set(pixels);
    let edge = pixels;
    for (let step = 0; step < 4; step++) {
      const next = new Set();
      for (const i of edge) for (const j of neighbours(i)) if (!inside.has(j)) next.add(j);
      for (const j of next) inside.add(j);
      edge = [...next];
    }
    const total = Math.max(edge.length, 1);
    const dark = edge.filter((i) => at(i).reduce((sum, c) => sum + c, 0) < 240).length / total;
    const bean = edge.filter((i) => {
      const [r, , b] = at(i);
      return r - b > 100;
    }).length / total;
    return { dark, bean };
  };

  const bg = new Uint8Array(n);
  for (const pixels of regions(near, 1)) {
    const touchesEdge = pixels.some((i) => i < w || i >= n - w || i % w === 0 || i % w === w - 1);
    if (touchesEdge) {
      for (const i of pixels) bg[i] = 1;
      continue;
    }
    // A closed-in pocket. Keep eye glints, and the small highlights on beans.
    const around = ring(pixels);
    if (around.dark > 0.5 || (pixels.length < 120 && around.bean > 0.8)) continue;
    for (const i of pixels) bg[i] = 1;
  }

  for (const pixels of regions(bg, 0)) {
    if (pixels.length < minIsland) for (const i of pixels) bg[i] = 1;
  }

  // Pale crumbs where a curve meets a line: too blended to match the paper above.
  const pale = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (!bg[i] && dist2(...at(i), ...paper) < 90 ** 2) pale[i] = 1;
  for (const pixels of regions(pale, 1)) {
    if (pixels.length >= 30) continue;
    const around = ring(pixels);
    if (around.dark <= 0.5 && around.bean <= 0.8) for (const i of pixels) bg[i] = 1;
  }

  // Distance from the background, in pixels, up to 4.
  const depth = new Uint8Array(n);
  depth.fill(255);
  let frontier = [];
  for (let i = 0; i < n; i++) if (bg[i]) (depth[i] = 0), frontier.push(i);
  for (let d = 1; d <= 4; d++) {
    const next = [];
    for (const i of frontier) {
      for (const j of neighbours(i)) {
        if (depth[j] === 255) {
          depth[j] = d;
          next.push(j);
        }
      }
    }
    frontier = next;
  }

  const out = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    if (bg[i]) continue;
    let [r, g, b] = at(i);
    let alpha = 255;
    if (depth[i] <= 3) {
      // The nearest solid art pixel gives the true color of this edge.
      let solid = -1;
      let best = Infinity;
      const x = i % w;
      const y = (i / w) | 0;
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx;
          if (depth[j] <= 3) continue;
          const score = dx * dx + dy * dy;
          if (score < best) (best = score), (solid = j);
        }
      }
      if (solid >= 0) {
        const [fr, fg, fb] = at(solid);
        const span = dist2(fr, fg, fb, ...paper);
        const along = (r - paper[0]) * (fr - paper[0]) + (g - paper[1]) * (fg - paper[1]) + (b - paper[2]) * (fb - paper[2]);
        const a = span > 0 ? Math.min(1, Math.max(0, along / span)) : 1;
        alpha = Math.round(a * 255);
        [r, g, b] = [fr, fg, fb];
      }
    }
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = alpha;
  }
  if (soil) {
    const from = rgb(soil.from);
    const to = rgb(C.soil);
    const [top, bottom] = soil.band ?? [0, h];
    for (let y = top; y < bottom; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (!out[i + 3] || dist2(out[i], out[i + 1], out[i + 2], ...from) >= 30 ** 2) continue;
        for (let c = 0; c < 3; c++) out[i + c] = Math.min(255, Math.max(0, out[i + c] + to[c] - from[c]));
      }
    }
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } }).png();
}

/** Writes a web copy, lowering quality only if it would pass the size limit. */
async function writeWeb(input, width, height, format, file) {
  const settings = {
    avif: (q) => ({ quality: q, effort: 7, chromaSubsampling: "4:4:4" }),
    webp: (q) => ({ quality: q, alphaQuality: 90, effort: 6, smartSubsample: true }),
  };
  for (let q = format === "avif" ? 74 : 90; q >= 30; q -= 4) {
    const buffer = await sharp(input).resize(width, height).toFormat(format, settings[format](q)).toBuffer();
    if (buffer.length < MAX_BYTES) {
      writeFileSync(file, buffer);
      return { bytes: buffer.length, q };
    }
  }
  throw new Error(`${file} stays over ${MAX_BYTES} bytes at the lowest quality`);
}

mkdirSync(webDir, { recursive: true });

const all = [
  ...Object.entries(generated).map(([name, pose]) => ({ name, ...pose, kind: "generated" })),
  ...Object.entries(coded).map(([name, pose]) => ({ name, ...pose, kind: "code" })),
];
const only = process.argv.slice(2);
const rows = [];

for (const pose of all) {
  if (only.length && !only.includes(pose.name)) continue;
  const source = join(srcDir, `${pose.name}.png`);
  const w2 = pose.width * 2;
  const h2 = pose.height * 2;

  if (pose.kind === "generated") {
    const cut = await cutOut(join(rawDir, `${pose.name}.png`), pose);
    const art = await cut.toBuffer();
    await sharp(art)
      .resize(w2, h2, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: "lanczos3" })
      .png({ compressionLevel: 9 })
      .toFile(source);
  } else {
    await sharp(Buffer.from(pose.draw(pose.width, pose.height)))
      .png({ compressionLevel: 9 })
      .toFile(source);
  }

  for (const [scale, width, height] of [
    ["1x", pose.width, pose.height],
    ["2x", w2, h2],
  ]) {
    for (const format of ["avif", "webp"]) {
      const file = join(webDir, `${pose.name}@${scale}.${format}`);
      const { bytes, q } = await writeWeb(source, width, height, format, file);
      rows.push({ file: `${pose.name}@${scale}.${format}`, kb: (bytes / 1024).toFixed(1), q });
    }
  }
}

// Email clients don't all show AVIF or WebP, so the header also ships as a PNG.
if (!only.length || only.includes("email-header")) {
  const file = join(webDir, "email-header.png");
  await sharp(join(srcDir, "email-header.png"))
    .png({ palette: true, colours: 128, compressionLevel: 9, effort: 10 })
    .toFile(file);
  rows.push({ file: "email-header.png", kb: (statSync(file).size / 1024).toFixed(1), q: "-" });
}

console.table(rows);
const over = rows.filter((r) => Number(r.kb) >= 60);
if (over.length) {
  console.error(`Over 60 KB: ${over.map((r) => r.file).join(", ")}`);
  process.exit(1);
}

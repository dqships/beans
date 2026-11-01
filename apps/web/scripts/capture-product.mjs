// Remakes apps/web/public/product/* from the real planner on sample data.
//
//   pnpm --filter @beans/web exec next dev --port 3103     (in one terminal)
//   CAPTURE_URL=http://localhost:3103 pnpm --filter @beans/web capture
//
// The clock is frozen, so the board always shows the same morning. Tasks are
// dragged onto the Timebox the way a person would. Each screen is taken at 2x
// and written as @2x and @1x, in AVIF and WebP. PNG sources go to CAPTURE_RAW
// when it is set, for reviewing the shots.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "@playwright/test";
import sharp from "sharp";

const base = process.env.CAPTURE_URL ?? "http://localhost:3103";
const rawDir = process.env.CAPTURE_RAW;
const outDir = resolve(dirname(fileURLToPath(import.meta.url)), "../public/product");

// A Tuesday morning: the leaf sits at 10:40, with the first block behind it.
const NOW = new Date("2026-11-03T10:40:00");
const TODAY = "2026-11-03";
const HOUR = 80; // --layout-hour

const shots = [
  { name: "board", width: 1200, height: 750, viewport: { width: 1200, height: 750 }, prepare: fillTimebox },
  // Under the phone breakpoint, the Timebox tab fills the window. Its tab bar is cropped off.
  { name: "timebox", width: 560, height: 700, viewport: { width: 560, height: 764 }, start: { width: 1200, height: 750 }, prepare: fillPhoneTimebox },
  { name: "phone", width: 390, height: 844, viewport: { width: 390, height: 844 }, phone: true },
];

/** A real drag, with enough mouse moves for dnd-kit to notice. */
async function drag(page, source, x, y) {
  const from = await source.boundingBox();
  if (!from) throw new Error("Drag source isn't visible");
  const startX = from.x + from.width / 2;
  const startY = from.y + Math.min(from.height / 2, 14);
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 8, startY + 8, { steps: 4 });
  await page.mouse.move(x, y, { steps: 20 });
  await page.mouse.move(x, y + 1, { steps: 2 });
  await page.waitForTimeout(100);
  await page.mouse.up();
  await page.waitForTimeout(250);
}

function card(page, title) {
  return page.locator("[data-task-id]").filter({ hasText: title }).first();
}

/** Scrolls the Timebox so the hour sits near the top, and returns the screen spot for that hour. */
async function hourSpot(grid, hour) {
  await grid.evaluate((el, top) => el.closest("[class*=scroll]")?.scrollTo(0, top), (hour - 1) * HOUR);
  const box = await grid.boundingBox();
  return { x: box.x + box.width / 2, y: box.y + hour * HOUR + 4 };
}

async function plant(page, grid, title, hour) {
  const { x, y } = await hourSpot(grid, hour);
  await drag(page, card(page, title), x, y);
}

async function fillTimebox(page) {
  const grid = page.locator(`[data-timebox="${TODAY}"]`).first();
  await plant(page, grid, "Morning walk", 8);
  await plant(page, grid, "Review launch plan", 10);
  await plant(page, grid, "Water the seedlings", 12);
  await hourSpot(grid, 8);
}

/** The phone layout has no task list beside the Timebox, so tasks are planted at desktop width first. */
async function fillPhoneTimebox(page, shot) {
  await fillTimebox(page);
  await page.setViewportSize(shot.viewport);
  await page.getByRole("navigation", { name: "Sections" }).getByRole("button", { name: "Timebox" }).click();
  const grid = page.locator(`[data-timebox="${TODAY}"]`).first();
  await grid.waitFor();
  await hourSpot(grid, 8);
}

async function capture(browser, shot, scheme) {
  const context = await browser.newContext({
    ...(shot.phone ? { hasTouch: true, isMobile: true, userAgent: devices["Pixel 7"].userAgent } : {}),
    viewport: shot.start ?? shot.viewport,
    deviceScaleFactor: 2,
    colorScheme: scheme,
    timezoneId: "America/New_York",
    locale: "en-US",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.clock.setFixedTime(NOW);
  await page.goto(`${base}/app?sample`);
  await page
    .getByRole("region", { name: "Days" })
    .or(page.getByRole("navigation", { name: "Sections" }))
    .waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await shot.prepare?.(page, shot);
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: shot.width, height: shot.height } });
  await context.close();
  return png;
}

async function write(png, name) {
  if (rawDir) {
    mkdirSync(rawDir, { recursive: true });
    writeFileSync(join(rawDir, `${name}.png`), png);
  }
  const { width } = await sharp(png).metadata();
  for (const scale of [2, 1]) {
    const image = sharp(png).resize({ width: Math.round((width * scale) / 2) });
    await image.clone().avif({ quality: 58, effort: 7 }).toFile(join(outDir, `${name}@${scale}x.avif`));
    await image.clone().webp({ quality: 80, effort: 6 }).toFile(join(outDir, `${name}@${scale}x.webp`));
  }
  console.log(`Wrote ${name}`);
}

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
try {
  for (const shot of shots) {
    for (const scheme of ["light", "dark"]) {
      await write(await capture(browser, shot, scheme), `${shot.name}-${scheme}`);
    }
  }
} finally {
  await browser.close();
}

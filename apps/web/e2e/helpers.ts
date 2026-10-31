import { expect, type Locator, type Page } from "@playwright/test";

/** Opens the planner on sample data (development builds only). */
export async function openPlanner(page: Page) {
  await page.goto("/?sample");
  await expect(page.getByRole("region", { name: "Days" }).or(page.getByRole("navigation", { name: "Sections" }))).toBeVisible();
}

/** Drags with real mouse moves, the way a person would, so dnd-kit sees it. */
export async function drag(page: Page, source: Locator, target: Locator, opts: { targetY?: number; targetX?: number } = {}) {
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error("Drag source or target isn't visible");
  const startX = from.x + from.width / 2;
  const startY = from.y + Math.min(from.height / 2, 14);
  const endX = to.x + (opts.targetX ?? to.width / 2);
  const endY = to.y + (opts.targetY ?? to.height / 2);
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 8, startY + 8, { steps: 4 });
  await page.mouse.move(endX, endY, { steps: 20 });
  await page.mouse.move(endX, endY + 1, { steps: 2 });
  await page.waitForTimeout(100);
  await page.mouse.up();
}

export function day(page: Page, date: string) {
  return page.locator(`[data-day="${date}"]`);
}

export function card(scope: Page | Locator, title: string) {
  return scope.locator("[data-task-id]").filter({ hasText: title }).first();
}

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDaysKey(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/** Signs in with the local test sign-in as a fresh user, so tests don't share data. */
export async function signIn(page: Page, name = `Tester ${Math.random().toString(36).slice(2, 8)}`) {
  await page.goto("/sign-in");
  const input = page.getByLabel("Your name");
  await expect(input).toBeEditable();
  await expect(async () => {
    await input.fill(name);
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled({ timeout: 500 });
  }).toPass();
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("region", { name: "Days" })).toBeVisible({ timeout: 20_000 });
  return name;
}

import { expect, test } from "@playwright/test";
import { addDaysKey, card, day, drag, signIn, todayKey } from "./helpers";

// These run against the local Convex backend with the test sign-in.

test("signed-out visitors land on sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Welcome back to Beans" })).toBeVisible();
});

test("a new account starts empty and saves tasks", async ({ page }) => {
  await signIn(page);
  await expect(page.getByText("Spill the beans")).toBeVisible();
  const today = day(page, todayKey());
  await today.getByRole("button", { name: "Add a task" }).click();
  await today.getByRole("textbox", { name: "Task title" }).fill("Saved for real");
  await today.getByRole("textbox", { name: "Task title" }).press("Enter");
  await expect(card(today, "Saved for real")).toBeVisible();
  await page.reload();
  await expect(card(day(page, todayKey()), "Saved for real")).toBeVisible({ timeout: 15_000 });
});

test("changes appear live in a second window", async ({ browser }) => {
  const name = `Live ${Math.random().toString(36).slice(2, 8)}`;
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  await signIn(a, name);
  await signIn(b, name);

  // Create in A, see it in B.
  const todayA = day(a, todayKey());
  await todayA.getByRole("button", { name: "Add a task" }).click();
  await todayA.getByRole("textbox", { name: "Task title" }).fill("Shared bean");
  await todayA.getByRole("textbox", { name: "Task title" }).press("Enter");
  await todayA.getByRole("textbox", { name: "Task title" }).press("Escape");
  await expect(card(day(b, todayKey()), "Shared bean")).toBeVisible();

  // Check off in B, see it in A.
  await card(day(b, todayKey()), "Shared bean").getByRole("checkbox").click();
  await expect(card(day(a, todayKey()), "Shared bean").getByRole("checkbox")).toHaveAttribute("aria-checked", "true");

  // Drag to tomorrow in A, see it move in B.
  const tomorrow = addDaysKey(todayKey(), 1);
  await drag(a, card(day(a, todayKey()), "Shared bean"), day(a, tomorrow).locator("[data-drop]"));
  await expect(card(day(b, tomorrow), "Shared bean")).toBeVisible();
  await expect(card(day(b, todayKey()), "Shared bean")).toHaveCount(0);

  // Settings sync too.
  await a.keyboard.press("Control+,");
  await a.getByRole("dialog", { name: "Settings" }).getByRole("radio", { name: "Dark" }).click();
  await expect(b.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("dragging, reordering and checking off feel instant and persist", async ({ page }) => {
  await signIn(page);
  const today = day(page, todayKey());
  await today.getByRole("button", { name: "Add a task" }).click();
  const input = today.getByRole("textbox", { name: "Task title" });
  for (const t of ["Third", "Second", "First"]) {
    await input.fill(t);
    await input.press("Enter");
  }
  await input.press("Escape");
  await expect(today.locator("[data-task-id]")).toHaveText([/First/, /Second/, /Third/]);

  await drag(page, card(today, "Third"), card(today, "First"), { targetY: 4 });
  await expect(today.locator("[data-task-id]")).toHaveText([/Third/, /First/, /Second/]);

  const grid = page.locator(`[data-timebox="${todayKey()}"]`).first();
  await grid.evaluate((el) => el.closest("[class*=scroll]")?.scrollTo(0, 0));
  await drag(page, card(today, "Second"), grid, { targetY: 80 * 2 + 5 });
  await expect(page.getByRole("button", { name: /Second, 2:00am/ })).toBeVisible();

  await card(today, "First").getByRole("checkbox").click();
  await expect(card(today, "First").getByRole("checkbox")).toHaveAttribute("aria-checked", "true");

  await page.reload();
  const after = day(page, todayKey());
  await expect(after.locator("[data-task-id]")).toHaveText([/Second/, /Third/, /First/], { timeout: 15_000 });
  await expect(card(after, "First").getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
});

test("labels, lists, repeats and Trash are saved", async ({ page }) => {
  await signIn(page);
  await page.keyboard.press("Control+,");
  const settings = page.getByRole("dialog", { name: "Settings" });
  await settings.getByRole("button", { name: "Labels" }).click();
  await settings.getByRole("textbox", { name: "New label name" }).fill("Deep work");
  await settings.getByRole("button", { name: "Add label" }).click();
  await page.keyboard.press("Escape");

  await page.keyboard.press("q");
  await page.getByRole("textbox", { name: "Quick Capture" }).fill("Write the plan today #deep work =45m");
  await page.keyboard.press("Enter");
  const c = card(day(page, todayKey()), "Write the plan");
  await expect(c).toContainText("Deep work");

  await c.click();
  await page.getByRole("dialog", { name: "Task details" }).getByRole("button", { name: "Doesn't repeat" }).click();
  await page.getByRole("menuitemradio", { name: "Every day" }).click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(card(day(page, addDaysKey(todayKey(), 1)), "Write the plan")).toBeVisible({ timeout: 15_000 });

  await card(day(page, addDaysKey(todayKey(), 1)), "Write the plan").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.reload();
  await expect(card(day(page, todayKey()), "Write the plan")).toBeVisible({ timeout: 15_000 });
  await expect(card(day(page, addDaysKey(todayKey(), 1)), "Write the plan")).toHaveCount(0);
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: /Trash/ }).click();
  await expect(page.getByRole("dialog", { name: "Trash" })).toContainText("Write the plan");
});

test("signing out returns to sign-in", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
});

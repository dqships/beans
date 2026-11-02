import { expect, test } from "@playwright/test";
import { addDaysKey, card, day, drag, openPlanner, todayKey } from "./helpers";

test.beforeEach(async ({ page }) => {
  await openPlanner(page);
});

test("adds tasks with the composer and keeps it open", async ({ page }) => {
  const today = day(page, todayKey());
  await today.getByRole("button", { name: "Add a task" }).click();
  const input = today.getByRole("textbox", { name: "Task title" });
  await input.fill("Buy compost");
  await input.press("Enter");
  await expect(input).toBeFocused();
  await input.fill("Fix the gate");
  await input.press("Enter");
  await input.press("Escape");
  const titles = await today.locator("[data-task-id]").allInnerTexts();
  // New tasks go under timeboxed ones, at the top of the rest.
  expect(titles.findIndex((t) => t.includes("Fix the gate"))).toBeLessThan(titles.findIndex((t) => t.includes("Buy compost")));
  expect(titles.findIndex((t) => t.includes("Buy compost"))).toBeLessThan(titles.findIndex((t) => t.includes("Review launch plan")));
});

test("checks off a task with the bean and undoes it", async ({ page }) => {
  const c = card(page, "Water the seedlings");
  await c.getByRole("checkbox").click();
  await expect(c.getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(card(page, "Water the seedlings").getByRole("checkbox")).toHaveAttribute("aria-checked", "false");
});

test("drags a task from the Brain Dump onto today", async ({ page }) => {
  const target = day(page, todayKey()).locator("[data-drop]");
  await drag(page, card(page, "Book a dentist appointment"), target, { targetY: 10 });
  await expect(card(day(page, todayKey()), "Book a dentist appointment")).toBeVisible();
  await expect(card(page.getByRole("complementary", { name: "Sidebar" }), "Book a dentist appointment")).toHaveCount(0);
});

test("drags a task to another day", async ({ page }) => {
  const tomorrow = addDaysKey(todayKey(), 1);
  await drag(page, card(day(page, todayKey()), "Water the seedlings"), day(page, tomorrow).locator("[data-drop]"));
  await expect(card(day(page, tomorrow), "Water the seedlings")).toBeVisible();
});

test("reorders tasks inside a day", async ({ page }) => {
  const today = day(page, todayKey());
  const before = await today.locator("[data-task-id]").allInnerTexts();
  expect(before.findIndex((t) => t.includes("Review launch plan"))).toBeLessThan(before.findIndex((t) => t.includes("Water the seedlings")));
  await drag(page, card(today, "Water the seedlings"), card(today, "Review launch plan"), { targetY: 4 });
  await expect
    .poll(async () => {
      const after = await today.locator("[data-task-id]").allInnerTexts();
      return after.findIndex((t) => t.includes("Water the seedlings")) < after.findIndex((t) => t.includes("Review launch plan"));
    })
    .toBe(true);
});

test("drags a task onto the Timebox and gets a time", async ({ page }) => {
  const grid = page.locator(`[data-timebox="${todayKey()}"]`).first();
  await grid.evaluate((el) => el.closest("[class*=scroll]")?.scrollTo(0, 0));
  // Each hour is 80px at 100% zoom; drop at about 2:00am.
  await drag(page, card(day(page, todayKey()), "Water the seedlings"), grid, { targetY: 160 });
  const block = page.getByRole("button", { name: /Water the seedlings, \d/ });
  await expect(block).toBeVisible();
  await expect(card(day(page, todayKey()), "Water the seedlings")).toContainText(/\d{1,2}:\d{2}(am|pm)/);
});

test("drags a task back from the Timebox to clear its time", async ({ page }) => {
  const grid = page.locator(`[data-timebox="${todayKey()}"]`).first();
  await grid.evaluate((el) => el.closest("[class*=scroll]")?.scrollTo(0, 9 * 80 - 40));
  const block = page.getByRole("button", { name: /Write the weekly update, / });
  await expect(block).toBeVisible();
  await drag(page, block, day(page, addDaysKey(todayKey(), 1)).locator("[data-drop]"));
  const moved = card(day(page, addDaysKey(todayKey(), 1)), "Write the weekly update");
  await expect(moved).toBeVisible();
  await expect(moved).not.toContainText("9:00am");
});

test("selects several tasks and moves them together", async ({ page }) => {
  await card(page, "Book a dentist appointment").click({ modifiers: ["Shift"] });
  await card(page, "Find a birthday gift for Sam").click({ modifiers: ["Shift"] });
  await expect(page.getByRole("toolbar", { name: "Selected tasks" })).toContainText("2 selected");
  await page.getByRole("toolbar", { name: "Selected tasks" }).getByRole("button", { name: "Done" }).click();
  await expect(card(page, "Book a dentist appointment").getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
  await expect(card(page, "Find a birthday gift for Sam").getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
});

test("deletes from the context menu, finds it in Trash and restores it", async ({ page }) => {
  await card(page, "Look into a standing desk").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(card(page, "Look into a standing desk")).toHaveCount(0);
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: /Trash/ }).click();
  const drawer = page.getByRole("dialog", { name: "Trash" });
  await expect(drawer).toContainText("Look into a standing desk");
  await expect(drawer).toContainText("30 days left");
  await drawer.getByRole("button", { name: "Restore to today" }).click();
  await page.keyboard.press("Escape");
  await expect(card(day(page, todayKey()), "Look into a standing desk")).toBeVisible();
});

test("filters by label and hides completed", async ({ page }) => {
  await page.getByRole("button", { name: "Filter" }).click();
  await page.getByRole("menuitemcheckbox", { name: "Work" }).click();
  await page.keyboard.press("Escape");
  await expect(card(page, "Water the seedlings")).toHaveCount(0);
  await expect(card(page, "Review launch plan")).toBeVisible();
  await page.getByRole("button", { name: "Filter" }).click();
  await page.getByRole("button", { name: "Clear label filter" }).or(page.getByRole("menuitem", { name: "Clear label filter" })).click();
  await page.getByRole("switch", { name: "Show completed" }).click();
  await page.keyboard.press("Escape");
  await expect(card(page, "Morning walk")).toHaveCount(0);
  await expect(card(page, "Water the seedlings")).toBeVisible();
});

test("focus mode shows only today", async ({ page }) => {
  await page.keyboard.press("Shift+F");
  await expect(page.locator("[data-day]")).toHaveCount(1);
  await expect(page.getByRole("complementary", { name: "Sidebar" })).toHaveCount(0);
  await page.getByRole("button", { name: "Leave focus" }).click();
  await expect(page.locator("[data-day]").nth(2)).toBeVisible();
});

test("the time chip opens actual and estimate with a timer", async ({ page }) => {
  const c = card(page, "Water the seedlings");
  await c.getByRole("button", { name: /^Time:/ }).click();
  await expect(c).toContainText("Estimate");
  await c.getByRole("button", { name: "Start timer" }).click();
  const pill = page.getByRole("region", { name: "Timer" });
  await expect(pill).toBeVisible();
  await expect(card(page, "Water the seedlings")).toContainText("Timer running");
  await page.waitForTimeout(1500);
  await pill.hover();
  await pill.getByRole("button", { name: "Pause" }).click();
  await expect(card(page, "Water the seedlings")).toContainText("Timer paused");
  await pill.getByRole("button", { name: "Stop timer" }).click();
  await expect(pill).toHaveCount(0);
});

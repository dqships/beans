import { expect, test } from "@playwright/test";
import { addDaysKey, card, day, drag, openPlanner, todayKey } from "./helpers";

test.beforeEach(async ({ page }) => {
  await openPlanner(page);
});

test("calendar view: week, day, month and click to create", async ({ page }) => {
  await page.getByRole("radio", { name: "Calendar" }).click();
  await expect(page.locator("[data-timebox]")).toHaveCount(7);
  await page.keyboard.press("d");
  await expect(page.locator("[data-timebox]")).toHaveCount(1);
  await page.keyboard.press("m");
  await expect(page.getByRole("button", { name: `Open ${todayKey()}` })).toBeVisible();
  await page.keyboard.press("w");
  const grid = page.locator(`[data-timebox="${todayKey()}"]`);
  await grid.evaluate((el) => el.closest("[class*=scroll]")?.scrollTo(0, 0));
  const box = await grid.boundingBox();
  await page.mouse.click(box!.x + 20, box!.y + 80 * 2 + 10);
  const draft = page.getByRole("dialog", { name: "New task" });
  await expect(draft).toContainText("2:00am");
  await draft.getByRole("textbox", { name: "Task title" }).fill("Early check");
  await draft.getByRole("button", { name: "Add task" }).click();
  await expect(page.getByRole("button", { name: /Early check, 2:00am to 2:15am/ })).toBeVisible();
});

test("calendar view: drag from the side list onto a day", async ({ page }) => {
  await page.getByRole("radio", { name: "Calendar" }).click();
  await page.keyboard.press("d");
  const grid = page.locator(`[data-timebox="${todayKey()}"]`);
  await grid.evaluate((el) => el.closest("[class*=scroll]")?.scrollTo(0, 0));
  const panel = page.getByRole("complementary", { name: "Tasks for the day" });
  await drag(page, card(panel, "Water the seedlings"), grid, { targetY: 80 * 3 + 5 });
  await expect(page.getByRole("button", { name: /Water the seedlings, 3:00am/ })).toBeVisible();
});

test("month view: drag a task onto another day", async ({ page }) => {
  await page.getByRole("radio", { name: "Calendar" }).click();
  await page.keyboard.press("m");
  const panel = page.getByRole("complementary", { name: "Tasks for the day" });
  const target = page.getByRole("button", { name: `Open ${addDaysKey(todayKey(), 1)}` }).locator("..");
  await drag(page, card(panel, "Water the seedlings"), target);
  await expect(target).toContainText("Water the seedlings");
});

test("quick capture parses and adds a task", async ({ page }) => {
  await page.keyboard.press("q");
  const input = page.getByRole("textbox", { name: "Quick Capture" });
  await input.fill("Call the vet tomorrow 3pm #side project =15m");
  const dialog = page.getByRole("dialog", { name: "Quick Capture" });
  await expect(dialog).toContainText("Call the vet");
  await expect(dialog).toContainText("Tomorrow");
  await expect(dialog).toContainText("3:00pm");
  await expect(dialog).toContainText("Side project");
  await expect(dialog).toContainText("15m");
  await input.press("Enter");
  const c = card(day(page, addDaysKey(todayKey(), 1)), "Call the vet");
  await expect(c).toContainText("Side project");
  await expect(c).toContainText("3:00pm");
  await expect(c).toContainText("0:15");
});

test("search finds tasks and opens them", async ({ page }) => {
  await page.keyboard.press("Control+k");
  await page.getByRole("combobox", { name: "Search tasks and notes" }).fill("timeline");
  await expect(page.getByRole("option")).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Task details" }).getByRole("textbox", { name: "Task title" })).toHaveValue("Review launch plan");
});

test("search with no results explains itself", async ({ page }) => {
  await page.keyboard.press("Control+k");
  await page.getByRole("combobox", { name: "Search tasks and notes" }).fill("zzzz");
  await expect(page.getByText("No tasks match")).toBeVisible();
});

test("shortcut reference opens with ?", async ({ page }) => {
  await page.keyboard.press("Shift+?");
  await expect(page.getByRole("dialog", { name: "Keyboard shortcuts" })).toContainText("Quick Capture");
});

test("keyboard moves between tasks and completes one", async ({ page }) => {
  await card(day(page, todayKey()), "Review launch plan").focus();
  await card(day(page, todayKey()), "Review launch plan").press("ArrowDown");
  await page.keyboard.press("Escape");
  await card(day(page, todayKey()), "Water the seedlings").click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("c");
  await expect(card(page, "Water the seedlings").getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
});

test("settings: theme and time format", async ({ page }) => {
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Settings" }).click();
  const settings = page.getByRole("dialog", { name: "Settings" });
  await settings.getByRole("radio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await settings.getByRole("button", { name: "Calendar" }).click();
  await settings.getByRole("radio", { name: "13:30" }).click();
  await page.keyboard.press("Escape");
  await expect(card(page, "Write the weekly update")).toContainText("09:00");
});

test("settings: labels can be added, renamed and deleted", async ({ page }) => {
  await page.keyboard.press("Control+,");
  const settings = page.getByRole("dialog", { name: "Settings" });
  await settings.getByRole("button", { name: "Labels" }).click();
  await settings.getByRole("textbox", { name: "New label name" }).fill("Errands");
  await settings.getByRole("button", { name: "Add label" }).click();
  await expect(settings.getByRole("textbox", { name: "Label name" }).last()).toHaveValue("Errands");
  await settings.getByRole("button", { name: "Delete Home" }).click();
  await page.keyboard.press("Escape");
  await expect(card(page, "Water the seedlings")).not.toContainText("Home");
});

test("pomodoro runs from task details", async ({ page }) => {
  await page.keyboard.press("Control+,");
  const settings = page.getByRole("dialog", { name: "Settings" });
  await settings.getByRole("button", { name: "Optional features" }).click();
  await settings.getByRole("switch", { name: "Pomodoro" }).click();
  await page.keyboard.press("Escape");
  await card(page, "Water the seedlings").click();
  await page.getByRole("button", { name: "Start focus session" }).click();
  await page.keyboard.press("Escape");
  const pill = page.getByRole("region", { name: "Timer" });
  await expect(pill).toContainText("Focus");
  await expect(pill).toContainText(/24:5\d|25:00/);
  await pill.hover();
  await pill.getByRole("button", { name: "Start break now" }).click();
  await expect(pill).toContainText("Break");
  await pill.getByRole("button", { name: "Skip break" }).click();
  await expect(pill).toContainText("Focus");
});

test("analytics shows finished work", async ({ page }) => {
  await card(page, "Water the seedlings").getByRole("checkbox").click();
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Analytics" }).click();
  const dialog = page.getByRole("dialog", { name: "Analytics" });
  await expect(dialog).toContainText("Time by label");
  await expect(dialog.getByRole("table")).toContainText("Water the seedlings");
  await dialog.getByRole("radio", { name: "Tasks" }).click();
  await expect(dialog).toContainText("Tasks by label");
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Download CSV" }).click();
  expect((await download).suggestedFilename()).toMatch(/^beans-completed-.*\.csv$/);
});

test("daily planning walks through four steps", async ({ page }) => {
  await page.keyboard.press("Control+Shift+P");
  const dialog = page.getByRole("dialog", { name: "Plan your day" });
  await expect(dialog).toContainText("Step 1 of 4");
  await dialog.getByRole("button", { name: "Next", exact: true }).click();
  await expect(dialog).toContainText("Choose today's work");
  await dialog.getByRole("button", { name: "Add" }).first().click();
  await dialog.getByRole("button", { name: "Next", exact: true }).click();
  await expect(dialog).toContainText("Can anything wait?");
  await dialog.getByRole("button", { name: "Tomorrow" }).first().click();
  await dialog.getByRole("button", { name: "Next", exact: true }).click();
  await expect(dialog).toContainText("Give it a shape");
  await dialog.getByRole("button", { name: "Start my day" }).click();
  await expect(dialog).toHaveCount(0);
});

test("planning asks before closing early", async ({ page }) => {
  await page.keyboard.press("Control+Shift+P");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog", { name: "Leave early?" })).toBeVisible();
  await page.getByRole("button", { name: "Leave" }).click();
  await expect(page.getByRole("dialog", { name: "Plan your day" })).toHaveCount(0);
});

test("wrap-up moves unfinished tasks to tomorrow", async ({ page }) => {
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Wrap up your day" }).click();
  const dialog = page.getByRole("dialog", { name: "Wrap up your day" });
  await dialog.getByRole("button", { name: "Next", exact: true }).click();
  await expect(dialog).toContainText("Rolling over");
  await dialog.getByRole("button", { name: "Finish the day" }).click();
  const tomorrow = day(page, addDaysKey(todayKey(), 1));
  await expect(card(tomorrow, "Water the seedlings")).toContainText("Rolled over");
  await expect(card(day(page, todayKey()), "Morning walk")).toBeVisible();
});

test("lists: create, switch, add a task with its auto label", async ({ page }) => {
  await page.getByRole("button", { name: /Brain Dump/ }).first().click();
  await page.getByRole("menuitem", { name: "New list" }).click();
  await page.getByRole("textbox", { name: "List name" }).fill("Errands");
  await page.getByRole("button", { name: "Health" }).click();
  await page.getByRole("button", { name: "Create list" }).click();
  const sidebar = page.getByRole("complementary", { name: "Sidebar" });
  await expect(sidebar).toContainText("Errands");
  await sidebar.getByRole("button", { name: "Add a task" }).click();
  await sidebar.getByRole("textbox", { name: "Task title" }).fill("Pick up a prescription");
  await sidebar.getByRole("textbox", { name: "Task title" }).press("Enter");
  await expect(card(sidebar, "Pick up a prescription")).toContainText("Health");
});

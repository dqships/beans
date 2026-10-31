import { expect, test } from "@playwright/test";
import { addDaysKey, card, day, openPlanner, todayKey } from "./helpers";

test.beforeEach(async ({ page }) => {
  await openPlanner(page);
});

test("edits every field in task details", async ({ page }) => {
  await card(page, "Water the seedlings").click();
  const modal = page.getByRole("dialog", { name: "Task details" });
  await expect(modal).toBeVisible();

  // Title
  const title = modal.getByRole("textbox", { name: "Task title" });
  await title.fill("Water the bean rows");
  await title.press("Enter");

  // Estimate, typed
  await modal.getByRole("button", { name: "10m" }).click();
  await page.getByRole("textbox", { name: "Estimate" }).fill("1h 30m");
  await page.getByRole("textbox", { name: "Estimate" }).press("Enter");
  await expect(modal.getByRole("button", { name: "1h 30m" })).toBeVisible();

  // Actual time
  await modal.getByRole("button", { name: "Click to edit" }).click();
  await page.getByRole("textbox", { name: "Actual time" }).fill("20m");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(modal.getByRole("button", { name: "20m" })).toBeVisible();

  // Time
  await modal.getByRole("button", { name: "Add a time" }).click();
  await page.getByRole("textbox", { name: "Time" }).fill("4:15pm");
  await page.getByRole("textbox", { name: "Time" }).press("Enter");
  await expect(modal.getByRole("button", { name: /Today, 4:15pm/ })).toBeVisible();

  // Label, creating a new one with a space in it
  await modal.getByRole("button", { name: "Home" }).click();
  await page.getByRole("textbox", { name: "Find or create a label" }).fill("Deep work");
  await page.getByRole("menuitem", { name: "Create “Deep work”" }).click();
  await page.getByRole("radio", { name: "plum" }).click();
  await expect(modal.getByRole("button", { name: "Deep work" })).toBeVisible();

  // Notes with formatting
  const notes = modal.getByRole("textbox", { name: "Notes" });
  await notes.click();
  await page.keyboard.type("Use the rain barrel");
  await page.keyboard.press("Shift+Home");
  await page.getByRole("button", { name: "Bold" }).click();
  await expect(notes.locator("strong")).toHaveText("Use the rain barrel");

  // Subtasks: Enter adds the next one
  await modal.getByRole("button", { name: "Add subtask" }).click();
  const sub = modal.getByRole("textbox", { name: "New subtask" });
  await sub.fill("Fill the can");
  await sub.press("Enter");
  await sub.fill("Check the soil");
  await sub.press("Enter");
  await sub.press("Escape");
  await expect(modal.getByRole("textbox", { name: "Subtask" })).toHaveCount(2);

  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  const c = card(page, "Water the bean rows");
  await expect(c).toContainText("4:15pm");
  await expect(c).toContainText("Deep work");
  await expect(c).toContainText("0/2");
  await expect(c).toContainText("0:20 / 1:30");
});

test("moves a task to a day and into a list from details", async ({ page }) => {
  await card(page, "Water the seedlings").click();
  const modal = page.getByRole("dialog", { name: "Task details" });
  await modal.getByRole("button", { name: "Today" }).click();
  await page.getByRole("menuitemradio", { name: "Tomorrow" }).click();
  await expect(modal.getByRole("button", { name: "Tomorrow" })).toBeVisible();
  await modal.getByRole("button", { name: "Move to a list" }).click();
  await page.getByRole("menuitem", { name: /Reading/ }).click();
  await expect(modal.getByRole("button", { name: /Reading/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(card(day(page, addDaysKey(todayKey(), 1)), "Water the seedlings")).toHaveCount(0);
});

test("repeats a task, then stops it without leaving the repeat icon", async ({ page }) => {
  await card(page, "Water the seedlings").click();
  const modal = page.getByRole("dialog", { name: "Task details" });
  await modal.getByRole("button", { name: "Doesn't repeat" }).click();
  await page.getByRole("menuitemradio", { name: "Every day" }).click();
  await expect(modal.getByRole("button", { name: "Every day" })).toBeVisible();
  await page.keyboard.press("Escape");
  const tomorrow = day(page, addDaysKey(todayKey(), 1));
  await expect(card(tomorrow, "Water the seedlings")).toBeVisible();
  await expect(card(day(page, todayKey()), "Water the seedlings").getByLabel("Repeats")).toBeVisible();

  await card(day(page, todayKey()), "Water the seedlings").click();
  await modal.getByRole("button", { name: "Every day" }).click();
  await page.getByRole("menuitem", { name: "Stop repeating" }).click();
  await expect(modal.getByRole("button", { name: "Doesn't repeat" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(card(day(page, todayKey()), "Water the seedlings").getByLabel("Repeats")).toHaveCount(0);
  await expect(card(tomorrow, "Water the seedlings")).toHaveCount(0);
});

test("custom repeat rule", async ({ page }) => {
  await card(page, "Water the seedlings").click();
  await page.getByRole("dialog", { name: "Task details" }).getByRole("button", { name: "Doesn't repeat" }).click();
  await page.getByRole("menuitem", { name: "Custom…" }).click();
  await page.getByRole("spinbutton", { name: "Interval" }).fill("2");
  await page.getByRole("combobox", { name: "Frequency" }).selectOption("WEEKLY");
  await page.getByRole("button", { name: "Monday" }).click();
  await page.getByRole("button", { name: "Repeat", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Task details" }).getByRole("button", { name: /Every 2 weeks on/ })).toBeVisible();
});

test("optional features add due date and priority", async ({ page }) => {
  await page.keyboard.press("Control+,");
  const settings = page.getByRole("dialog", { name: "Settings" });
  await settings.getByRole("button", { name: "Optional features" }).click();
  await settings.getByRole("switch", { name: "Due dates" }).click();
  await settings.getByRole("switch", { name: "Priority" }).click();
  await settings.getByRole("switch", { name: "Templates" }).click();
  await page.keyboard.press("Escape");

  await card(page, "Water the seedlings").click();
  const modal = page.getByRole("dialog", { name: "Task details" });
  await modal.getByRole("button", { name: "Click to add" }).first().click();
  await page.getByRole("menuitemradio", { name: "Tomorrow" }).click();
  await expect(modal.getByRole("button", { name: "Due Tomorrow" })).toBeVisible();
  await modal.locator("button", { hasText: "Click to add" }).first().click();
  await page.getByRole("menuitemradio", { name: "High" }).click();
  await expect(modal.getByRole("button", { name: "High" })).toBeVisible();
  await modal.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("menuitem", { name: "Save as template" }).click();
  await page.keyboard.press("Escape");
  await expect(card(page, "Water the seedlings")).toContainText("Due Tomorrow");

  // The template shows in the sidebar and drags onto a day.
  await page.getByRole("tab", { name: "Templates" }).click();
  await expect(page.getByRole("button", { name: /Template: Water the seedlings/ })).toBeVisible();
  // Due dates tab lists it
  await page.getByRole("tab", { name: "Due dates" }).click();
  await expect(page.getByRole("complementary", { name: "Sidebar" })).toContainText("Water the seedlings");
});

test("deletes from details with the keyboard", async ({ page }) => {
  await card(page, "Water the seedlings").click();
  await page.getByRole("dialog", { name: "Task details" }).getByRole("textbox", { name: "Task title" }).focus();
  await page.keyboard.press("Control+Backspace");
  await expect(page.getByRole("dialog", { name: "Task details" })).toHaveCount(0);
  await expect(card(page, "Water the seedlings")).toHaveCount(0);
});

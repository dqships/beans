import { expect, test } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import { addDaysKey, card, day, drag, openPlanner, signIn, todayKey } from "./helpers";

test("rollover moves yesterday's unfinished task to today with a tag", async ({ page, baseURL }) => {
  const name = await signIn(page);
  const yesterday = addDaysKey(todayKey(), -1);
  // Make a task on yesterday through the UI.
  const today = day(page, todayKey());
  await today.getByRole("button", { name: "Add a task" }).click();
  await today.getByRole("textbox", { name: "Task title" }).fill("Left over");
  await today.getByRole("textbox", { name: "Task title" }).press("Enter");
  await today.getByRole("textbox", { name: "Task title" }).press("Escape");
  await card(today, "Left over").click();
  await page.getByRole("dialog", { name: "Task details" }).getByRole("button", { name: "Today" }).click();
  await page.getByRole("button", { name: yesterday, exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(card(day(page, yesterday), "Left over")).toBeVisible();

  // Pretend today's rollover hasn't run yet, as if the day just changed.
  const res = await fetch(`${baseURL}/api/test-auth/token`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ user: name }) });
  const { token } = (await res.json()) as { token: string };
  const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL ?? "http://127.0.0.1:3210");
  client.setAuth(token);
  await client.mutation("planner:apply" as never, { ops: [{ kind: "settings", fields: { lastRollover: yesterday } }] } as never);

  await page.reload();
  const moved = card(day(page, todayKey()), "Left over");
  await expect(moved).toBeVisible({ timeout: 15_000 });
  await expect(moved).toContainText("Rolled over");
  await expect(card(day(page, yesterday), "Left over")).toHaveCount(0);
});

test.describe("on sample data", () => {
  test.beforeEach(async ({ page }) => openPlanner(page));

  test("checking off fills actual time from the estimate", async ({ page }) => {
    const c = card(page, "Water the seedlings");
    await expect(c.getByRole("button", { name: /^Time:/ })).toHaveText("0:10");
    await c.getByRole("checkbox").click();
    await expect(card(page, "Water the seedlings").getByRole("button", { name: /^Time:/ })).toHaveText("0:10 / 0:10");
  });

  test("a day over the workload limit is flagged", async ({ page }) => {
    const today = day(page, todayKey());
    await expect(today.getByTitle("Planned time")).toBeVisible();
    await card(today, "Water the seedlings").click();
    await page.getByRole("dialog", { name: "Task details" }).getByRole("button", { name: "10m" }).click();
    await page.getByRole("textbox", { name: "Estimate" }).fill("8h");
    await page.getByRole("textbox", { name: "Estimate" }).press("Enter");
    await page.keyboard.press("Escape");
    await expect(today.getByTitle("More than your daily limit")).toBeVisible();
  });

  test("deleting offers undo", async ({ page }) => {
    await card(page, "Water the seedlings").click({ button: "right" });
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await expect(card(page, "Water the seedlings")).toHaveCount(0);
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(card(page, "Water the seedlings")).toBeVisible();
  });

  test("a template dragged onto a day makes a task with its subtasks", async ({ page }) => {
    await page.keyboard.press("Control+,");
    const settings = page.getByRole("dialog", { name: "Settings" });
    await settings.getByRole("button", { name: "Optional features" }).click();
    await settings.getByRole("switch", { name: "Templates" }).click();
    await page.keyboard.press("Escape");
    await page.getByRole("tab", { name: "Templates" }).click();
    await page.getByRole("button", { name: "New template" }).click();
    const editor = page.getByRole("dialog", { name: "New template" });
    await editor.getByRole("textbox", { name: "Template name" }).fill("Weekly review");
    await editor.getByRole("button", { name: "Add subtask" }).click();
    await editor.getByRole("textbox", { name: "Subtask 1" }).fill("Clear inbox");
    await editor.getByRole("button", { name: "Create template" }).click();
    const tomorrow = addDaysKey(todayKey(), 1);
    await drag(page, page.getByRole("button", { name: /Template: Weekly review/ }), day(page, tomorrow).locator("[data-drop]"));
    const made = card(day(page, tomorrow), "Weekly review");
    await expect(made).toBeVisible();
    await expect(made).toContainText("0/1");
  });

  test("timebox past midnight warns", async ({ page }) => {
    await card(page, "Write the weekly update").click();
    const modal = page.getByRole("dialog", { name: "Task details" });
    await modal.getByRole("button", { name: "Change time" }).click();
    await page.getByRole("textbox", { name: "Time" }).fill("11:30pm");
    await page.getByRole("textbox", { name: "Time" }).press("Enter");
    await modal.getByRole("button", { name: "30m" }).click();
    await page.getByRole("textbox", { name: "Estimate" }).fill("2h");
    await page.getByRole("textbox", { name: "Estimate" }).press("Enter");
    await expect(modal).toContainText("Runs past midnight");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: /Write the weekly update, 11:30pm/ })).toContainText("runs past midnight");
  });
});

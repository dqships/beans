import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { defaultSettings } from "@beans/core";
import { addDaysKey, card, day, drag, openPlanner, signIn, signInOnly, testUser, todayKey } from "./helpers";

// These run against the local Convex backend with the test sign-in, apart from the sample test.

const heading = (page: Page, name: string | RegExp) => page.getByRole("heading", { level: 1, name });
const firstStep = "What do you plan around?";
const button = (page: Page, name: string, exact = true) => page.getByRole("button", { name, exact });

async function startOnboarding(page: Page, name = testUser()) {
  await signInOnly(page, name);
  await expect(heading(page, firstStep)).toBeVisible({ timeout: 20_000 });
  return name;
}

async function addTask(page: Page, title: string) {
  await page.getByRole("textbox", { name: "Add a task" }).fill(title);
  await page.getByRole("textbox", { name: "Add a task" }).press("Enter");
  await expect(page.getByRole("region", { name: "Brain Dump" })).toContainText(title);
}

/** Runs the first two steps and stops on the third. */
async function reachChooseStep(page: Page, tasks: string[]) {
  await page.getByRole("checkbox", { name: "Health" }).click();
  await button(page, "Continue").click();
  await expect(heading(page, /Spill the beans/)).toBeVisible();
  for (const title of tasks) await addTask(page, title);
  await button(page, "Continue").click();
  await expect(heading(page, /Choose what you'll get to today/)).toBeVisible();
}

test("some tasks can go to today and others to tomorrow", async ({ page }) => {
  await startOnboarding(page);
  await reachChooseStep(page, ["Call the plumber", "Renew my passport", "Clean the gutters"]);
  await page.getByRole("button", { name: "Move Call the plumber to today" }).click();
  await page.getByRole("button", { name: "Move Renew my passport to tomorrow" }).click();
  await expect(page.getByRole("region", { name: "Today" })).toContainText("Call the plumber");
  await expect(page.getByRole("region", { name: "Tomorrow" })).toContainText("Renew my passport");
  await expect(page.getByRole("region", { name: "Brain Dump" })).toContainText("Clean the gutters");

  // A task sent back can go to the other day.
  await page.getByRole("button", { name: "Move Renew my passport back to the Brain Dump" }).click();
  await page.getByRole("button", { name: "Move Renew my passport to today" }).click();
  await page.getByRole("button", { name: "Move Clean the gutters to tomorrow" }).click();
  await expect(page.getByRole("region", { name: "Today" })).toContainText("Renew my passport");

  // The Timebox step plans today, which has tasks; the last step sums up both days.
  await button(page, "Continue").click();
  await button(page, "Skip this step").click();
  await expect(heading(page, "Your day is planned.")).toBeVisible();
  await expect(page.getByRole("main")).toContainText("2 tasks for today");
  await expect(page.getByRole("main")).toContainText("1 task for tomorrow.");
  await expect(page.getByRole("region", { name: "Tomorrow" })).toContainText("Clean the gutters");
});

test("the vine starts with sign-up done and counts setup in fifths", async ({ page }) => {
  await startOnboarding(page);
  await expect(page.getByRole("list", { name: "Setup, 20% done" })).toContainText("Sign up");
  await expect(page.getByText("20% done", { exact: true })).toBeVisible();
  await button(page, "Continue without labels").click();
  await expect(page.getByRole("list", { name: "Setup, 40% done" })).toBeVisible();
  await expect(page.getByText("40% done", { exact: true })).toBeVisible();
});

test("the first step shows task ideas for the picked parts of life", async ({ page }) => {
  await startOnboarding(page);
  const ideas = page.getByRole("region", { name: "Ideas for your Brain Dump" });
  await expect(ideas).toContainText("Pick a part of your life");
  await page.getByRole("checkbox", { name: "Health" }).click();
  await expect(ideas).toContainText("Go for a walk");
  await page.getByRole("checkbox", { name: "Money" }).click();
  await expect(ideas).toContainText("Pay the bills");
  await page.getByRole("checkbox", { name: "Health" }).click();
  await expect(ideas).not.toContainText("Go for a walk");

  // The same ideas are offered on the next step, where they can be added.
  await button(page, "Continue").click();
  await expect(page.getByRole("group", { name: "Task ideas" })).toContainText("Pay the bills");
});

test("a new account finishes onboarding on a populated planner", async ({ page }) => {
  await startOnboarding(page);
  await expect(page.getByRole("region", { name: "Days" })).toHaveCount(0);
  await expect(button(page, "Continue without labels")).toBeVisible();

  await reachChooseStep(page, ["Renew my passport", "Call the plumber"]);
  // Tomorrow, so the hours on offer don't depend on when the test runs.
  await page.getByRole("button", { name: "Move Renew my passport to tomorrow" }).click();
  await expect(page.getByRole("region", { name: "Tomorrow" })).toContainText("Renew my passport");
  await expect(page.getByRole("region", { name: "Today" })).not.toContainText("Renew my passport");
  await button(page, "Continue").click();

  await expect(heading(page, "Give your first task a time.")).toBeVisible();
  await button(page, "Skip this step").waitFor();
  await page.getByRole("button", { name: "Put Renew my passport at 9:00am" }).click();
  await button(page, "Continue").click();

  await expect(heading(page, "Tomorrow is planned.")).toBeVisible();
  await expect(page.getByRole("main")).toContainText("1 task for tomorrow, 1 with a time. 1 task is waiting in your Brain Dump.");
  await button(page, "Skip setup").waitFor({ state: "detached" });
  await button(page, "Open my planner").click();

  const check = async () => {
    await expect(page.getByRole("region", { name: "Days" })).toBeVisible({ timeout: 20_000 });
    await expect(heading(page, /./)).toHaveCount(0);
    const planned = card(day(page, addDaysKey(todayKey(), 1)), "Renew my passport");
    await expect(planned).toContainText("9:00am");
    await expect(card(page, "Call the plumber")).toBeVisible();
  };
  await check();
  // The Timebox opens on the planned day, as a block.
  await expect(page.getByRole("button", { name: /Renew my passport, 9:00am/ })).toBeVisible();
  await page.reload();
  await check();
});

test("ideas add real tasks with the label they came from", async ({ page }) => {
  await startOnboarding(page);
  await page.getByRole("checkbox", { name: "Health" }).click();
  await button(page, "Continue").click();
  await button(page, "Go for a walk").click();
  await expect(button(page, "Go for a walk")).toHaveCount(0);
  await button(page, "Skip setup").click();
  await expect(card(page, "Go for a walk")).toContainText("Health");
});

test("taking a label back removes it", async ({ page }) => {
  await startOnboarding(page);
  await page.getByRole("checkbox", { name: "Health" }).click();
  await expect(page.getByRole("checkbox", { name: "Health" })).toBeChecked();
  await page.getByRole("checkbox", { name: "Health" }).click();
  await expect(page.getByRole("checkbox", { name: "Health" })).not.toBeChecked();
  await expect(button(page, "Continue without labels")).toBeVisible();
});

test("the task step needs a task, and a removed task goes", async ({ page }) => {
  await startOnboarding(page);
  await button(page, "Continue without labels").click();
  await expect(button(page, "Continue")).toBeDisabled();
  await addTask(page, "Write it down");
  await expect(button(page, "Continue")).toBeEnabled();
  await page.getByRole("button", { name: "Remove Write it down" }).click();
  await expect(button(page, "Continue")).toBeDisabled();
});

test("a pasted list becomes one task per line", async ({ page }) => {
  await startOnboarding(page);
  await button(page, "Continue without labels").click();
  await page.getByRole("textbox", { name: "Add a task" }).evaluate((input) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData("text", "One\n\nTwo\nThree");
    input.dispatchEvent(new ClipboardEvent("paste", { clipboardData, bubbles: true, cancelable: true }));
  });
  await expect(page.getByRole("region", { name: "Brain Dump" }).getByRole("listitem")).toHaveText(["One", "Two", "Three"]);
});

test("skipping opens the planner, keeps what was added and doesn't come back", async ({ page }) => {
  await startOnboarding(page);
  await button(page, "Continue without labels").click();
  await addTask(page, "Kept after skipping");
  await button(page, "Skip setup").click();
  await expect(page.getByRole("region", { name: "Days" })).toBeVisible();
  await expect(card(page, "Kept after skipping")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: "Days" })).toBeVisible({ timeout: 20_000 });
  await expect(card(page, "Kept after skipping")).toBeVisible();
  await expect(heading(page, /./)).toHaveCount(0);
});

test("a reload and a second device stay on the same step", async ({ browser, page }) => {
  const name = await startOnboarding(page);
  await reachChooseStep(page, ["Half way there"]);
  await page.getByRole("button", { name: "Move Half way there to today" }).click();
  await page.reload();
  await expect(heading(page, /Choose what you'll get to today/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("region", { name: "Today" })).toContainText("Half way there");

  const other = await (await browser.newContext()).newPage();
  await signInOnly(other, name);
  await expect(heading(other, /Choose what you'll get to today/)).toBeVisible({ timeout: 20_000 });

  // Finishing on one device ends it on the other.
  await button(page, "Skip setup").click();
  await expect(other.getByRole("region", { name: "Days" })).toBeVisible();
});

test("Back returns to the last step with its work in place", async ({ page }) => {
  await startOnboarding(page);
  await reachChooseStep(page, ["Still here"]);
  await button(page, "Back").click();
  await expect(page.getByRole("region", { name: "Brain Dump" })).toContainText("Still here");
  await button(page, "Back").click();
  await expect(page.getByRole("checkbox", { name: "Health" })).toBeChecked();
  await expect(button(page, "Back")).toHaveCount(0);
});

test("accounts from before onboarding never see it", async ({ page }) => {
  const name = testUser();
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const { id, onboarding, ...settings } = defaultSettings("UTC");
  void id;
  void onboarding;
  const issuer = `http://localhost:${process.env.E2E_PORT ?? 3000}/api/test-auth/`;
  const folder = mkdtempSync(join(tmpdir(), "beans-existing-"));
  const file = join(folder, "settings.jsonl");
  writeFileSync(file, `${JSON.stringify({ ...settings, userId: `${issuer}|${slug}` })}\n`);
  try {
    // A settings row with no onboarding value, the way older accounts are stored.
    execFileSync("pnpm", ["exec", "convex", "import", "--table", "userSettings", "--append", "--yes", file], {
      cwd: resolve(process.cwd(), "../.."),
      env: { ...process.env, CONVEX_AGENT_MODE: "anonymous" },
      stdio: "pipe",
    });
  } finally {
    rmSync(folder, { recursive: true });
  }

  await signInOnly(page, name);
  await expect(page.getByRole("region", { name: "Days" })).toBeVisible({ timeout: 20_000 });
  await expect(heading(page, /./)).toHaveCount(0);
  await expect(page.getByText("Spill the beans")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: "Days" })).toBeVisible({ timeout: 20_000 });
  await expect(heading(page, /./)).toHaveCount(0);
});

test("sample mode opens straight to the planner", async ({ page }) => {
  await openPlanner(page);
  await expect(heading(page, firstStep)).toHaveCount(0);
  await expect(button(page, "Skip setup")).toHaveCount(0);
});

test("tasks drag onto the Timebox and back, like in the planner", async ({ page }) => {
  await startOnboarding(page);
  await reachChooseStep(page, ["Drag me to nine"]);
  // Tomorrow, so the hours on offer don't depend on when the test runs.
  await page.getByRole("button", { name: "Move Drag me to nine to tomorrow" }).click();
  await button(page, "Continue").click();
  await expect(heading(page, "Give your first task a time.")).toBeVisible();

  const task = page.getByRole("list", { name: "Task to give a time" }).getByRole("button", { name: /^Drag me to nine/ });
  await drag(page, task, button(page, "Put Drag me to nine at 9:00am"), { targetY: 4 });
  const block = page.getByRole("button", { name: /^Clear Drag me to nine 9:00am/ });
  await expect(block).toBeVisible();
  await expect(button(page, "Continue")).toBeVisible();

  // A block moves by dragging, and the drop doesn't count as a click that clears it.
  await drag(page, block, button(page, "10:00am is open"), { targetY: 4 });
  const moved = page.getByRole("button", { name: /^Clear Drag me to nine 10:00am/ });
  await expect(moved).toBeVisible();

  // Dragged back to the day, it loses its time.
  await drag(page, moved, page.locator(`[data-drop="day:${addDaysKey(todayKey(), 1)}"]`));
  await expect(page.getByRole("button", { name: /^Clear Drag me to nine/ })).toHaveCount(0);
  await expect(button(page, "Skip this step")).toBeVisible();
});

test("every step works from the keyboard", async ({ page }) => {
  await startOnboarding(page);
  await expect(heading(page, firstStep)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("checkbox", { name: "Work" })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.getByRole("checkbox", { name: "Work" })).toBeChecked();
  await button(page, "Continue").focus();
  await page.keyboard.press("Enter");

  // The Brain Dump step starts in its input.
  await expect(page.getByRole("textbox", { name: "Add a task" })).toBeFocused();
  await page.keyboard.type("Typed with no mouse");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("textbox", { name: "Add a task" })).toHaveValue("");
  await button(page, "Continue").focus();
  await page.keyboard.press("Enter");

  await expect(heading(page, /Choose what/)).toBeFocused();
  await page.getByRole("button", { name: "Move Typed with no mouse to tomorrow" }).focus();
  await page.keyboard.press("Enter");
  await button(page, "Continue").focus();
  await page.keyboard.press("Enter");

  await page.getByRole("button", { name: "Put Typed with no mouse at 10:00am" }).focus();
  await page.keyboard.press("Enter");
  await button(page, "Continue").focus();
  await page.keyboard.press("Enter");
  await button(page, "Open my planner").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: "Days" })).toBeVisible();
});

test("reduced motion swaps movement for a short fade", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await startOnboarding(page);
  const packet = page.getByRole("checkbox", { name: "Work" });
  await expect(packet).toHaveCSS("transition-property", "opacity");
  await expect(packet).toHaveCSS("transition-duration", "0.12s");
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`axe finds nothing on any step in ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    const audit = async () => {
      // Contrast is measured on settled screens: mid-fade text reads as too faint.
      await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
    };
    await startOnboarding(page);
    await audit();
    await reachChooseStep(page, ["Checked for contrast"]);
    await audit();
    await page.getByRole("button", { name: "Move Checked for contrast to tomorrow" }).click();
    await button(page, "Continue").click();
    await page.getByRole("button", { name: "Put Checked for contrast at 8:00am" }).click();
    await audit();
    await button(page, "Continue").click();
    await audit();
  });
}

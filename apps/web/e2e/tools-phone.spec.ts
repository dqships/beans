import { expect, test } from "@playwright/test";
import { TOOL_PATHS } from "../src/tools/slugs";

// Runs in the phone project (390 wide): no tool may make the page scroll sideways.

for (const path of ["/tools", ...TOOL_PATHS]) {
  test(`${path} fits a phone`, async ({ page }) => {
    await page.goto(path, { waitUntil: "networkidle" });
    await expect(page.locator("h1")).toBeVisible();
    if (path !== "/tools") await expect(page.locator("[data-tool]")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("the time blocking planner works without dragging", async ({ page }) => {
  await page.goto("/tools/time-blocking-planner");
  const tool = page.locator("[data-tool]");
  await tool.getByLabel("New task").fill("Write the report");
  await tool.getByLabel("New task").press("Enter");
  await tool.getByLabel("Start time for Write the report").fill("13:00");
  await expect(tool.getByRole("group", { name: "Write the report, 1:00pm – 1:30pm" })).toBeVisible();
  await tool.getByRole("button", { name: "Take off Write the report from the schedule" }).click();
  await expect(tool.getByRole("button", { name: "Schedule Write the report in the next gap" })).toBeVisible();
});

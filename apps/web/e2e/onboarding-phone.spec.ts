import { expect, test } from "@playwright/test";
import { signInOnly, addDaysKey, todayKey } from "./helpers";

// Runs against the local Convex backend with the test sign-in.

test("onboarding fits a phone and ends on the planner", async ({ page }) => {
  const continueButton = page.getByRole("button", { name: "Continue", exact: true });
  const fits = async () => {
    const { scrollWidth, clientWidth } = await page.locator("main").evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  };
  await signInOnly(page);
  await expect(page.getByRole("heading", { level: 1, name: "What do you plan around?" })).toBeVisible({ timeout: 20_000 });
  await fits();
  await page.getByRole("checkbox", { name: "Errands" }).click();
  await continueButton.click();

  await page.getByRole("textbox", { name: "Add a task" }).fill("Plan from my phone with a title long enough to wrap onto a second line");
  await page.getByRole("textbox", { name: "Add a task" }).press("Enter");
  await fits();
  await continueButton.click();

  await page.getByRole("button", { name: "Plan tomorrow instead" }).click();
  await page.getByRole("button", { name: /^Move Plan from my phone/ }).click();
  await fits();
  await continueButton.click();

  await page.getByRole("button", { name: /^Put Plan from my phone .* at 9:00am$/ }).click();
  await fits();
  await continueButton.click();
  await page.getByRole("button", { name: "Open my planner" }).click();

  await expect(page.getByRole("navigation", { name: "Sections" })).toBeVisible();
  await expect(page.locator(`[data-day="${addDaysKey(todayKey(), 1)}"]`)).toContainText("Plan from my phone");
});

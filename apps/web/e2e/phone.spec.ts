import { expect, test } from "@playwright/test";
import { card, openPlanner } from "./helpers";

test("phone layout shows one day with tabs", async ({ page }) => {
  await openPlanner(page);
  const nav = page.getByRole("navigation", { name: "Sections" });
  await expect(nav).toBeVisible();
  await expect(page.locator("[data-day]")).toHaveCount(1);
  await nav.getByRole("button", { name: "Brain Dump" }).click();
  await expect(card(page, "Book a dentist appointment")).toBeVisible();
  await nav.getByRole("button", { name: "Timebox" }).click();
  await expect(page.locator("[data-timebox]")).toHaveCount(1);
  await nav.getByRole("button", { name: "Today" }).click();
  await page.getByRole("button", { name: "Forward" }).click();
  await expect(nav).toContainText("Tomorrow");
  await expect(card(page, "Call the bank about the card")).toBeVisible();
  // No horizontal overflow
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("phone quick capture button", async ({ page }) => {
  await openPlanner(page);
  await page.getByRole("button", { name: "Quick Capture" }).click();
  await page.getByRole("textbox", { name: "Quick Capture" }).fill("Phone task today");
  await page.keyboard.press("Enter");
  await expect(card(page, "Phone task")).toBeVisible();
});

test("phone task details fit the screen", async ({ page }) => {
  await openPlanner(page);
  await card(page, "Review launch plan").click();
  const modal = page.getByRole("dialog", { name: "Task details" });
  const box = await modal.boundingBox();
  expect(box!.width).toBeLessThanOrEqual(390);
  expect(box!.x).toBeGreaterThanOrEqual(0);
});

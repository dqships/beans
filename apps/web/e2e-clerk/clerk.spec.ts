import { randomBytes } from "node:crypto";
import { createClerkClient } from "@clerk/backend";
import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test, type Page } from "@playwright/test";
import { card, day, todayKey } from "../e2e/helpers";
import { clerkConfigured } from "./keys";

// Clerk's fixed verification code for `+clerk_test` addresses on development instances.
const TEST_CODE = "424242";

test.skip(!clerkConfigured, "No Clerk development keys in this environment");

const id = randomBytes(4).toString("hex");
const email = `beans-${id}+clerk_test@example.com`;
const password = `${randomBytes(16).toString("hex")}-Bn1`;

async function signUp(page: Page) {
  await setupClerkTestingToken({ page });
  await page.goto("/sign-up");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator('input[autocomplete="one-time-code"]').first().pressSequentially(TEST_CODE);
  await expect(page).toHaveURL(/\/app$/, { timeout: 30_000 });
}

test.afterAll(async () => {
  if (!clerkConfigured) return;
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const { data } = await clerk.users.getUserList({ emailAddress: [email] });
  await Promise.all(data.map((user) => clerk.users.deleteUser(user.id)));
});

test("signed-out visitors reach the Clerk sign-in form", async ({ page }) => {
  await setupClerkTestingToken({ page });
  await page.goto("/app");
  await expect(page).toHaveURL(/\/sign-in$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Welcome back to Beans" })).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("the whole sign-up form can be reached on a short screen", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 620 });
  await setupClerkTestingToken({ page });
  await page.goto("/sign-up");
  const heading = page.getByRole("heading", { name: "Start your bean garden" });
  await expect(heading).toBeInViewport({ timeout: 20_000 });
  const signIn = page.getByRole("link", { name: "Sign in" });
  await signIn.scrollIntoViewIfNeeded();
  await expect(signIn).toBeInViewport();
  const scrolled = await page.locator("main").evaluate((main) => main.scrollTop);
  expect(scrolled).toBeGreaterThan(0);
  await page.locator("main").evaluate((main) => main.scrollTo({ top: 0 }));
  await expect(heading).toBeInViewport();
});

test("sign up, save a task, sync a second window, sign out", async ({ context, page }) => {
  await signUp(page);
  await page.getByRole("button", { name: "Skip setup" }).click({ timeout: 30_000 });
  await expect(page.getByRole("region", { name: "Days" })).toBeVisible({ timeout: 30_000 });

  const title = `Saved through Clerk ${id}`;
  const today = day(page, todayKey());
  await today.getByRole("button", { name: "Add a task" }).click();
  await today.getByRole("textbox", { name: "Task title" }).fill(title);
  await today.getByRole("textbox", { name: "Task title" }).press("Enter");
  await expect(card(today, title)).toBeVisible();

  await page.reload();
  await expect(card(day(page, todayKey()), title)).toBeVisible({ timeout: 20_000 });

  const second = await context.newPage();
  await setupClerkTestingToken({ page: second });
  await second.goto("/app");
  await expect(card(day(second, todayKey()), title)).toBeVisible({ timeout: 20_000 });
  const live = `Live through Clerk ${id}`;
  const secondToday = day(second, todayKey());
  await secondToday.getByRole("button", { name: "Add a task" }).click();
  await secondToday.getByRole("textbox", { name: "Task title" }).fill(live);
  await secondToday.getByRole("textbox", { name: "Task title" }).press("Enter");
  await expect(card(day(page, todayKey()), live)).toBeVisible({ timeout: 20_000 });
  await second.close();

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/, { timeout: 20_000 });
  await page.goto("/app");
  await expect(page).toHaveURL(/\/sign-in$/);
});

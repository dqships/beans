import { expect, test, type Page } from "@playwright/test";
import { signIn, signInOnly } from "./helpers";

// The pricing page and the "no Stripe" path run everywhere. The purchase runs
// only with E2E_STRIPE=1, against a local backend that has a Stripe test key
// and `stripe listen` forwarding to it (docs/BILLING.md, Testing).
const stripe = process.env.E2E_STRIPE === "1";

test.describe("pricing page", () => {
  test("names both plans, the trial and how to cancel, and links to sign-up", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { level: 1, name: "Try Beans free for 7 days" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Monthly" })).toContainText("$6");
    await expect(page.getByRole("region", { name: "Yearly" })).toContainText("$48");
    await expect(page.getByRole("region", { name: "Yearly" })).toContainText("33% less");
    await expect(page.getByText("How do I cancel?")).toBeVisible();
    await expect(page.getByText("within 14 days of a charge")).toBeVisible();
    const ctas = page.getByRole("link", { name: "Start your free trial" });
    await expect(ctas).toHaveCount(2);
    await expect(ctas.first()).toHaveAttribute("href", "/sign-up");
  });

  test("is in the header nav", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Pricing" }).click();
    await expect(page).toHaveURL(/\/pricing$/);
  });
});

test.describe("without Stripe", () => {
  test.skip(stripe, "This backend has Stripe set up.");

  test("the planner stays open and Settings has no Subscription section", async ({ page }) => {
    await signIn(page);
    await page.keyboard.press("Control+,");
    const settings = page.getByRole("dialog", { name: "Settings" });
    await expect(settings.getByRole("button", { name: "Account" })).toBeVisible();
    await expect(settings.getByRole("button", { name: "Subscription" })).toHaveCount(0);
  });
});

/** Fills Stripe Checkout's card form with a test card and submits it. */
async function payOnCheckout(page: Page, cardNumber: string) {
  await expect(page).toHaveURL(/checkout\.stripe\.com/, { timeout: 30_000 });
  const number = page.locator("#cardNumber");
  // Checkout shows the card form straight away, or behind "Pay with card" or a Card choice.
  await expect(async () => {
    if (await number.isVisible()) return;
    const pay = page.getByRole("button", { name: "Pay with card" });
    if (await pay.isVisible()) await pay.click();
    else await page.locator("#payment-method-label-card").click({ force: true });
    await expect(number).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
  await number.fill(cardNumber);
  await page.locator("#cardExpiry").fill("12 / 34");
  await page.locator("#cardCvc").fill("123");
  await page.locator("#billingName").fill("Beans Tester");
  const zip = page.locator("#billingPostalCode");
  if (await zip.isVisible()) await zip.fill("10001");
  const link = page.locator("#enableStripePass");
  if (await link.isChecked().catch(() => false)) await link.uncheck();
  await page.getByTestId("hosted-payment-submit-button").click();
}

test.describe("with Stripe test mode", () => {
  test.skip(!stripe, "Set E2E_STRIPE=1 with a Stripe test key on the local backend.");
  test.setTimeout(120_000);

  test("a new account sets up first, then starts the trial with a card; Settings shows the trial", async ({ page }) => {
    await signInOnly(page);
    // First-run setup comes before the paywall.
    await page.getByRole("button", { name: "Skip setup" }).click({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Try Beans free for 7 days" })).toBeVisible({ timeout: 20_000 });
    // Monthly leads while a launch code runs, yearly otherwise; this test buys monthly either way.
    await page.getByRole("radio", { name: /Monthly/ }).click();
    await expect(page.getByRole("radio", { name: /Monthly/ })).toHaveAttribute("aria-checked", "true");
    await page.getByRole("button", { name: "Start 7-day free trial" }).click();

    await expect(page.getByText("7 days free").first()).toBeVisible({ timeout: 30_000 });
    await payOnCheckout(page, "4242424242424242");

    // Back in Beans: the planner opens.
    await expect(page).toHaveURL(/localhost:\d+\/app$/, { timeout: 60_000 });
    await expect(page.getByRole("region", { name: "Days" })).toBeVisible();

    await page.keyboard.press("Control+,");
    const settings = page.getByRole("dialog", { name: "Settings" });
    await settings.getByRole("button", { name: "Subscription" }).click();
    await expect(settings.getByText(/Free trial until/)).toBeVisible();
    await expect(settings.getByRole("button", { name: "Manage subscription" })).toBeEnabled();
  });

  test("leaving checkout keeps the paywall up", async ({ page }) => {
    await signInOnly(page);
    await page.getByRole("button", { name: "Skip setup" }).click({ timeout: 20_000 });
    await page.getByRole("radio", { name: /Yearly/ }).click();
    await page.getByRole("button", { name: "Start 7-day free trial" }).click();
    await expect(page).toHaveURL(/checkout\.stripe\.com/, { timeout: 30_000 });
    await page.goBack();
    await expect(page.getByRole("heading", { name: "Try Beans free for 7 days" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: "Start 7-day free trial" })).toBeEnabled();
  });
});

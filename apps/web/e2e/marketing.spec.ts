import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const publicPaths = ["/", "/about", "/contact", "/privacy", "/terms"];

/** `landing.js` and the zero-JS build only exist in production. Point E2E_URL at `next start` to run those. */
const production = Boolean(process.env.E2E_URL);

function watchRequests(page: Page) {
  const urls: string[] = [];
  page.on("request", (request) => urls.push(request.url()));
  return urls;
}

/** Scrolls through the page, so every reveal has finished and lazy images are in. */
async function scrollThrough(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 500) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(700);
  await page.evaluate(() => window.scrollTo(0, 0));
}

test.describe("what public pages load", () => {
  for (const path of publicPaths) {
    test(`${path} loads no Clerk or Convex code`, async ({ page }) => {
      const urls = watchRequests(page);
      await page.goto(path, { waitUntil: "networkidle" });
      const html = await page.content();
      expect(urls.filter((url) => /clerk|convex/i.test(url))).toEqual([]);
      expect(html).not.toMatch(/clerk\.browser|convex\.cloud|__clerk/i);
      expect(await page.evaluate(() => "Clerk" in window)).toBe(false);
    });
  }

  test("production pages load no framework JavaScript", async ({ page }) => {
    test.skip(!production, "Development builds always hydrate.");
    for (const path of publicPaths) {
      const urls = watchRequests(page);
      await page.goto(path, { waitUntil: "networkidle" });
      expect(urls.filter((url) => /\.js(\?|$)/.test(url) && !url.endsWith("/landing.js"))).toEqual([]);
    }
  });

  test("the landing page is complete with JavaScript off", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Give every task a day and an hour.");
    await expect(page.getByRole("heading", { name: "How a day goes" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Spill the beans." })).toBeVisible();
    await expect(page.locator('[data-reveal="wait"]')).toHaveCount(0);
    await context.close();
  });

  test("no console errors or policy violations on public pages", async ({ page }) => {
    const problems: string[] = [];
    page.on("console", (message) => {
      // The video's files come from workstream 4; only they may be missing before it lands.
      if (message.type() === "error" && !message.location().url.includes("/video/")) problems.push(message.text());
    });
    page.on("pageerror", (error) => problems.push(error.message));
    for (const path of publicPaths) {
      await page.goto(path, { waitUntil: "networkidle" });
    }
    expect(problems.filter((text) => !production || !/Failed to load resource/.test(text))).toEqual([]);
  });
});

test.describe("head tags", () => {
  for (const path of publicPaths) {
    test(`${path} carries its full head`, async ({ page }) => {
      await page.goto(path);
      const content = (selector: string) => page.locator(selector).first().getAttribute("content");
      const title = await page.title();
      expect(title.length).toBeGreaterThanOrEqual(30);
      expect(title.length).toBeLessThanOrEqual(60);
      const description = (await content('meta[name="description"]')) ?? "";
      expect(description.length).toBeGreaterThanOrEqual(120);
      expect(description.length).toBeLessThanOrEqual(160);
      expect(await page.locator("html").getAttribute("lang")).toBe("en");
      expect(await content('meta[name="viewport"]')).toBe("width=device-width, initial-scale=1");
      expect(await content('meta[name="is-agentic-site-type"]')).toBe("app");
      expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toMatch(new RegExp(`${path === "/" ? "" : path}$`));
      expect(await content('meta[property="og:image"]')).toContain("/social/og-image.png");
      expect(await content('meta[property="og:type"]')).toBe("website");
      expect(await content('meta[name="twitter:card"]')).toBe("summary_large_image");
      expect(await content('meta[name="twitter:image"]')).toContain("/social/twitter-image.png");
      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

      const jsonLd = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
      expect(jsonLd["@type"]).toBe("SoftwareApplication");
      expect(jsonLd).not.toHaveProperty("address");
      expect(jsonLd).not.toHaveProperty("contactPoint");

      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("main")).toHaveCount(1);
    });
  }
});

test.describe("HTTP behavior", () => {
  test("public pages answer in markdown at the same URL", async ({ request }) => {
    for (const path of publicPaths) {
      const response = await request.get(path, { headers: { Accept: "text/markdown" } });
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("text/markdown");
      expect(response.headers().vary).toMatch(/\bAccept\b/);
      expect(await response.text()).toMatch(/^# /);
    }
  });

  test("browsers still get HTML, with Vary set", async ({ request }) => {
    for (const path of publicPaths) {
      const response = await request.get(path, { headers: { Accept: "text/html,application/xhtml+xml,*/*;q=0.8" } });
      expect(response.headers()["content-type"]).toContain("text/html");
      expect(response.headers().vary).toMatch(/\bAccept\b/);
    }
  });

  test("a missing page returns a real 404, with no Clerk or Convex", async ({ page, request }) => {
    const urls = watchRequests(page);
    const response = await page.goto("/no-such-page", { waitUntil: "networkidle" });
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nothing planted here.");
    await expect(page.getByRole("img", { name: /digging/ })).toBeAttached();
    expect(urls.filter((url) => /clerk|convex/i.test(url))).toEqual([]);

    const markdown = await request.get("/no-such-page", { headers: { Accept: "text/markdown" } });
    expect(markdown.status()).toBe(404);
    expect(markdown.headers()["content-type"]).toContain("text/markdown");
    expect(await markdown.text()).toContain("# Page not found");
  });

  test("robots.txt allows crawlers, leaves out the app and points at the sitemap", async ({ request }) => {
    const text = await (await request.get("/robots.txt")).text();
    expect(text).toMatch(/User-Agent: \*/i);
    expect(text).toContain("Allow: /");
    expect(text).toContain("Disallow: /app");
    expect(text).toMatch(/Sitemap: \S+\/sitemap\.xml/);
    expect(text).not.toMatch(/GPTBot|ChatGPT|Claude|Perplexity|OAI-SearchBot/);
  });

  test("sitemap.xml lists every public page with lastmod", async ({ request }) => {
    const text = await (await request.get("/sitemap.xml")).text();
    expect(text.match(/<lastmod>/g)).toHaveLength(publicPaths.length);
    for (const path of publicPaths.slice(1)) expect(text).toContain(`${path}</loc>`);
    expect(text).not.toContain("/app");
  });

  test("llms.txt links resolve", async ({ request }) => {
    const text = await (await request.get("/llms.txt")).text();
    const paths = [...text.matchAll(/\]\((?:https?:\/\/[^/)]+)?(\/[^)]*)?\)/g)].map((match) => match[1] ?? "/");
    expect(paths.length).toBeGreaterThanOrEqual(5);
    for (const path of paths) expect((await request.get(path)).status()).toBeLessThan(400);
  });

  test("security headers are set", async ({ request }) => {
    const headers = (await request.get("/")).headers();
    expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    if (production) expect(headers["strict-transport-security"]).toBe("max-age=31536000; includeSubDomains");
    const app = (await request.get("/sign-in")).headers()["content-security-policy"];
    expect(app).toContain("challenges.cloudflare.com");
  });
});

test.describe("accessibility", () => {
  for (const colorScheme of ["light", "dark"] as const) {
    for (const path of [...publicPaths, "/no-such-page"]) {
      test(`axe finds nothing on ${path} in ${colorScheme}`, async ({ page }) => {
        await page.emulateMedia({ colorScheme });
        await page.goto(path);
        await scrollThrough(page);
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"]).analyze();
        expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(" | ")}`)).toEqual([]);
      });
    }
  }

  test("keyboard reaches every control, with a visible ring", async ({ page }) => {
    await page.goto("/");
    const count = await page.locator('a[href], button:not([hidden]), input, video[controls]').count();
    for (let i = 0; i < Math.min(count, 40); i++) {
      await page.keyboard.press("Tab");
      const focus = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement;
        const target = element.matches("input") ? (element.parentElement as HTMLElement) : element;
        const style = getComputedStyle(target);
        return { tag: element.tagName, outline: style.outlineStyle, width: parseFloat(style.outlineWidth), body: element === document.body };
      });
      expect(focus.body).toBe(false);
      if (focus.tag !== "VIDEO") {
        expect(focus.outline).toBe("solid");
        expect(focus.width).toBeGreaterThanOrEqual(2);
      }
    }
  });

  test("a bean ticks with the keyboard", async ({ page }) => {
    await page.goto("/");
    const bean = page.getByRole("checkbox", { name: "Book a dentist appointment done" });
    await bean.focus();
    await page.keyboard.press("Space");
    await expect(bean).toBeChecked();
  });
});

test.describe("the hero demo", () => {
  test.skip(!production, "landing.js only ships in production builds.");

  test("Plant puts a task on the Timebox", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Plant Find a birthday gift for Sam on the Timebox" }).click();
    await expect(page.locator("[data-block]").filter({ hasText: "Find a birthday gift for Sam" })).toContainText("11:00am – 11:30am");
    await expect(page.getByRole("status")).toHaveText("Find a birthday gift for Sam planted at 11:00am.");
  });

  test("a task drags onto the Timebox", async ({ page }) => {
    await page.goto("/");
    const card = page.locator("[data-task]").filter({ hasText: "Look into a standing desk" }).first();
    const grid = page.locator("[data-timebox]");
    const from = (await card.boundingBox())!;
    const to = (await grid.boundingBox())!;
    await page.mouse.move(from.x + 60, from.y + 12);
    await page.mouse.down();
    // 12:15 on the grid, which starts at 8 AM with 80 pixels to the hour.
    await page.mouse.move(to.x + to.width / 2, to.y + 80 * 4 + 20, { steps: 10 });
    await page.mouse.up();
    await expect(page.locator("[data-block]").filter({ hasText: "Look into a standing desk" })).toContainText("12:00pm – 12:20pm");
  });

  test("reveal runs once, and nothing stays hidden", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-reveal="wait"]').first()).toBeAttached();
    await scrollThrough(page);
    await expect(page.locator('[data-reveal="wait"]')).toHaveCount(0);
  });

  test("reduced motion gets a plain fade", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    const translate = await page.locator('[data-reveal="wait"]').first().evaluate((element) => getComputedStyle(element).translate);
    expect(translate).toBe("none");
    await context.close();
  });
});

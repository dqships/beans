import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { TOOL_PATHS } from "../src/tools/slugs";

/** The zero-JS index and the production policy only exist in a production build. Point E2E_URL at `next start` to run those. */
const production = Boolean(process.env.E2E_URL);

function watchRequests(page: Page) {
  const urls: string[] = [];
  page.on("request", (request) => urls.push(request.url()));
  return urls;
}

test.describe("every tool's page", () => {
  for (const path of TOOL_PATHS) {
    test(`${path} has its head, its tool and its copy`, async ({ page, request }) => {
      const urls = watchRequests(page);
      const response = await page.goto(path, { waitUntil: "networkidle" });
      expect(response?.status()).toBe(200);
      expect(response?.headers()["content-security-policy"]).toContain("style-src-attr 'unsafe-inline'");
      expect(urls.filter((url) => /clerk|convex|posthog/i.test(url))).toEqual([]);

      const content = (selector: string) => page.locator(selector).first().getAttribute("content");
      const title = await page.title();
      expect(title.length).toBeGreaterThanOrEqual(30);
      expect(title.length).toBeLessThanOrEqual(60);
      const description = (await content('meta[name="description"]')) ?? "";
      expect(description.length).toBeGreaterThanOrEqual(120);
      expect(description.length).toBeLessThanOrEqual(160);
      expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toMatch(new RegExp(`${path}$`));
      expect(await content('meta[property="og:url"]')).toMatch(new RegExp(`${path}$`));
      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

      const graph = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}")["@graph"] as Record<string, unknown>[];
      const types = graph.map((node) => node["@type"]);
      expect(types).toEqual(["WebApplication", "Organization", "WebApplication", "BreadcrumbList", "FAQPage"]);
      expect(graph[2]).toMatchObject({ isAccessibleForFree: true, offers: { price: "0" } });
      expect((graph[4]!.mainEntity as unknown[]).length).toBeGreaterThanOrEqual(4);

      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("main")).toHaveCount(1);
      await expect(page.locator("[data-tool]")).toBeVisible();
      await expect(page.getByRole("heading", { name: "How to use it" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Questions" })).toBeVisible();
      await expect(page.getByRole("link", { name: "All free tools" })).toHaveAttribute("href", "/tools");
      await expect(page.locator('main a[href="/sign-up"]')).toHaveText("Start planning");

      // Nothing wider than the page.
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

      const markdown = await request.get(path, { headers: { Accept: "text/markdown" } });
      expect(markdown.headers()["content-type"]).toContain("text/markdown");
      expect(await markdown.text()).toMatch(/^# /);
    });
  }

  test("a tool page runs its own scripts and no other inline script", async ({ page }) => {
    test.skip(!production, "The page's own script policy is only written in production builds.");
    await page.goto("/tools/pomodoro-timer", { waitUntil: "networkidle" });
    // The header lets inline scripts through, and the page's own policy names the one it has by hash.
    const policy = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
    expect(policy).toMatch(/^script-src 'self'( 'sha256-[A-Za-z0-9+/=]+')+$/);
    const ran = await page.evaluate(() => {
      const script = document.createElement("script");
      script.textContent = "window.__injected = true";
      document.body.appendChild(script);
      return "__injected" in window;
    });
    expect(ran).toBe(false);
    // The page still hydrated.
    await page.locator("[data-tool]").getByRole("button", { name: "Start" }).click();
    await expect(page.locator("[data-tool]").getByRole("button", { name: "Pause" })).toBeVisible();
  });

  test("tool pages run with no console errors or policy violations", async ({ page }) => {
    test.skip(!production, "Next's development client logs its own errors under nosniff.");
    test.setTimeout(120_000);
    const problems: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") problems.push(`${page.url()}: ${message.text()}`);
    });
    page.on("pageerror", (error) => problems.push(`${page.url()}: ${error.message}`));
    for (const path of TOOL_PATHS) {
      await page.goto(path, { waitUntil: "networkidle" });
      await expect(page.locator("[data-tool]")).toBeVisible();
    }
    expect(problems).toEqual([]);
  });
});

test.describe("the tools index", () => {
  test("lists every tool under its kind", async ({ page }) => {
    await page.goto("/tools");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Free tools for planning your time");
    for (const path of TOOL_PATHS) await expect(page.locator(`main a[href="${path}"]`)).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(["Timers", "Plan a day or a week", "Sort your tasks", "Work out the time", "These are pieces of Beans."]);
    await expect(page.locator('header a[href="/tools"]')).toHaveText("Free tools");
    await expect(page.locator('footer a[href="/tools"]')).toHaveText("Free tools");
  });

  test("ships no framework JavaScript", async ({ page }) => {
    test.skip(!production, "Development builds always hydrate.");
    const urls = watchRequests(page);
    await page.goto("/tools", { waitUntil: "networkidle" });
    expect(urls.filter((url) => /\.js(\?|$)/.test(url))).toEqual([]);
  });

  test("a visit from another site carries its source through a tool to sign-up", async ({ page }) => {
    await page.goto("/tools/pomodoro-timer?utm_source=newsletter", { referer: "https://www.example.com/", waitUntil: "networkidle" });
    const source = "ft_ref=https%3A%2F%2Fwww.example.com%2F&ft_lp=%2Ftools%2Fpomodoro-timer&utm_source=newsletter";
    await expect(page.locator('main a[href^="/sign-up"]')).toHaveAttribute("href", `/sign-up?${source}`);
    await expect(page.locator('main a[href^="/tools/countdown-timer"]')).toHaveAttribute("href", `/tools/countdown-timer?${source}`);
    await expect(page.getByRole("link", { name: "All free tools" })).toHaveAttribute("href", `/tools?${source}`);
  });
});

test.describe("accessibility", () => {
  for (const colorScheme of ["light", "dark"] as const) {
    for (const path of TOOL_PATHS) {
      test(`axe finds nothing on ${path} in ${colorScheme}`, async ({ page }) => {
        await page.emulateMedia({ colorScheme });
        await page.goto(path, { waitUntil: "networkidle" });
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"]).analyze();
        expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(" | ")}`)).toEqual([]);
      });
    }
  }
});

test.describe("tools that keep time", () => {
  test("the Pomodoro timer counts down, shows the time in the tab and moves to a break", async ({ page }) => {
    await page.goto("/tools/pomodoro-timer");
    const tool = page.locator("[data-tool]");
    await expect(tool.getByRole("timer")).toHaveText("25:00");
    await tool.getByRole("button", { name: "Start" }).click();
    await expect(tool.getByRole("timer")).not.toHaveText("25:00", { timeout: 5000 });
    await expect(page).toHaveTitle(/^24:5\d · Focus$/);
    await tool.getByRole("button", { name: "Pause" }).click();
    await tool.getByRole("button", { name: "Skip" }).click();
    await expect(tool.getByRole("timer")).toHaveText("05:00");
    await expect(tool.getByRole("radio", { name: "Short break" })).toBeChecked();
    await expect(page).toHaveTitle(/Pomodoro Timer/);
  });

  test("Pomodoro settings change the clock and survive a reload", async ({ page }) => {
    await page.goto("/tools/pomodoro-timer");
    const tool = page.locator("[data-tool]");
    await tool.getByText("Settings").click();
    await tool.getByLabel("Focus (minutes)").fill("50");
    await expect(tool.getByRole("timer")).toHaveText("50:00");
    await page.reload();
    await expect(tool.getByRole("timer")).toHaveText("50:00");
  });
});

test.describe("tools that hold a list", () => {
  test("the to-do list adds, checks off, reorders and keeps its tasks", async ({ page }) => {
    await page.goto("/tools/to-do-list");
    const tool = page.locator("[data-tool]");
    await expect(tool.getByText("Nothing on the list yet.")).toBeVisible();
    for (const task of ["Call the dentist", "Pay rent"]) {
      await tool.getByLabel("New task").fill(task);
      await tool.getByLabel("New task").press("Enter");
    }
    await tool.getByRole("checkbox", { name: "Pay rent done" }).click();
    await expect(tool.getByRole("status")).toHaveText("1 of 2 done");
    await tool.getByRole("button", { name: "Move Pay rent up" }).click();
    await expect(tool.getByLabel("Task", { exact: true }).first()).toHaveValue("Pay rent");

    await page.reload();
    await expect(tool.getByLabel("Task", { exact: true })).toHaveCount(2);
    await expect(tool.getByRole("checkbox", { name: "Pay rent done" })).toBeChecked();
    await tool.getByRole("button", { name: "Clear finished" }).click();
    await expect(tool.getByRole("status")).toHaveText("0 of 1 done");
  });

  test("the time blocking planner schedules, moves and drags tasks", async ({ page }) => {
    await page.goto("/tools/time-blocking-planner");
    const tool = page.locator("[data-tool]");
    await tool.getByRole("button", { name: "Load an example day" }).click();
    const blocks = tool.getByRole("group", { name: "Schedule" }).locator('[aria-roledescription="time block"]');
    await expect(blocks).toHaveCount(4);
    await expect(tool.getByText("3h blocked out of 10h. 2 tasks still to schedule (45m).")).toBeVisible();

    // Schedule drops the task into the first gap that holds it: 8:00, before the 9:00 block.
    await tool.getByRole("button", { name: "Schedule Book a dentist appointment in the next gap" }).click();
    await expect(tool.getByRole("group", { name: "Book a dentist appointment, 8:00am – 8:15am" })).toBeVisible();

    // The keyboard moves and stretches a block.
    const dentist = tool.getByRole("group", { name: /^Book a dentist appointment/ });
    await dentist.focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Shift+ArrowDown");
    await expect(dentist).toHaveAccessibleName("Book a dentist appointment, 8:15am – 8:45am");

    // A task dragged by its handle lands on the hour it's dropped on. The grid starts at 8 AM, 64 pixels to the hour.
    const row = tool.getByRole("listitem").filter({ has: page.getByRole("button", { name: /^Schedule Look into a standing desk/ }) });
    const handle = await row.locator('[title="Drag onto the hours"]').boundingBox();
    const lane = await blocks.first().locator("xpath=..").boundingBox();
    await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + handle!.height / 2);
    await page.mouse.down();
    await page.mouse.move(lane!.x + lane!.width / 2, lane!.y + 64 * 7 + 16, { steps: 12 });
    await page.mouse.up();
    await expect(tool.getByRole("group", { name: "Look into a standing desk, 3:00pm – 3:30pm" })).toBeVisible();
    await expect(tool.getByText("Every task has a time.")).toBeVisible();

    await page.reload();
    await expect(blocks).toHaveCount(6);
  });
});

test.describe("tools that work out time", () => {
  test("the time duration calculator takes a break off and handles an overnight span", async ({ page }) => {
    await page.goto("/tools/time-duration-calculator");
    const tool = page.locator("[data-tool]");
    await tool.getByLabel("Start time").fill("09:00");
    await tool.getByLabel("End time").fill("17:30");
    await tool.getByLabel("Unpaid break (minutes)").fill("30");
    await expect(tool.getByText("8 hours", { exact: true })).toBeVisible();
    await expect(tool.getByText("480", { exact: true })).toBeVisible();
    await tool.getByLabel("Start time").fill("22:00");
    await tool.getByLabel("End time").fill("06:00");
    await expect(tool.getByText("7 hours 30 minutes", { exact: true })).toBeVisible();
    await expect(tool).toContainText("next day");
  });

  test("the time calculator adds rows up", async ({ page }) => {
    await page.goto("/tools/time-calculator");
    const tool = page.locator("[data-tool]");
    await tool.getByLabel("Row 1 hours").fill("1");
    await tool.getByLabel("Row 1 minutes").fill("45");
    await tool.getByLabel("Row 2 minutes").fill("30");
    await expect(tool.getByText("2:15:00", { exact: true })).toBeVisible();
    await expect(tool.getByText("2.25", { exact: true })).toBeVisible();
    await tool.getByLabel("Row 2: add or subtract").selectOption({ index: 1 });
    await expect(tool.getByText("1:15:00", { exact: true })).toBeVisible();
  });

  test("hours and minutes convert to decimal hours and back", async ({ page }) => {
    await page.goto("/tools/hours-to-decimal");
    const tool = page.locator("[data-tool]");
    await tool.getByLabel("Hours", { exact: true }).fill("2");
    await tool.getByLabel("Minutes", { exact: true }).fill("15");
    await expect(tool.getByText("2.25", { exact: true })).toBeVisible();
    await tool.getByLabel("Decimal hours").fill("0.75");
    await expect(tool.getByText("45 min", { exact: true })).toBeVisible();
  });

  test("the time card adds up a week and keeps it", async ({ page }) => {
    await page.goto("/tools/time-card-calculator");
    const tool = page.locator("[data-tool]");
    await tool.getByLabel("Monday clock in").fill("09:00");
    await tool.getByLabel("Monday clock out").fill("17:00");
    await tool.getByRole("group", { name: "Monday" }).getByRole("spinbutton").or(tool.getByRole("group", { name: "Monday" }).getByRole("textbox")).last().fill("30");
    await expect(tool.getByRole("group", { name: "Monday" })).toContainText("7h 30m");
    await tool.getByRole("button", { name: /Copy Monday/ }).click();
    await expect(tool).toContainText("37h 30m");
    await expect(tool).toContainText("37.5");
    await page.reload();
    await expect(tool).toContainText("37h 30m");
  });

  test("the date calculator counts days and weekdays", async ({ page }) => {
    await page.goto("/tools/date-calculator");
    const tool = page.locator("[data-tool]");
    await tool.getByLabel("From").fill("2026-11-02");
    await tool.getByLabel("To", { exact: true }).fill("2026-11-16");
    await expect(tool.getByText("14 days", { exact: true }).first()).toBeVisible();
    await expect(tool).toContainText("2 weeks");
    await expect(tool).toContainText("Weekdays, Monday to Friday10");
  });

  test("a week has 168 hours, and the budget takes yours off it", async ({ page }) => {
    await page.goto("/tools/hours-in-a-week");
    const tool = page.locator("[data-tool]");
    await expect(tool.getByText("168 hours", { exact: true })).toBeVisible();
    // Sleep 56, work 40, commute 5, meals 10.5, chores 7, exercise 3.
    await expect(tool).toContainText("121.5");
    await expect(tool).toContainText("46.5");
  });

  test("the sleep calculator counts back in 90-minute cycles", async ({ page }) => {
    await page.goto("/tools/sleep-calculator");
    const tool = page.locator("[data-tool]");
    await tool.getByLabel("Wake-up time").fill("07:00");
    // Six cycles is 9 hours, plus 15 minutes to fall asleep.
    await expect(tool).toContainText("9:45 pm");
    await expect(tool).toContainText("11:15 pm");
  });

  test("the meeting planner shows each place's time and the overlap", async ({ page }) => {
    await page.goto("/tools/time-zone-meeting-planner");
    const tool = page.locator("[data-tool]");
    await expect(tool.getByRole("combobox")).toHaveCount(2);
    await expect(tool.getByText(/Everyone is in working hours|No hour has everyone in working hours/).first()).toBeVisible();
    await tool.getByRole("button", { name: "Add a place" }).click();
    await expect(tool.getByRole("combobox")).toHaveCount(3);
  });
});

test.describe("the other timers", () => {
  test("the countdown takes a preset and runs", async ({ page }) => {
    await page.goto("/tools/countdown-timer");
    const tool = page.locator("[data-tool]");
    await tool.getByRole("button", { name: "1 min", exact: true }).click();
    await expect(tool.getByRole("timer")).toHaveText("01:00");
    await tool.getByRole("button", { name: "Start" }).click();
    await expect(tool.getByRole("timer")).not.toHaveText("01:00", { timeout: 5000 });
    await expect(page).toHaveTitle(/^00:5\d/);
  });

  test("the stopwatch runs and marks laps", async ({ page }) => {
    await page.goto("/tools/stopwatch");
    const tool = page.locator("[data-tool]");
    await tool.getByRole("button", { name: "Start" }).click();
    await page.waitForTimeout(300);
    await tool.getByRole("button", { name: "Lap" }).click();
    await tool.getByRole("button", { name: "Lap" }).click();
    await expect(tool.getByRole("region", { name: "Laps" }).getByRole("row")).toHaveCount(3);
    await tool.getByRole("button", { name: "Stop" }).click();
    await expect(tool.getByRole("timer")).not.toHaveText("00:00.00");
  });

  test("the break timer switches pattern", async ({ page }) => {
    await page.goto("/tools/break-timer");
    const tool = page.locator("[data-tool]");
    await expect(tool.getByRole("timer")).toHaveText("52:00");
    await tool.getByRole("radio", { name: "20-20-20" }).check();
    await expect(tool.getByRole("timer")).toHaveText("20:00");
    await tool.getByRole("button", { name: "Skip to break" }).click();
    await expect(tool.getByRole("timer")).toHaveText("00:20");
  });
});

test.describe("the planners and sorters", () => {
  test("a brain dump takes a pasted list and sorts it", async ({ page }) => {
    await page.goto("/tools/brain-dump");
    const tool = page.locator("[data-tool]");
    await expect(tool.getByText("Spill the beans: type everything on your mind, one thing at a time.")).toBeVisible();
    await tool.getByLabel("New thought").fill("Renew passport");
    await tool.getByLabel("New thought").press("Enter");
    await tool.getByLabel("New thought").fill("Call mum");
    await tool.getByLabel("New thought").press("Enter");
    await tool.getByRole("button", { name: "Move Renew passport to Today" }).click();
    const today = tool.locator('section[aria-label="Today"]').getByLabel("Thought");
    const pile = tool.locator('section[aria-label="The pile"]').getByLabel("Thought");
    await expect(today).toHaveValue("Renew passport");
    await expect(pile).toHaveValue("Call mum");
    await page.reload();
    await expect(today).toHaveValue("Renew passport");
    await expect(pile).toHaveValue("Call mum");
  });

  test("the Eisenhower matrix adds to a quadrant and moves a task", async ({ page }) => {
    await page.goto("/tools/eisenhower-matrix");
    const tool = page.locator("[data-tool]");
    await tool.getByLabel("New task for Do first").fill("File the tax return");
    await tool.getByLabel("New task for Do first").press("Enter");
    const doFirst = tool.locator('section[aria-label^="Do first"]');
    const schedule = tool.locator('section[aria-label^="Schedule"]');
    await expect(doFirst.getByRole("checkbox", { name: "File the tax return done" })).toBeVisible();
    await tool.getByLabel("Move File the tax return to another quadrant").selectOption({ label: "Schedule" });
    await expect(schedule.getByRole("checkbox", { name: "File the tax return done" })).toBeVisible();
    await schedule.getByRole("checkbox", { name: "File the tax return done" }).click();
    await page.reload();
    await expect(schedule.getByRole("checkbox", { name: "File the tax return done" })).toBeChecked();
  });

  test("the habit tracker counts days and streaks", async ({ page }) => {
    await page.goto("/tools/habit-tracker");
    const tool = page.locator("[data-tool]");
    await tool.getByLabel("New habit").fill("Read 10 pages");
    await tool.getByLabel("New habit").press("Enter");
    const days = tool.getByRole("button", { name: /^Read 10 pages, / });
    await days.nth(0).click();
    await days.nth(1).click();
    await expect(days.nth(0)).toHaveAttribute("aria-pressed", "true");
    await expect(tool.getByRole("row").filter({ has: page.getByLabel("Habit name") })).toContainText("2");
    await page.reload();
    await expect(days.nth(1)).toHaveAttribute("aria-pressed", "true");
  });

  test("the daily planner keeps what you fill in", async ({ page }) => {
    await page.goto("/tools/daily-planner-template");
    const tool = page.locator("[data-tool]");
    await tool.getByLabel("Priority 1").fill("Send the proposal");
    const schedule = tool.locator('section[aria-label="Schedule"]');
    await schedule.getByLabel("9 AM", { exact: true }).fill("Team standup");
    await tool.getByLabel("To-do 1", { exact: true }).fill("Buy stamps");
    await tool.getByRole("checkbox", { name: "Buy stamps done" }).click();
    await page.reload();
    await expect(tool.getByLabel("Priority 1")).toHaveValue("Send the proposal");
    await expect(schedule.getByLabel("9 AM", { exact: true })).toHaveValue("Team standup");
    await expect(tool.getByRole("checkbox", { name: "Buy stamps done" })).toBeChecked();
  });

  test("the weekly schedule puts a block on each day picked", async ({ page }) => {
    await page.goto("/tools/weekly-schedule-maker");
    const tool = page.locator("[data-tool]");
    await tool.getByLabel("Block name").fill("Biology 101");
    for (const day of ["Mon", "Wed", "Fri"]) await tool.getByLabel(day, { exact: true }).check();
    await tool.getByLabel("Starts").fill("09:00");
    await tool.getByLabel("Ends").fill("10:30");
    await tool.getByRole("button", { name: "Add block" }).click();
    const grid = tool.getByRole("region", { name: "Week grid" });
    await expect(grid.getByText("Biology 101")).toHaveCount(3);
    await expect(grid.getByRole("list", { name: "Monday" })).toContainText("Biology 101");
    await expect(grid.getByRole("list", { name: "Tuesday" })).not.toContainText("Biology 101");
    await page.reload();
    await expect(grid.getByText("Biology 101")).toHaveCount(3);
  });
});

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { card, day, signIn, todayKey } from "./helpers";

/**
 * The Beans MCP server end to end: the route's sign-in answers, tool calls
 * with the local test sign-in's token, live updates in an open planner, and
 * Settings > Connected apps.
 */

const MCP = { "Content-Type": "application/json", Accept: "application/json, text/event-stream", "Mcp-Protocol-Version": "2025-06-18" };

async function tokenFor(request: APIRequestContext, name: string): Promise<string> {
  const res = await request.post("/api/test-auth/token", { data: { user: name } });
  return ((await res.json()) as { token: string }).token;
}

/** Sends one JSON-RPC request and reads the answer out of the event stream. */
async function rpc(request: APIRequestContext, token: string, method: string, params: Record<string, unknown> = {}) {
  const res = await request.post("/mcp", { headers: { ...MCP, Authorization: `Bearer ${token}` }, data: { jsonrpc: "2.0", id: 1, method, params } });
  expect(res.status()).toBe(200);
  const body = await res.text();
  const line = body.split("\n").find((l) => l.startsWith("data: ")) ?? body;
  return JSON.parse(line.replace(/^data: /, "")) as { result: Record<string, unknown> };
}

async function callTool(request: APIRequestContext, token: string, name: string, args: Record<string, unknown> = {}) {
  const { result } = await rpc(request, token, "tools/call", { name, arguments: args });
  const text = (result.content as { text: string }[])[0]!.text;
  return { isError: Boolean(result.isError), text, json: () => JSON.parse(text) as Record<string, unknown> };
}

test.describe("MCP route", () => {
  test("asks for a token with WWW-Authenticate", async ({ request }) => {
    const res = await request.post("/mcp", { headers: MCP, data: { jsonrpc: "2.0", id: 1, method: "tools/list" } });
    expect(res.status()).toBe(401);
    expect(res.headers()["www-authenticate"]).toMatch(/^Bearer .*resource_metadata="http:\/\/localhost:\d+\/\.well-known\/oauth-protected-resource\/mcp"/);
    const bad = await request.post("/mcp", { headers: { ...MCP, Authorization: "Bearer not-a-token" }, data: {} });
    expect(bad.status()).toBe(401);
  });

  test("the MCP host serves nothing but the MCP addresses and an icon page", async ({ request }) => {
    for (const path of ["/app", "/pricing", "/sign-in"]) {
      expect((await request.get(path, { headers: { Host: "mcp.localhost" } })).status(), path).toBe(404);
    }
    const home = await request.get("/", { headers: { Host: "mcp.localhost" } });
    expect(home.status()).toBe(200);
    const html = await home.text();
    expect(html).toContain('<link rel="icon" href="/favicon.ico" sizes="48x48">');
    expect(html).toContain('<link rel="icon" href="/icon.svg" type="image/svg+xml">');
    expect((await request.get("/favicon.ico", { headers: { Host: "mcp.localhost" } })).headers()["content-type"]).toContain("image/");
    const res = await request.post("/mcp", { headers: { ...MCP, Host: "mcp.localhost" }, data: {} });
    expect(res.status()).toBe(401);
  });

  test("lists 19 tools with all three hints, and four prompts", async ({ page, request }) => {
    const name = await signIn(page);
    const token = await tokenFor(request, name);
    const init = await rpc(request, token, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "e2e", version: "1" } });
    expect(init.result.instructions).toContain("Beans is a daily planner");
    const info = init.result.serverInfo as { websiteUrl: string; icons: { src: string; mimeType: string }[] };
    expect(info.websiteUrl).toMatch(/^https?:\/\//);
    expect(info.icons.map((i) => i.mimeType)).toEqual(["image/svg+xml", "image/png"]);
    const { result } = await rpc(request, token, "tools/list");
    const tools = result.tools as { name: string; title: string; annotations: Record<string, unknown> }[];
    expect(tools).toHaveLength(19);
    for (const t of tools) {
      expect(t.name.length).toBeLessThan(64);
      expect(t.title).toBeTruthy();
      expect(Object.keys(t.annotations).sort()).toEqual(["destructiveHint", "openWorldHint", "readOnlyHint", "title"]);
      expect(t.annotations.destructiveHint).toBe(!t.annotations.readOnlyHint);
      expect(t.annotations.openWorldHint).toBe(false);
    }
    const prompts = (await rpc(request, token, "prompts/list")).result.prompts as { title: string }[];
    expect(prompts.map((p) => p.title)).toEqual(["Plan my day", "Weekly review", "Shutdown", "Clean up my Brain Dump"]);
  });
});

test("changes from an AI app show up live in the planner", async ({ page, request }) => {
  const name = await signIn(page);
  const token = await tokenFor(request, name);
  const created = await callTool(request, token, "create_tasks", {
    tasks: [
      { title: "Tempo run from the AI", date: todayKey(), start: "07:00", estimate: 40 },
      { title: "Idea from the AI" },
    ],
  });
  expect(created.isError).toBe(false);
  await expect(card(day(page, todayKey()), "Tempo run from the AI")).toBeVisible();
  await expect(card(page, "Idea from the AI")).toBeVisible();

  const ids = (created.json().created as { id: string }[]).map((t) => t.id);
  expect((await callTool(request, token, "set_done", { ids: [ids[0]], done: true })).isError).toBe(false);
  await expect(card(day(page, todayKey()), "Tempo run from the AI").getByRole("checkbox")).toHaveAttribute("aria-checked", "true");

  await callTool(request, token, "delete_tasks", { ids: [ids[1]] });
  await expect(card(page, "Idea from the AI")).toHaveCount(0);

  const err = await callTool(request, token, "create_tasks", { tasks: [{ title: "X", label: "No such label" }] });
  expect(err).toMatchObject({ isError: true });
  expect(err.text).toContain('No label "No such label"');
});

async function openConnectedApps(page: Page) {
  await page.keyboard.press("Control+,");
  const settings = page.getByRole("dialog", { name: "Settings" });
  await settings.getByRole("button", { name: "Connected apps" }).click();
  return settings;
}

test("Settings lists connected apps and disconnects one", async ({ page, request }) => {
  const name = await signIn(page);
  const settings = await openConnectedApps(page);
  await expect(settings.getByText("https://mcp.beans.followusai.com/mcp")).toBeVisible();
  await expect(settings.getByText("No AI apps yet.")).toBeVisible();

  const token = await tokenFor(request, name);
  await callTool(request, token, "get_overview");
  const apps = settings.getByRole("list", { name: "Connected apps" });
  await expect(apps.getByText("Test client")).toBeVisible();
  await expect(apps).toContainText("Last used today");

  await apps.getByRole("button", { name: "Disconnect" }).click();
  await expect(apps).toContainText("Disconnected.");
  // Refused with any token, including a new one.
  const refused = await callTool(request, await tokenFor(request, name), "get_overview");
  expect(refused.isError).toBe(true);
  expect(refused.text).toContain("choose Reconnect next to Test client");

  await apps.getByRole("button", { name: "Reconnect" }).click();
  await expect(apps).toContainText("Last used today");
  expect((await callTool(request, token, "get_overview")).isError).toBe(false);
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`axe finds nothing in Connected apps in ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await signIn(page);
    const settings = await openConnectedApps(page);
    await expect(settings.getByText("No AI apps yet.")).toBeVisible();
    const results = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`)).toEqual([]);
  });
}

test("/connect-ai shows the address and the steps for each app", async ({ page }) => {
  await page.goto("/connect-ai");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Connect your AI app to Beans");
  await expect(page.locator("pre")).toHaveText("https://mcp.beans.followusai.com/mcp");
  for (const app of ["Claude", "Claude Code", "ChatGPT", "Cursor", "Disconnecting"]) {
    await expect(page.getByRole("heading", { level: 2, name: app, exact: true })).toBeVisible();
  }
  await expect(page.getByText("claude mcp add --transport http beans https://mcp.beans.followusai.com/mcp")).toBeVisible();
});

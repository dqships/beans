import { describe, expect, it } from "vitest";
import { appPolicy, clerkFrontendApi, marketingPolicy } from "../lib/csp";
import { markdownFor, notFoundMarkdown, prefersMarkdown } from "./markdown";
import { publicPageList } from "./pages";

describe("public page metadata", () => {
  it.each(publicPageList.map((page) => [page.path, page] as const))("%s fits the length limits", (_, page) => {
    expect(page.title.length).toBeGreaterThanOrEqual(30);
    expect(page.title.length).toBeLessThanOrEqual(60);
    expect(page.description.length).toBeGreaterThanOrEqual(120);
    expect(page.description.length).toBeLessThanOrEqual(160);
  });

  it("gives every page a markdown version with one H1", () => {
    for (const page of publicPageList) {
      const body = markdownFor(page.path);
      expect(body).toBeTruthy();
      expect(body!.match(/^# /gm)).toHaveLength(1);
    }
    expect(notFoundMarkdown).toContain("# Page not found");
  });
});

describe("prefersMarkdown", () => {
  it("accepts a client that names markdown", () => {
    expect(prefersMarkdown("text/markdown")).toBe(true);
    expect(prefersMarkdown("text/markdown, text/html;q=0.9")).toBe(true);
    expect(prefersMarkdown("TEXT/MARKDOWN;charset=utf-8")).toBe(true);
    expect(prefersMarkdown("text/html;q=0.5, text/markdown;q=0.5")).toBe(true);
  });

  it("leaves browsers and everyone else on HTML", () => {
    expect(prefersMarkdown(null)).toBe(false);
    expect(prefersMarkdown("*/*")).toBe(false);
    expect(prefersMarkdown("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")).toBe(false);
    expect(prefersMarkdown("text/html, text/markdown;q=0.5")).toBe(false);
  });
});

describe("content security policy", () => {
  const key = (host: string, env = "test") => `pk_${env}_${Buffer.from(`${host}$`).toString("base64")}`;

  it("reads the Clerk Frontend API from publishable keys", () => {
    expect(clerkFrontendApi(key("happy-bean-12.clerk.accounts.dev"))).toBe("happy-bean-12.clerk.accounts.dev");
    expect(clerkFrontendApi(key("clerk.example.com", "live"))).toBe("clerk.example.com");
    expect(clerkFrontendApi(undefined)).toBeNull();
    expect(clerkFrontendApi("pk_test_")).toBeNull();
  });

  it("keeps public pages free of inline scripts in production", () => {
    const policy = marketingPolicy({ dev: false });
    expect(policy).toContain("script-src 'self';");
    expect(policy).not.toContain("unsafe");
    expect(policy).toContain("frame-ancestors 'self'");
  });

  it("lets the planner reach Clerk and Convex", () => {
    const policy = appPolicy({
      dev: false,
      clerkPublishableKey: key("clerk.example.com", "live"),
      convexUrl: "https://happy-bean-123.convex.cloud",
    });
    expect(policy).toMatch(/script-src [^;]*https:\/\/clerk\.example\.com/);
    expect(policy).toMatch(/connect-src [^;]*https:\/\/clerk\.example\.com/);
    expect(policy).toMatch(/connect-src [^;]*wss:\/\/happy-bean-123\.convex\.cloud/);
    expect(policy).toMatch(/frame-src [^;]*https:\/\/challenges\.cloudflare\.com/);
    expect(policy).not.toContain("unsafe-eval");
  });

  it("allows a local Convex backend, ws included", () => {
    expect(appPolicy({ dev: true, convexUrl: "http://127.0.0.1:3210" })).toContain("ws://127.0.0.1:3210");
  });
});

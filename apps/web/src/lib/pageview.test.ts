import { describe, expect, it, vi } from "vitest";
import { isBot, isPrefetch, pageviewFor, sendPageview, visitorId } from "./pageview";

const CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1";
const NOW = Date.parse("2026-11-04T12:00:00Z");
const HOST = "beans.followusai.com";

function request(path: string, headers: Record<string, string> = {}, method = "GET") {
  return {
    method,
    url: new URL(path, `https://${HOST}`),
    headers: new Headers({ "user-agent": CHROME, "x-forwarded-for": "203.0.113.7, 10.0.0.1", "sec-fetch-dest": "document", ...headers }),
    host: HOST,
  };
}

describe("isBot", () => {
  it("lets real browsers through", () => {
    expect(isBot(CHROME)).toBe(false);
    expect(isBot(IPHONE)).toBe(false);
    expect(isBot("Mozilla/5.0 (X11; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0")).toBe(false);
    // The verification request's agent counts as a visitor.
    expect(isBot("posthog-verify/1.0 (claude-code)")).toBe(false);
  });

  it("skips crawlers, link previews, monitors, headless browsers and scripts", () => {
    for (const ua of [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)",
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
      "Twitterbot/1.0",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/141.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse",
      "curl/8.7.1",
      "python-requests/2.32.3",
      "Go-http-client/2.0",
      "node-fetch/1.0",
      "UptimeRobot/2.0",
      "",
    ]) {
      expect(isBot(ua), ua).toBe(true);
    }
    expect(isBot(null)).toBe(true);
  });
});

describe("isPrefetch", () => {
  it("skips prefetches, prerenders, RSC and data requests, and non-page fetches", () => {
    const cases: Record<string, string>[] = [
      { "next-router-prefetch": "1" },
      { purpose: "prefetch" },
      { "sec-purpose": "prefetch" },
      { "sec-purpose": "prefetch;prerender" },
      { "x-middleware-prefetch": "1" },
      { rsc: "1" },
      { "x-nextjs-data": "1" },
      { "sec-fetch-dest": "empty" },
      { "sec-fetch-dest": "image" },
    ];
    for (const headers of cases) {
      expect(isPrefetch(new Headers(headers)), JSON.stringify(headers)).toBe(true);
    }
  });

  it("counts a page load, with or without fetch metadata", () => {
    expect(isPrefetch(new Headers({ "sec-fetch-dest": "document" }))).toBe(false);
    expect(isPrefetch(new Headers({ accept: "*/*" }))).toBe(false);
  });
});

describe("pageviewFor", () => {
  it("builds an anonymous $pageview with the source and no IP address", async () => {
    const view = await pageviewFor(
      request("/pricing?utm_source=newsletter&utm_campaign=launch&ft_ref=https%3A%2F%2Fx.com%2F&session=secret", {
        referer: "https://www.google.com/",
        "x-vercel-ip-country": "NZ",
      }),
      NOW,
    );
    expect(view).toEqual({
      event: "$pageview",
      distinct_id: await visitorId("203.0.113.7", CHROME, NOW),
      timestamp: "2026-11-04T12:00:00.000Z",
      properties: {
        product: "beans",
        $lib: "server-pageview",
        $process_person_profile: false,
        $current_url: "https://beans.followusai.com/pricing?utm_source=newsletter&utm_campaign=launch",
        $host: HOST,
        $pathname: "/pricing",
        $referrer: "https://www.google.com/",
        $referring_domain: "www.google.com",
        $raw_user_agent: CHROME,
        $geoip_disable: true,
        $geoip_country_code: "NZ",
        utm_source: "newsletter",
        utm_campaign: "launch",
      },
    });
    expect(JSON.stringify(view)).not.toContain("203.0.113.7");
  });

  it("marks a visit with no referrer as direct", async () => {
    const view = await pageviewFor(request("/"), NOW);
    expect(view?.properties).toMatchObject({ $current_url: "https://beans.followusai.com/", $pathname: "/", $referrer: "$direct", $referring_domain: "$direct" });
    expect(view?.properties).not.toHaveProperty("$geoip_country_code");
  });

  it("skips bots, prefetches, HEAD requests, and anything but the marketing pages", async () => {
    expect(await pageviewFor(request("/", { "user-agent": "Googlebot/2.1" }), NOW)).toBeNull();
    expect(await pageviewFor(request("/", { "next-router-prefetch": "1" }), NOW)).toBeNull();
    expect(await pageviewFor(request("/about", { "sec-purpose": "prefetch" }), NOW)).toBeNull();
    expect(await pageviewFor(request("/", {}, "HEAD"), NOW)).toBeNull();
    for (const path of ["/app", "/sign-in", "/sign-up", "/api/test-auth", "/mcp", "/landing.js", "/video/beans-demo-web.mp4", "/favicon.ico", "/robots.txt", "/sitemap.xml", "/_next/static/chunk.js", "/nope"]) {
      expect(await pageviewFor(request(path), NOW), path).toBeNull();
    }
    for (const path of ["/", "/pricing", "/about", "/connect-ai", "/contact", "/privacy", "/terms"]) {
      expect(await pageviewFor(request(path), NOW), path).not.toBeNull();
    }
  });
});

describe("visitorId", () => {
  it("is the same all day and changes the next day", async () => {
    const morning = await visitorId("203.0.113.7", CHROME, Date.parse("2026-11-04T00:00:01Z"));
    const night = await visitorId("203.0.113.7", CHROME, Date.parse("2026-11-04T23:59:59Z"));
    const tomorrow = await visitorId("203.0.113.7", CHROME, Date.parse("2026-11-05T00:00:01Z"));
    expect(morning).toMatch(/^[0-9a-f]{64}$/);
    expect(night).toBe(morning);
    expect(tomorrow).not.toBe(morning);
  });

  it("tells visitors apart by IP address and browser", async () => {
    const base = await visitorId("203.0.113.7", CHROME, NOW);
    expect(await visitorId("203.0.113.8", CHROME, NOW)).not.toBe(base);
    expect(await visitorId("203.0.113.7", IPHONE, NOW)).not.toBe(base);
  });
});

describe("sendPageview", () => {
  it("posts the event with the project key, and never throws", async () => {
    const view = (await pageviewFor(request("/"), NOW))!;
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    await sendPageview("phc_test", view, fetchMock as unknown as typeof fetch);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://us.i.posthog.com/i/v0/e/");
    expect(JSON.parse(String(init.body))).toMatchObject({ api_key: "phc_test", event: "$pageview", distinct_id: view.distinct_id, properties: { $process_person_profile: false } });

    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(sendPageview("phc_test", view, vi.fn(async () => Promise.reject(new Error("offline"))) as unknown as typeof fetch)).resolves.toBeUndefined();
    error.mockRestore();
  });
});

import { describe, expect, it } from "vitest";
import { carriedSource, carryLinks, firstTouchFrom } from "./source";

const HOST = "beans.followusai.com";
const url = (path: string) => new URL(path, `https://${HOST}`);
const carried = (path: string, referer: string | null) => carriedSource(url(path), referer, HOST)?.toString() ?? null;

describe("carriedSource", () => {
  it("starts a source on a visit from another site", () => {
    expect(carried("/pricing?utm_source=newsletter&utm_medium=email&other=1", "https://www.google.com/")).toBe(
      "ft_ref=https%3A%2F%2Fwww.google.com%2F&ft_lp=%2Fpricing&utm_source=newsletter&utm_medium=email",
    );
  });

  it("carries a direct visit's utm tags and landing page", () => {
    expect(carried("/?utm_campaign=launch", null)).toBe("ft_lp=%2F&utm_campaign=launch");
  });

  it("keeps a carried source while the visitor moves between pages", () => {
    expect(carried("/about?ft_ref=https%3A%2F%2Fnews.ycombinator.com%2F&ft_lp=%2F&utm_source=hn", `https://${HOST}/?ft_ref=x`)).toBe(
      "ft_ref=https%3A%2F%2Fnews.ycombinator.com%2F&ft_lp=%2F&utm_source=hn",
    );
  });

  it("carries nothing for a direct visit or a plain internal link", () => {
    expect(carried("/", null)).toBeNull();
    expect(carried("/pricing", `https://${HOST}/`)).toBeNull();
    // Beans' own subdomains, like the sign-in host, aren't another site.
    expect(carried("/", `https://accounts.${HOST}/`)).toBeNull();
  });

  it("cuts long values and ignores a landing path that isn't a path", () => {
    const out = carriedSource(url(`/?utm_source=${"x".repeat(500)}`), `https://example.com/${"y".repeat(500)}`, HOST)!;
    expect(out.get("utm_source")).toHaveLength(200);
    expect(out.get("ft_ref")).toHaveLength(300);
    expect(carried("/?ft_lp=https%3A%2F%2Fevil.example", null)).toBeNull();
  });
});

describe("carryLinks", () => {
  const html =
    '<a href="/">Beans</a><a href="/#day">Day</a><a href="/pricing">Pricing</a><a href="/sign-up" class="cta">Start</a>' +
    '<a href="/sign-in">Sign in</a><link rel="icon" href="/icon.svg"><a href="/video/beans-demo-web.mp4">Video</a>' +
    '<link rel="canonical" href="https://beans.followusai.com/pricing"><a href="mailto:support@followusai.com">Mail</a>';

  it("adds the source to links to marketing pages, sign-up and sign-in only", () => {
    const out = carryLinks(html, new URLSearchParams("ft_ref=https://x.com/&utm_source=x"));
    const q = "ft_ref=https%3A%2F%2Fx.com%2F&amp;utm_source=x";
    expect(out).toBe(
      `<a href="/?${q}">Beans</a><a href="/?${q}#day">Day</a><a href="/pricing?${q}">Pricing</a><a href="/sign-up?${q}" class="cta">Start</a>` +
        `<a href="/sign-in?${q}">Sign in</a><link rel="icon" href="/icon.svg"><a href="/video/beans-demo-web.mp4">Video</a>` +
        '<link rel="canonical" href="https://beans.followusai.com/pricing"><a href="mailto:support@followusai.com">Mail</a>',
    );
  });

  it("can't break out of the attribute", () => {
    const out = carryLinks('<a href="/sign-up">x</a>', new URLSearchParams({ utm_source: '"><script>alert(1)</script>' }));
    expect(out).not.toContain("<script>");
    expect(out).toMatch(/^<a href="\/sign-up\?utm_source=[^"]+">x<\/a>$/);
  });
});

describe("firstTouchFrom", () => {
  it("reads the carried source", () => {
    expect(firstTouchFrom(url("/sign-up?ft_ref=https%3A%2F%2Fwww.google.com%2F&ft_lp=%2Fpricing&utm_source=g&utm_term=planner"), `https://${HOST}/pricing`)).toEqual({
      first_touch_referrer: "https://www.google.com/",
      first_touch_referring_domain: "www.google.com",
      first_touch_landing_path: "/pricing",
      first_touch_utm_source: "g",
      first_touch_utm_term: "planner",
    });
  });

  it("marks carried tags with no referrer as direct", () => {
    expect(firstTouchFrom(url("/sign-up?ft_lp=%2F&utm_campaign=launch"), "")).toEqual({
      first_touch_referrer: "$direct",
      first_touch_referring_domain: "$direct",
      first_touch_landing_path: "/",
      first_touch_utm_campaign: "launch",
    });
  });

  it("falls back to another site linking straight to sign-up", () => {
    expect(firstTouchFrom(url("/sign-up"), "https://www.producthunt.com/")).toEqual({
      first_touch_referrer: "https://www.producthunt.com/",
      first_touch_referring_domain: "www.producthunt.com",
      first_touch_landing_path: "/sign-up",
    });
  });

  it("knows nothing about a visit from Beans' own pages without a carried source", () => {
    expect(firstTouchFrom(url("/sign-in"), `https://${HOST}/`)).toEqual({});
    expect(firstTouchFrom(url("/sign-in"), "")).toEqual({});
  });
});

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MARKETING_PATHS } from "../lib/source";
import { markdownFor } from "../marketing/markdown";
import { toolGroups, toolList, tools, toolsIn } from "./registry";
import { TOOL_SLUGS, toolPath } from "./slugs";
import type { ToolDef } from "./types";

const pageFile = (slug: string) => fileURLToPath(new URL(`../pages/tools/${slug}.tsx`, import.meta.url));

/** Every string a visitor reads on a tool's page. */
const copy = (tool: ToolDef): string[] => [
  tool.name,
  tool.blurb,
  tool.title,
  tool.description,
  tool.h1,
  tool.lede,
  ...tool.steps,
  ...tool.sections.flatMap((section) => [section.heading, ...section.body]),
  ...tool.faq.flatMap(({ q, a }) => [q, a]),
  tool.beans.heading,
  tool.beans.body,
];

/** docs/launch/voice.md: words Beans never uses, and the ones to avoid. */
const BANNED =
  /\b(ai-powered|supercharge|unlock|seamless|effortless|game-changer|revolutionary|productivity hack|world-class|next-level|10x|journey|empower|elevate|streamline|reimagine|all-in-one|simply|just|easily)\b/i;

describe("the tools registry", () => {
  it("has one tool per slug, in the same order", () => {
    expect(toolList.map((tool) => tool.slug)).toEqual([...TOOL_SLUGS]);
    expect(Object.keys(tools)).toHaveLength(TOOL_SLUGS.length);
    expect(toolList.length).toBeGreaterThanOrEqual(15);
  });

  it("puts every tool in a group that the index shows", () => {
    expect(toolGroups.flatMap((group) => toolsIn(group.id)).length).toBe(toolList.length);
    for (const group of toolGroups) expect(toolsIn(group.id).length).toBeGreaterThan(0);
  });

  it("gives every tool a page, a place in the proxy's list and a markdown version", () => {
    for (const slug of TOOL_SLUGS) {
      expect(existsSync(pageFile(slug)), `src/pages/tools/${slug}.tsx`).toBe(true);
      expect(readFileSync(pageFile(slug), "utf8")).toContain(`toolProps("${slug}")`);
      expect(MARKETING_PATHS.has(toolPath(slug))).toBe(true);
      expect(markdownFor(toolPath(slug))!.match(/^# /gm)).toHaveLength(1);
    }
    expect(markdownFor("/tools")).toContain("# Free tools");
  });

  it("keeps titles, descriptions and blurbs unique", () => {
    for (const field of ["title", "description", "blurb", "h1", "name"] as const) {
      expect(new Set(toolList.map((tool) => tool[field])).size, field).toBe(toolList.length);
    }
  });
});

describe.each(toolList.map((tool) => [tool.slug, tool] as const))("%s", (_, tool) => {
  it("has a full page of copy", () => {
    expect(tool.steps.length).toBeGreaterThanOrEqual(3);
    expect(tool.steps.length).toBeLessThanOrEqual(5);
    expect(tool.sections.length).toBeGreaterThanOrEqual(2);
    expect(tool.sections.length).toBeLessThanOrEqual(3);
    for (const section of tool.sections) expect(section.body.length).toBeGreaterThanOrEqual(1);
    expect(tool.faq.length).toBeGreaterThanOrEqual(4);
    expect(tool.faq.length).toBeLessThanOrEqual(5);
    expect(tool.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("offers three or four other tools, never itself", () => {
    expect(tool.related.length).toBeGreaterThanOrEqual(3);
    expect(tool.related.length).toBeLessThanOrEqual(4);
    expect(new Set(tool.related).size).toBe(tool.related.length);
    expect(tool.related).not.toContain(tool.slug);
    for (const slug of tool.related) expect(tools[slug], slug).toBeDefined();
  });

  it("follows the voice guide", () => {
    for (const text of copy(tool)) {
      expect(text.trim(), "no stray spaces").toBe(text);
      expect(text.length).toBeGreaterThan(0);
      expect(text, "banned or avoided word").not.toMatch(BANNED);
      expect(text, "no exclamation marks or em dashes").not.toMatch(/[!—]/);
      expect(text, "plain text, no markdown or HTML").not.toMatch(/\*\*|\]\(|<\/?[a-z]/);
    }
  });

  it("only calls Beans free for the 7-day trial", () => {
    const text = `${tool.beans.heading} ${tool.beans.body}`;
    expect(text).not.toMatch(/\bfree (plan|version|tier|forever)\b/i);
    expect(text).not.toMatch(/\bAI\b/);
  });
});

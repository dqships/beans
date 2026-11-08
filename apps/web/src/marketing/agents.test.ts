import { describe, expect, it } from "vitest";
import { SOURCE_URL } from "@/lib/site";
import { MCP_SCOPES, MCP_URL, RESOURCE_METADATA_PATH, RESOURCE_METADATA_URL } from "@/mcp/config";
import { resourceProperties } from "@/mcp/metadata";
import { TOOLS } from "@/mcp/tools";
import { jsonLd, PRODUCT_KEYWORDS } from "./head";
import { llmsTxt } from "./llms";
import { markdownFor } from "./markdown";
import { publicPages } from "./pages";

describe("llms.txt", () => {
  const lines = llmsTxt.split("\n");
  const firstSection = lines.findIndex((l) => l.startsWith("## "));

  it("follows the llmstxt.org layout: H1, blockquote, prose without headings, then H2 link lists", () => {
    expect(lines[0]).toBe("# Beans");
    expect(lines[2]).toMatch(/^> \S/);
    expect(lines.filter((l) => /^# /.test(l))).toHaveLength(1);
    expect(lines.slice(1, firstSection).some((l) => /^#{1,6} /.test(l))).toBe(false);
    for (const line of lines.slice(firstSection)) {
      if (line === "" || line.startsWith("## ")) continue;
      expect(line).toMatch(/^- \[[^\]]+\]\(https?:\/\/[^)\s]+\)(: .+)?$/);
    }
  });

  it("tells agents when to use Beans and how to call it", () => {
    const guide = lines.slice(0, firstSection).join("\n");
    expect(guide).toContain("**When to use Beans.**");
    expect(guide).toContain("**How to call Beans.**");
    expect(guide).toContain(MCP_URL);
    expect(guide).toContain(MCP_SCOPES.join(" "));
    for (const tool of TOOLS) expect(guide).toContain(`\`${tool.name}\``);
  });

  it("links the MCP server, its OAuth metadata and the setup page", () => {
    expect(llmsTxt).toContain("## MCP server");
    expect(llmsTxt).toContain(`](${MCP_URL})`);
    expect(llmsTxt).toContain(`](${RESOURCE_METADATA_URL})`);
    expect(llmsTxt).toMatch(/\]\([^)]*\/connect-ai\)/);
  });
});

describe("source code link", () => {
  it("points at the public repo from llms.txt and the home page's markdown", () => {
    expect(SOURCE_URL).toBe("https://github.com/dqships/beans");
    expect(llmsTxt).toContain(`## Source code\n\n- [Beans on GitHub](${SOURCE_URL})`);
    expect(markdownFor("/")).toContain(`](${SOURCE_URL})`);
  });
});

describe("protected resource metadata", () => {
  it("lives on the MCP host, at the path RFC 9728 derives from the MCP address", () => {
    expect(RESOURCE_METADATA_URL).toBe(`https://mcp.beans.followusai.com${RESOURCE_METADATA_PATH}`);
  });

  it("declares the scopes and the app's documentation, policy and terms", () => {
    const props = resourceProperties("https://beans.followusai.com");
    expect(props.scopes_supported).toEqual([...MCP_SCOPES]);
    expect(props.resource_documentation).toBe("https://beans.followusai.com/connect-ai");
    expect(props.resource_policy_uri).toBe("https://beans.followusai.com/privacy");
    expect(props.resource_tos_uri).toBe("https://beans.followusai.com/terms");
    expect(props.bearer_methods_supported).toEqual(["header"]);
  });
});

describe("connect page", () => {
  it("puts the MCP server in the title", () => {
    expect(publicPages.connectAi.title).toContain("Beans MCP server");
  });

  it("documents the permissions an AI app gets", () => {
    const body = markdownFor(publicPages.connectAi.path)!;
    expect(body).toContain("## Permissions");
    for (const scope of MCP_SCOPES) expect(body).toContain(`\`${scope}\``);
    expect(body).toContain(RESOURCE_METADATA_URL);
  });
});

describe("JSON-LD", () => {
  type Node = Record<string, unknown> & { "@type": string };
  const graph = (JSON.parse(jsonLd(publicPages.home)) as { "@graph": Node[] })["@graph"];
  const app = graph.find((n) => n["@type"] === "WebApplication")!;
  const org = graph.find((n) => n["@type"] === "Organization")!;

  it("names product terms that the home page itself uses", () => {
    expect(app.keywords).toBe(PRODUCT_KEYWORDS.join(", "));
    const home = markdownFor("/")!.toLowerCase();
    for (const term of PRODUCT_KEYWORDS) expect(home).toContain(term.toLowerCase());
  });

  it("gives the Organization a contact point and a postal address", () => {
    expect(org.contactPoint).toMatchObject({ "@type": "ContactPoint", contactType: "customer support", email: "support@followusai.com" });
    expect(org.address).toEqual({ "@type": "PostalAddress", addressRegion: "MI", addressCountry: "US" });
  });
});

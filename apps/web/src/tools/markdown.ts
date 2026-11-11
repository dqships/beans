import { absoluteUrl } from "../lib/site";
import { toolGroups, toolList, tools, toolsIn } from "./registry";
import { TOOLS_PATH, toolPath } from "./slugs";
import type { ToolDef } from "./types";

/**
 * Markdown versions of the tools index and each tool's page, served by
 * `proxy.ts` like the other public pages. They come straight from the
 * registry, so they can't drift from the pages.
 */

const link = (tool: ToolDef) => `[${tool.name}](${absoluteUrl(toolPath(tool.slug))})`;

export function toolMarkdown(tool: ToolDef): string {
  const url = absoluteUrl(toolPath(tool.slug));
  return `# ${tool.h1}

${tool.lede}

The tool itself runs in a browser: [open ${tool.name}](${url}).${tool.saves ? " It saves in that browser only. Nothing typed into it is sent to Beans." : ""}

## How to use it

${tool.steps.map((step, i) => `${i + 1}. ${step}`).join("\n")}

${tool.sections.map((section) => `## ${section.heading}\n\n${section.body.join("\n\n")}`).join("\n\n")}

## Questions

${tool.faq.map(({ q, a }) => `- **${q}** ${a}`).join("\n")}

## ${tool.beans.heading}

${tool.beans.body}

- [Start planning](${absoluteUrl("/sign-up")})
- [Pricing](${absoluteUrl("/pricing")})

## More free tools

${tool.related.map((slug) => `- ${link(tools[slug])}: ${tools[slug].blurb}`).join("\n")}
- [All free tools](${absoluteUrl(TOOLS_PATH)})
`;
}

export const toolsIndexMarkdown = `# Free tools for planning your time

${toolList.length} timers, planners and calculators that work in a browser. There's no account to make, and what you type stays on your device.

${toolGroups
  .map(
    (group) => `## ${group.name}

${group.about}

${toolsIn(group.id)
  .map((tool) => `- ${link(tool)}: ${tool.blurb}`)
  .join("\n")}`,
  )
  .join("\n\n")}

## These are pieces of Beans

Beans is a daily planner. It keeps your to-do list, your week and your schedule for the day together, with the timer built in. Try it free for 7 days.

- [Start planning](${absoluteUrl("/sign-up")})
- [Pricing](${absoluteUrl("/pricing")})
`;

/** Path to markdown, for the tools index and every tool. */
export const toolMarkdownBodies: Record<string, string> = {
  [TOOLS_PATH]: toolsIndexMarkdown,
  ...Object.fromEntries(toolList.map((tool) => [toolPath(tool.slug), toolMarkdown(tool)])),
};

import type { ToolSlug } from "./slugs";

export type ToolGroup = "timers" | "plan" | "tasks" | "time";

/** The mascot poses in `public/illustrations` that a tool page can close with. All are 640 by 480. */
export type ToolPose = "focus" | "timebox" | "planning" | "brain-dump" | "analytics" | "rollover";

/**
 * One free tool: its head tags and every word on its page. The page, its
 * markdown version, the tools index, `llms.txt` and the sitemap all read
 * this, so the copy lives in one place. Text is plain: no markdown, no HTML.
 */
export type ToolDef = {
  slug: ToolSlug;
  group: ToolGroup;
  /** Short name for lists and breadcrumbs: "Pomodoro timer". */
  name: string;
  /** One line for the tools index and "More free tools". */
  blurb: string;
  /** `<title>`, 30 to 60 characters. */
  title: string;
  /** Meta description, 120 to 160 characters. */
  description: string;
  h1: string;
  lede: string;
  /** "How to use it", in order. */
  steps: string[];
  /** Reading sections under the tool. Each answers something people search for. */
  sections: { heading: string; body: string[] }[];
  faq: { q: string; a: string }[];
  /** How Beans does the same job, above the Start planning button. Only facts from docs/launch/voice.md. */
  beans: { heading: string; body: string; pose: ToolPose };
  /** Three or four other tools to offer next. */
  related: ToolSlug[];
  /** Tools that need the full page width: grids and tables. */
  wide?: boolean;
  /** True when the tool keeps what you type in this browser's local storage. */
  saves?: boolean;
  lastModified: string;
};

/** What a tool page needs about another tool to link to it. */
export type ToolLink = { slug: ToolSlug; name: string; blurb: string };

/** `terms` is the trial and price line, worked out at build time from the plans. */
export type ToolPageProps = { tool: ToolDef; related: ToolLink[]; terms: string };

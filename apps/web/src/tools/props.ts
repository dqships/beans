import type { GetStaticPropsResult } from "next";
import { PLANS, TRIAL_DAYS } from "@beans/core/billing";
import { tools } from "./registry";
import type { ToolSlug } from "./slugs";
import type { ToolPageProps } from "./types";

const dollars = (cents: number) => "$" + cents / 100;

/** The same facts the pricing page states. */
const terms = `Beans is free for ${TRIAL_DAYS} days, then ${dollars(PLANS.monthly.amount)} a month or ${dollars(PLANS.yearly.amount)} a year.`;

/**
 * `getStaticProps` for a tool's page. It runs at build time only, so the
 * registry's copy for all the other tools stays out of the page's JavaScript.
 */
export function toolProps(slug: ToolSlug): GetStaticPropsResult<ToolPageProps> {
  const tool = tools[slug];
  return {
    props: {
      tool,
      related: tool.related.map((other) => ({ slug: other, name: tools[other].name, blurb: tools[other].blurb })),
      terms,
    },
  };
}

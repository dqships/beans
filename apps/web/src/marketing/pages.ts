/** Every public page: its path, its head tags, and when its content last changed. */
export type PublicPage = {
  path: string;
  title: string;
  description: string;
  lastModified: string;
};

export const publicPages = {
  home: {
    path: "/",
    title: "Beans: a daily planner for your tasks and your time",
    description:
      "Beans is a daily planner. Write down everything you need to do, choose what you'll get to today, and block out the time to do it on your schedule.",
    lastModified: "2026-10-31",
  },
  pricing: {
    path: "/pricing",
    title: "Beans pricing: try the daily planner free for 7 days",
    description:
      "Beans costs $6 a month or $48 a year after a 7-day free trial. Every part of the daily planner is included, and you can cancel any time in Settings.",
    lastModified: "2026-11-02",
  },
  about: {
    path: "/about",
    title: "About Beans, a daily planner for your whole to-do list",
    description:
      "Beans is a daily planner. It keeps your to-do list, your week and your schedule for the day together, in the browser on a computer or a phone.",
    lastModified: "2026-11-02",
  },
  contact: {
    path: "/contact",
    title: "Contact Beans: email support for help and billing",
    description:
      "Email support@followusai.com for help with Beans: the planner, billing, refunds, cancelling, deleting your account or getting a copy of your data.",
    lastModified: "2026-11-02",
  },
  connectAi: {
    path: "/connect-ai",
    title: "Connect Claude, ChatGPT or Cursor to your Beans planner",
    description:
      "Paste one address into Claude, ChatGPT, Cursor or another MCP app, sign in to Beans, and your AI can plan your days, add tasks and read your analytics.",
    lastModified: "2026-11-03",
  },
  privacy: {
    path: "/privacy",
    title: "Beans privacy policy: what the planner stores and why",
    description:
      "What Beans collects, why, and who handles it: Clerk for sign-in, Convex for your planner, Stripe for payments, Vercel for hosting and PostHog for analytics.",
    lastModified: "2026-11-04",
  },
  terms: {
    path: "/terms",
    title: "Beans terms of service: trial, billing and refunds",
    description:
      "The terms for using Beans: accounts, the 7-day free trial, subscriptions, cancelling, 14-day refunds, discount codes and what you can expect from us.",
    lastModified: "2026-11-03",
  },
} satisfies Record<string, PublicPage>;

export const publicPageList: PublicPage[] = Object.values(publicPages);

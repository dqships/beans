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
  about: {
    path: "/about",
    title: "About Beans, a daily planner for your whole to-do list",
    description:
      "Beans is a daily planner. It keeps your to-do list, your week and your schedule for the day together, in the browser on a computer or a phone.",
    lastModified: "2026-10-31",
  },
  contact: {
    path: "/contact",
    title: "Contact Beans: how to reach the daily planner",
    description:
      "How to reach the people behind Beans, the daily planner. There is no public address yet, and this page is where it will go as soon as it is set up.",
    lastModified: "2026-10-31",
  },
  privacy: {
    path: "/privacy",
    title: "Privacy at Beans: what the planner stores (draft)",
    description:
      "A draft of the Beans privacy page, waiting on legal review. It says what is stored: account details with Clerk, and your planner data with Convex.",
    lastModified: "2026-10-31",
  },
  terms: {
    path: "/terms",
    title: "Terms for using the Beans daily planner (draft)",
    description:
      "A draft of the Beans terms of use, waiting on legal review. Read it as a plain outline of how Beans works, and not yet as a final agreement between us.",
    lastModified: "2026-10-31",
  },
} satisfies Record<string, PublicPage>;

export const publicPageList: PublicPage[] = Object.values(publicPages);

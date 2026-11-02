/**
 * Which sign-in Beans uses, fixed at build time from public env vars.
 * - clerk: Clerk keys and a Convex URL are set. Production always uses this.
 * - test: local end-to-end runs only. Needs NEXT_PUBLIC_BEANS_TEST_AUTH=1 and
 *   is impossible in a production build, where NODE_ENV is "production".
 * - sample: local development with no backend; sample data in the tab.
 * - unconfigured: a production build missing its keys.
 */
export type AuthMode = "clerk" | "test" | "sample" | "unconfigured";

export const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? "";

export const authMode: AuthMode = (() => {
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && convexUrl) return "clerk";
  if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_BEANS_TEST_AUTH === "1" && convexUrl) return "test";
  if (process.env.NODE_ENV !== "production") return "sample";
  return "unconfigured";
})();

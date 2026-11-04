import { firstTouchFrom, type FirstTouch } from "@/lib/source";

/**
 * Where this visitor first came from, read once per browser tab on the
 * sign-in or sign-up page (the marketing pages carry it there in the link,
 * see `@/lib/source`) and kept in session storage until the tab closes.
 * The first page decides, so coming back from Google sign-in or Stripe
 * doesn't replace it. It goes to PostHog as `$set_once` person properties
 * on identify, and to `planner.init` for `signed_up`.
 */
const KEY = "beans:first-touch";

function read(): FirstTouch | null {
  try {
    const saved = window.sessionStorage.getItem(KEY);
    return saved === null ? null : (JSON.parse(saved) as FirstTouch);
  } catch {
    return null;
  }
}

/** Notes the source on the first sign-in or sign-up page this tab opens. */
export function rememberFirstTouch() {
  if (typeof window === "undefined" || !/^\/sign-(in|up)(\/|$)/.test(window.location.pathname) || read() !== null) return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(firstTouchFrom(new URL(window.location.href), document.referrer)));
  } catch {
    // Storage blocked: the source is simply unknown.
  }
}

/** The remembered source, or undefined when nothing is known. */
export function firstTouch(): FirstTouch | undefined {
  if (typeof window === "undefined") return undefined;
  const saved = read();
  return saved && Object.keys(saved).length ? saved : undefined;
}

export function forgetFirstTouch() {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to forget.
  }
}

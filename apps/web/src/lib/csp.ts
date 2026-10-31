/**
 * Content-Security-Policy for both halves of the site. Marketing pages ship no
 * framework JavaScript, so they get a strict policy. The planner and sign-in
 * need Clerk, Convex and Next's inline bootstrap scripts.
 *
 * `next.config.ts` builds these once, at build time, from the same public env
 * vars the app reads.
 */

type Directives = Record<string, string[]>;

const CONVEX_CLOUD = ["https://*.convex.cloud", "wss://*.convex.cloud"];
const TURNSTILE = "https://challenges.cloudflare.com";
const CLERK_IMAGES = "https://img.clerk.com";
const CLERK_TELEMETRY = "https://clerk-telemetry.com";

function serialize(directives: Directives): string {
  return Object.entries(directives)
    .map(([name, values]) => [name, ...values].join(" "))
    .join("; ");
}

const shared: Directives = {
  "default-src": ["'self'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'self'"],
  "object-src": ["'none'"],
};

/**
 * The Clerk Frontend API host is encoded in the publishable key: base64 of
 * `<host>$`. Development keys give `<slug>.clerk.accounts.dev`, production keys
 * give `clerk.<your domain>`, so a production domain needs no policy edit.
 */
export function clerkFrontendApi(publishableKey: string | undefined): string | null {
  const encoded = publishableKey?.split("_")[2];
  if (!encoded) return null;
  const host = Buffer.from(encoded, "base64").toString("utf8").replace(/\$$/, "");
  return /^[a-z0-9.-]+$/i.test(host) ? host : null;
}

/** Turns a Convex deployment URL into the https and wss origins it needs. */
function convexOrigins(convexUrl: string | undefined): string[] {
  if (!convexUrl) return [];
  try {
    const { protocol, host } = new URL(convexUrl);
    return [`${protocol}//${host}`, `${protocol === "https:" ? "wss:" : "ws:"}//${host}`];
  } catch {
    return [];
  }
}

export function marketingPolicy({ dev }: { dev: boolean }): string {
  return serialize({
    ...shared,
    // Turbopack's dev client needs eval, inline bootstrap and its own socket.
    "script-src": dev ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] : ["'self'"],
    "style-src": dev ? ["'self'", "'unsafe-inline'"] : ["'self'"],
    "img-src": ["'self'", "data:"],
    "font-src": ["'self'"],
    "media-src": ["'self'"],
    "connect-src": dev ? ["'self'", "ws://localhost:*", "ws://127.0.0.1:*"] : ["'self'"],
  });
}

export function appPolicy({
  dev,
  clerkPublishableKey,
  convexUrl,
}: {
  dev: boolean;
  clerkPublishableKey?: string;
  convexUrl?: string;
}): string {
  const clerkHost = clerkFrontendApi(clerkPublishableKey);
  const clerk = clerkHost ? [`https://${clerkHost}`] : [];
  return serialize({
    ...shared,
    // Next's streamed bootstrap, the theme script and Clerk's loader run inline.
    "script-src": ["'self'", "'unsafe-inline'", ...clerk, TURNSTILE, ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", CLERK_IMAGES],
    "font-src": ["'self'", "data:"],
    "media-src": ["'self'"],
    "connect-src": [
      "'self'",
      ...clerk,
      CLERK_TELEMETRY,
      ...CONVEX_CLOUD,
      ...convexOrigins(convexUrl),
      ...(dev ? ["ws://localhost:*", "ws://127.0.0.1:*", "http://127.0.0.1:*"] : []),
    ],
    "frame-src": ["'self'", ...clerk, TURNSTILE],
    "worker-src": ["'self'", "blob:"],
  });
}

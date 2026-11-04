import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { markdownFor, notFoundMarkdown, prefersMarkdown } from "@/marketing/markdown";
import { isMcpHost, isMcpPath, MCP_PATH } from "@/mcp/config";
import { mcpHomePage } from "@/mcp/home";
import { siteUrl } from "@/lib/site";
import { isBot, isPrefetch, pageviewFor, sendPageview } from "@/lib/pageview";
import { carriedSource, carryLinks, MARKETING_PATHS } from "@/lib/source";

/**
 * Clerk's request handling, when Clerk is set up, on the routes that use it.
 * Pages check sign-in themselves, close to the data, as Clerk recommends.
 * Marketing pages never reach Clerk.
 */
const clerk =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY ? clerkMiddleware() : null;

const CLERK_ROUTES = /^\/(app|sign-in|sign-up|api|__clerk|mcp)(\/|$)/;

/** The app's own host in production, which leaves the MCP addresses to the MCP host. */
const appHost = /^https:\/\//.test(siteUrl) ? new URL(siteUrl).host : null;

const notFound = () => new NextResponse("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });

const markdownHeaders = { "Content-Type": "text/markdown; charset=utf-8", Vary: "Accept" };

/** PostHog page views go out from the production site only, and only with the project key set. */
const postHogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

/** Marks the proxy's own request for a page whose links it rewrites, so that request isn't counted or rewritten again. */
const CARRY_HEADER = "x-beans-carry";

/**
 * The marketing page with its links carrying the visitor's source (see
 * `@/lib/source`). It reads the page as normally served and rewrites the
 * links, so the page still ships no JavaScript and sets no cookies. Not
 * cached, because the links are this visitor's. Falls back to the plain page
 * on any failure.
 */
async function withCarriedLinks(request: NextRequest, carried: URLSearchParams): Promise<Response> {
  try {
    const res = await fetch(new URL(request.nextUrl.pathname, request.url), {
      headers: { [CARRY_HEADER]: "1", accept: "text/html", "user-agent": request.headers.get("user-agent") ?? "" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok || !res.headers.get("content-type")?.includes("text/html")) return NextResponse.next();
    const headers = new Headers(res.headers);
    for (const name of ["content-encoding", "content-length", "transfer-encoding", "etag", "age", "x-vercel-cache", "set-cookie"]) headers.delete(name);
    headers.set("cache-control", "private, no-store");
    return new NextResponse(carryLinks(await res.text(), carried), { status: 200, headers });
  } catch (err) {
    console.error("carrying the source failed", err);
    return NextResponse.next();
  }
}

/**
 * A marketing page: the anonymous PostHog page view, sent after the response,
 * and, for a visit from another site or with `utm_*` tags, links that carry
 * where the visitor came from.
 */
async function marketingPage(request: NextRequest, event: NextFetchEvent, host: string): Promise<Response> {
  if (request.headers.has(CARRY_HEADER)) return NextResponse.next();
  if (postHogKey && host === appHost) {
    const key = postHogKey;
    event.waitUntil(
      pageviewFor({ method: request.method, url: request.nextUrl, headers: request.headers, host }, Date.now()).then((view) => (view ? sendPageview(key, view) : undefined)),
    );
  }
  if (request.method !== "GET" || isBot(request.headers.get("user-agent")) || isPrefetch(request.headers)) return NextResponse.next();
  const carried = carriedSource(request.nextUrl, request.headers.get("referer"), host);
  return carried ? await withCarriedLinks(request, carried) : NextResponse.next();
}

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";

  // The MCP host serves only the MCP server, its public OAuth metadata, and a
  // home page that carries the Beans icons.
  if (isMcpHost(host)) {
    if (pathname === "/" && (request.method === "GET" || request.method === "HEAD")) return mcpHomePage();
    if (!isMcpPath(pathname)) return notFound();
    if (pathname !== MCP_PATH) return NextResponse.next();
  } else if (isMcpPath(pathname)) {
    if (host === appHost) return notFound();
    if (pathname !== MCP_PATH) return NextResponse.next();
  }

  if (CLERK_ROUTES.test(pathname)) return clerk ? clerk(request, event) : NextResponse.next();

  const read = request.method === "GET" || request.method === "HEAD";
  // `/pricing.md` and friends: the same markdown at a URL of its own. `/index.md` is the home page.
  if (read && pathname.endsWith(".md")) {
    const body = markdownFor(pathname === "/index.md" ? "/" : pathname.slice(0, -3));
    if (body) return new NextResponse(body, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
  }
  if (read && prefersMarkdown(request.headers.get("accept"))) {
    const body = markdownFor(pathname);
    return new NextResponse(body ?? notFoundMarkdown, { status: body ? 200 : 404, headers: markdownHeaders });
  }

  if (MARKETING_PATHS.has(pathname)) return marketingPage(request, event, host);
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|avif|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|txt|xml|mp4|webm|vtt)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};

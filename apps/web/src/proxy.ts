import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { markdownFor, notFoundMarkdown, prefersMarkdown } from "@/marketing/markdown";

/**
 * Clerk's request handling, when Clerk is set up, on the routes that use it.
 * Pages check sign-in themselves, close to the data, as Clerk recommends.
 * Marketing pages never reach Clerk.
 */
const clerk =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY ? clerkMiddleware() : null;

const CLERK_ROUTES = /^\/(app|sign-in|sign-up|api|__clerk)(\/|$)/;

const markdownHeaders = { "Content-Type": "text/markdown; charset=utf-8", Vary: "Accept" };

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

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

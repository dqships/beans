import { createHash } from "node:crypto";
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { Head, Html, Main, NextScript, type DocumentProps } from "next/document";
import { hashedScriptPolicy } from "@/lib/csp";

/**
 * Production marketing pages run no React, so `landing.js` owns the DOM. In
 * development Next hydrates these pages anyway, and the two would collide, so
 * the landing page adds the script itself once hydration is done.
 */
const production = process.env.NODE_ENV === "production";

/**
 * Vercel Web Analytics. These pages run no React, so they load Vercel's script
 * directly instead of `<Analytics />`. It's served from this site, so the CSP
 * needs nothing new, and only exists on Vercel, so local builds leave it out.
 */
const analyticsScript = process.env.VERCEL ? "/_vercel/insights/script.js" : null;

type ScriptProps = { children?: ReactNode; src?: string; type?: string; dangerouslySetInnerHTML?: { __html?: string } };

/** The source of every inline script in what `Head` rendered that a browser would run. JSON blocks, such as JSON-LD, don't count. */
function inlineScripts(node: ReactNode, found: string[] = []): string[] {
  Children.forEach(node, (child) => {
    if (!isValidElement<ScriptProps>(child)) return;
    const { children, src, type, dangerouslySetInnerHTML } = child.props;
    const source = dangerouslySetInnerHTML?.__html;
    if (child.type === "script" && !src && source && (!type || type === "text/javascript" || type === "module")) found.push(source);
    inlineScripts(children, found);
  });
  return found;
}

/**
 * A page that hydrates (each free tool) gets one inline script from Next's
 * production build. This adds a `<meta>` policy naming that script by its
 * hash, ahead of everything else in the head, so it's the only inline script
 * the page will run (see `toolsPolicy` in `lib/csp.ts`). Pages with no inline
 * script, which is every other public page, get no tag. Development is left
 * alone, because Next's dev client needs eval and its own inline scripts.
 */
class HashedHead extends Head {
  render() {
    const head = super.render() as ReactElement<{ children?: ReactNode }>;
    if (!production) return head;
    const hashes = inlineScripts(head.props.children).map((source) => createHash("sha256").update(source).digest("base64"));
    if (!hashes.length) return head;
    return cloneElement(head, undefined, <meta key="script-policy" httpEquiv="Content-Security-Policy" content={hashedScriptPolicy(hashes)} />, head.props.children);
  }
}

export default function Document({ __NEXT_DATA__ }: DocumentProps) {
  return (
    <Html lang="en">
      <HashedHead>
        {production && __NEXT_DATA__.page === "/" ? <script src="/landing.js" defer /> : null}
        {analyticsScript ? <script src={analyticsScript} defer /> : null}
      </HashedHead>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

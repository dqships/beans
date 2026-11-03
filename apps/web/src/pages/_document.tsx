import { Head, Html, Main, NextScript, type DocumentProps } from "next/document";

/**
 * Production marketing pages run no React, so `landing.js` owns the DOM. In
 * development Next hydrates these pages anyway, and the two would collide, so
 * the landing page adds the script itself once hydration is done.
 */
const landingScript = process.env.NODE_ENV === "production";

/**
 * Vercel Web Analytics. These pages run no React, so they load Vercel's script
 * directly instead of `<Analytics />`. It's served from this site, so the CSP
 * needs nothing new, and only exists on Vercel, so local builds leave it out.
 */
const analyticsScript = process.env.VERCEL ? "/_vercel/insights/script.js" : null;

export default function Document({ __NEXT_DATA__ }: DocumentProps) {
  return (
    <Html lang="en">
      <Head>
        {landingScript && __NEXT_DATA__.page === "/" ? <script src="/landing.js" defer /> : null}
        {analyticsScript ? <script src={analyticsScript} defer /> : null}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

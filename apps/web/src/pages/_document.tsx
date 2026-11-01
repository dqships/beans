import { Head, Html, Main, NextScript, type DocumentProps } from "next/document";

/**
 * Production marketing pages run no React, so `landing.js` owns the DOM. In
 * development Next hydrates these pages anyway, and the two would collide, so
 * the script only ships in production builds.
 */
const landingScript = process.env.NODE_ENV === "production";

export default function Document({ __NEXT_DATA__ }: DocumentProps) {
  return (
    <Html lang="en">
      <Head>{landingScript && __NEXT_DATA__.page === "/" ? <script src="/landing.js" defer /> : null}</Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

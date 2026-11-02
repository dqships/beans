import { useEffect } from "react";
import type { PageConfig } from "next";
import { SiteFooter, SiteHeader } from "@/marketing/chrome";
import { Closing, Day, Film, Midnight, Packet, Vine, gardenClass, stalkClass } from "@/marketing/day";
import { Demo, Hero } from "@/marketing/hero";
import { PageHead } from "@/marketing/head";
import { publicPages } from "@/marketing/pages";

export const config: PageConfig = { unstable_runtimeJS: false };

export default function Landing() {
  useLandingScriptInDev();
  return (
    <>
      <PageHead page={publicPages.home} />
      <SiteHeader />
      <main>
        <Hero />
        <div className={stalkClass} data-stalk>
          <Demo />
          {/* Between the two on purpose: the bean paints over the demo and under what's on the vine below. */}
          <Vine />
          <div className={gardenClass}>
            <Film />
            <Day />
            <Midnight />
            <Packet />
            <Closing />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

/**
 * Production ships this page with no React, and `_document` adds `landing.js`. In development React
 * hydrates the page, so the script waits until that's done, which keeps the two from colliding.
 */
function useLandingScriptInDev() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || document.querySelector('script[src="/landing.js"]')) return;
    const script = document.createElement("script");
    script.src = "/landing.js";
    document.body.appendChild(script);
  }, []);
}

import type { PageConfig } from "next";
import { SiteFooter, SiteHeader } from "@/marketing/chrome";
import { Closing, Day, Film, Midnight, Packet, Vine, gardenClass, stalkClass } from "@/marketing/day";
import { Demo, Hero } from "@/marketing/hero";
import { PageHead } from "@/marketing/head";
import { publicPages } from "@/marketing/pages";

export const config: PageConfig = { unstable_runtimeJS: false };

export default function Landing() {
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

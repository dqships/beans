import type { PageConfig } from "next";
import { SiteFooter, SiteHeader } from "@/marketing/chrome";
import { Closing, Day, Film, Midnight, Packet, Vine, gardenClass } from "@/marketing/day";
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
        <Demo />
        <div className={gardenClass}>
          <Vine />
          <Film />
          <Day />
          <Midnight />
          <Packet />
          <Closing />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

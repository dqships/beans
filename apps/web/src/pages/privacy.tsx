import type { PageConfig } from "next";
import { legalUpdated, privacyBody } from "@/marketing/legal";
import { MarkdownBody } from "@/marketing/markdown-body";
import { publicPages } from "@/marketing/pages";
import { ProsePage } from "@/marketing/prose";

export const config: PageConfig = { unstable_runtimeJS: false };

export default function Privacy() {
  return (
    <ProsePage page={publicPages.privacy} title="Privacy policy" updated={legalUpdated}>
      <MarkdownBody source={privacyBody} />
    </ProsePage>
  );
}

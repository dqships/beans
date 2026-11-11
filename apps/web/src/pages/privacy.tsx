import type { PageConfig } from "next";
import { privacyBody, privacyUpdated } from "@/marketing/legal";
import { MarkdownBody } from "@/marketing/markdown-body";
import { publicPages } from "@/marketing/pages";
import { ProsePage } from "@/marketing/prose";

export const config: PageConfig = { unstable_runtimeJS: false };

export default function Privacy() {
  return (
    <ProsePage page={publicPages.privacy} title="Privacy policy" updated={privacyUpdated}>
      <MarkdownBody source={privacyBody} />
    </ProsePage>
  );
}

import type { PageConfig } from "next";
import { legalUpdated, termsBody } from "@/marketing/legal";
import { MarkdownBody } from "@/marketing/markdown-body";
import { publicPages } from "@/marketing/pages";
import { ProsePage } from "@/marketing/prose";

export const config: PageConfig = { unstable_runtimeJS: false };

export default function Terms() {
  return (
    <ProsePage page={publicPages.terms} title="Terms of service" updated={legalUpdated}>
      <MarkdownBody source={termsBody} />
    </ProsePage>
  );
}

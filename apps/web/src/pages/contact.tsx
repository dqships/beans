import type { PageConfig } from "next";
import { contactBody } from "@/marketing/legal";
import { MarkdownBody } from "@/marketing/markdown-body";
import { publicPages } from "@/marketing/pages";
import { ProsePage } from "@/marketing/prose";

export const config: PageConfig = { unstable_runtimeJS: false };

export default function Contact() {
  return (
    <ProsePage page={publicPages.contact} title="Contact">
      <MarkdownBody source={contactBody} />
    </ProsePage>
  );
}

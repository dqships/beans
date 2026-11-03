import type { PageConfig } from "next";
import { connectBody } from "@/marketing/connect";
import { MarkdownBody } from "@/marketing/markdown-body";
import { publicPages } from "@/marketing/pages";
import { ProsePage } from "@/marketing/prose";

export const config: PageConfig = { unstable_runtimeJS: false };

export default function ConnectAi() {
  return (
    <ProsePage page={publicPages.connectAi} title="Connect your AI app to Beans">
      <MarkdownBody source={connectBody} />
    </ProsePage>
  );
}

/* eslint-disable @next/next/no-html-link-for-pages -- no client runtime here, so links are plain anchors. */
import type { PageConfig } from "next";
import { publicPages } from "@/marketing/pages";
import { ProsePage } from "@/marketing/prose";

export const config: PageConfig = { unstable_runtimeJS: false };

export default function Contact() {
  return (
    <ProsePage page={publicPages.contact} title="Contact">
      <p>Beans doesn&apos;t have a public contact address yet. When it does, it will be on this page.</p>
      <p>For now, these pages answer the common questions:</p>
      <ul>
        <li>
          <a href="/about">About Beans</a>
        </li>
        <li>
          <a href="/privacy">Privacy (draft)</a>
        </li>
        <li>
          <a href="/terms">Terms (draft)</a>
        </li>
      </ul>
    </ProsePage>
  );
}

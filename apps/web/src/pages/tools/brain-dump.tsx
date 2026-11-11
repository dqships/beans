import type { GetStaticProps } from "next";
import { ToolPage } from "@/tools/page";
import { toolProps } from "@/tools/props";
import type { ToolPageProps } from "@/tools/types";
import { BrainDump } from "@/tools/ui/BrainDump";

export const getStaticProps: GetStaticProps<ToolPageProps> = () => toolProps("brain-dump");

export default function Page(props: ToolPageProps) {
  return (
    <ToolPage {...props}>
      <BrainDump />
    </ToolPage>
  );
}

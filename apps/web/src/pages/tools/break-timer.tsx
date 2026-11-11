import type { GetStaticProps } from "next";
import { ToolPage } from "@/tools/page";
import { toolProps } from "@/tools/props";
import type { ToolPageProps } from "@/tools/types";
import { BreakTimer } from "@/tools/ui/BreakTimer";

export const getStaticProps: GetStaticProps<ToolPageProps> = () => toolProps("break-timer");

export default function Page(props: ToolPageProps) {
  return (
    <ToolPage {...props}>
      <BreakTimer />
    </ToolPage>
  );
}

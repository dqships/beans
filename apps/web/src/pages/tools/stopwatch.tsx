import type { GetStaticProps } from "next";
import { ToolPage } from "@/tools/page";
import { toolProps } from "@/tools/props";
import type { ToolPageProps } from "@/tools/types";
import { Stopwatch } from "@/tools/ui/Stopwatch";

export const getStaticProps: GetStaticProps<ToolPageProps> = () => toolProps("stopwatch");

export default function Page(props: ToolPageProps) {
  return (
    <ToolPage {...props}>
      <Stopwatch />
    </ToolPage>
  );
}

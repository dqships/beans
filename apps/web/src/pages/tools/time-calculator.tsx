import type { GetStaticProps } from "next";
import { ToolPage } from "@/tools/page";
import { toolProps } from "@/tools/props";
import type { ToolPageProps } from "@/tools/types";
import { TimeCalculator } from "@/tools/ui/TimeCalculator";

export const getStaticProps: GetStaticProps<ToolPageProps> = () => toolProps("time-calculator");

export default function Page(props: ToolPageProps) {
  return (
    <ToolPage {...props}>
      <TimeCalculator />
    </ToolPage>
  );
}

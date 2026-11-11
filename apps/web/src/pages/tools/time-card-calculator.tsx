import type { GetStaticProps } from "next";
import { ToolPage } from "@/tools/page";
import { toolProps } from "@/tools/props";
import type { ToolPageProps } from "@/tools/types";
import { TimeCardCalculator } from "@/tools/ui/TimeCardCalculator";

export const getStaticProps: GetStaticProps<ToolPageProps> = () => toolProps("time-card-calculator");

export default function Page(props: ToolPageProps) {
  return (
    <ToolPage {...props}>
      <TimeCardCalculator />
    </ToolPage>
  );
}

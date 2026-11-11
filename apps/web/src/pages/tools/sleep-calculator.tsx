import type { GetStaticProps } from "next";
import { ToolPage } from "@/tools/page";
import { toolProps } from "@/tools/props";
import type { ToolPageProps } from "@/tools/types";
import { SleepCalculator } from "@/tools/ui/SleepCalculator";

export const getStaticProps: GetStaticProps<ToolPageProps> = () => toolProps("sleep-calculator");

export default function Page(props: ToolPageProps) {
  return (
    <ToolPage {...props}>
      <SleepCalculator />
    </ToolPage>
  );
}

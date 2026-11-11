import type { GetStaticProps } from "next";
import { ToolPage } from "@/tools/page";
import { toolProps } from "@/tools/props";
import type { ToolPageProps } from "@/tools/types";
import { DailyPlannerTemplate } from "@/tools/ui/DailyPlannerTemplate";

export const getStaticProps: GetStaticProps<ToolPageProps> = () => toolProps("daily-planner-template");

export default function Page(props: ToolPageProps) {
  return (
    <ToolPage {...props}>
      <DailyPlannerTemplate />
    </ToolPage>
  );
}

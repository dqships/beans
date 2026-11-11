import type { GetStaticProps } from "next";
import { ToolPage } from "@/tools/page";
import { toolProps } from "@/tools/props";
import type { ToolPageProps } from "@/tools/types";
import { WeeklyScheduleMaker } from "@/tools/ui/WeeklyScheduleMaker";

export const getStaticProps: GetStaticProps<ToolPageProps> = () => toolProps("weekly-schedule-maker");

export default function Page(props: ToolPageProps) {
  return (
    <ToolPage {...props}>
      <WeeklyScheduleMaker />
    </ToolPage>
  );
}

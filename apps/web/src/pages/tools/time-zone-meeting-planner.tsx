import type { GetStaticProps } from "next";
import { ToolPage } from "@/tools/page";
import { toolProps } from "@/tools/props";
import type { ToolPageProps } from "@/tools/types";
import { TimeZoneMeetingPlanner } from "@/tools/ui/TimeZoneMeetingPlanner";

export const getStaticProps: GetStaticProps<ToolPageProps> = () => toolProps("time-zone-meeting-planner");

export default function Page(props: ToolPageProps) {
  return (
    <ToolPage {...props}>
      <TimeZoneMeetingPlanner />
    </ToolPage>
  );
}

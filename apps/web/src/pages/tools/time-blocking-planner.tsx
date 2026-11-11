import type { GetStaticProps } from "next";
import { ToolPage } from "@/tools/page";
import { toolProps } from "@/tools/props";
import type { ToolPageProps } from "@/tools/types";
import { TimeBlockingPlanner } from "@/tools/ui/TimeBlockingPlanner";

export const getStaticProps: GetStaticProps<ToolPageProps> = () => toolProps("time-blocking-planner");

export default function Page(props: ToolPageProps) {
  return (
    <ToolPage {...props}>
      <TimeBlockingPlanner />
    </ToolPage>
  );
}

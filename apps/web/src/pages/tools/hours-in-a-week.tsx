import type { GetStaticProps } from "next";
import { ToolPage } from "@/tools/page";
import { toolProps } from "@/tools/props";
import type { ToolPageProps } from "@/tools/types";
import { HoursInAWeek } from "@/tools/ui/HoursInAWeek";

export const getStaticProps: GetStaticProps<ToolPageProps> = () => toolProps("hours-in-a-week");

export default function Page(props: ToolPageProps) {
  return (
    <ToolPage {...props}>
      <HoursInAWeek />
    </ToolPage>
  );
}

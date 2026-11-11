import type { GetStaticProps } from "next";
import { ToolPage } from "@/tools/page";
import { toolProps } from "@/tools/props";
import type { ToolPageProps } from "@/tools/types";
import { HabitTracker } from "@/tools/ui/HabitTracker";

export const getStaticProps: GetStaticProps<ToolPageProps> = () => toolProps("habit-tracker");

export default function Page(props: ToolPageProps) {
  return (
    <ToolPage {...props}>
      <HabitTracker />
    </ToolPage>
  );
}

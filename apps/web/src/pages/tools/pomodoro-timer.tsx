import type { GetStaticProps } from "next";
import { ToolPage } from "@/tools/page";
import { toolProps } from "@/tools/props";
import type { ToolPageProps } from "@/tools/types";
import { PomodoroTimer } from "@/tools/ui/PomodoroTimer";

export const getStaticProps: GetStaticProps<ToolPageProps> = () => toolProps("pomodoro-timer");

export default function Page(props: ToolPageProps) {
  return (
    <ToolPage {...props}>
      <PomodoroTimer />
    </ToolPage>
  );
}

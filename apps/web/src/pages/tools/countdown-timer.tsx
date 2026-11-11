import type { GetStaticProps } from "next";
import { ToolPage } from "@/tools/page";
import { toolProps } from "@/tools/props";
import type { ToolPageProps } from "@/tools/types";
import { CountdownTimer } from "@/tools/ui/CountdownTimer";

export const getStaticProps: GetStaticProps<ToolPageProps> = () => toolProps("countdown-timer");

export default function Page(props: ToolPageProps) {
  return (
    <ToolPage {...props}>
      <CountdownTimer />
    </ToolPage>
  );
}

import type { GetStaticProps } from "next";
import { ToolPage } from "@/tools/page";
import { toolProps } from "@/tools/props";
import type { ToolPageProps } from "@/tools/types";
import { EisenhowerMatrix } from "@/tools/ui/EisenhowerMatrix";

export const getStaticProps: GetStaticProps<ToolPageProps> = () => toolProps("eisenhower-matrix");

export default function Page(props: ToolPageProps) {
  return (
    <ToolPage {...props}>
      <EisenhowerMatrix />
    </ToolPage>
  );
}

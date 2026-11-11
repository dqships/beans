import type { GetStaticProps } from "next";
import { ToolPage } from "@/tools/page";
import { toolProps } from "@/tools/props";
import type { ToolPageProps } from "@/tools/types";
import { DateCalculator } from "@/tools/ui/DateCalculator";

export const getStaticProps: GetStaticProps<ToolPageProps> = () => toolProps("date-calculator");

export default function Page(props: ToolPageProps) {
  return (
    <ToolPage {...props}>
      <DateCalculator />
    </ToolPage>
  );
}

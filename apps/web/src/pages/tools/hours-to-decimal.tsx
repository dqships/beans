import type { GetStaticProps } from "next";
import { ToolPage } from "@/tools/page";
import { toolProps } from "@/tools/props";
import type { ToolPageProps } from "@/tools/types";
import { HoursToDecimal } from "@/tools/ui/HoursToDecimal";

export const getStaticProps: GetStaticProps<ToolPageProps> = () => toolProps("hours-to-decimal");

export default function Page(props: ToolPageProps) {
  return (
    <ToolPage {...props}>
      <HoursToDecimal />
    </ToolPage>
  );
}

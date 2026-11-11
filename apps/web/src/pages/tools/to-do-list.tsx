import type { GetStaticProps } from "next";
import { ToolPage } from "@/tools/page";
import { toolProps } from "@/tools/props";
import type { ToolPageProps } from "@/tools/types";
import { ToDoList } from "@/tools/ui/ToDoList";

export const getStaticProps: GetStaticProps<ToolPageProps> = () => toolProps("to-do-list");

export default function Page(props: ToolPageProps) {
  return (
    <ToolPage {...props}>
      <ToDoList />
    </ToolPage>
  );
}

import type { PageConfig } from "next";
export const config: PageConfig = { unstable_runtimeJS: false };
export default function Home() {
  return <main><h1>Spike</h1></main>;
}

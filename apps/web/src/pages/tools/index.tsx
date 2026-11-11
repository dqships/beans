import type { GetStaticProps, PageConfig } from "next";
import { absoluteUrl } from "@/lib/site";
import { Illustration, VineLeaf } from "@/marketing/art";
import { Calls, SiteFooter, SiteHeader } from "@/marketing/chrome";
import { PageHead } from "@/marketing/head";
import { publicPages } from "@/marketing/pages";
import styles from "@/tools/hub.module.css";
import { toolGroups, toolsIn } from "@/tools/registry";
import { toolPath } from "@/tools/slugs";
import type { ToolGroup, ToolLink } from "@/tools/types";

export const config: PageConfig = { unstable_runtimeJS: false };

type Group = { id: ToolGroup; name: string; about: string; tools: ToolLink[] };

export const getStaticProps: GetStaticProps<{ groups: Group[] }> = () => ({
  props: {
    groups: toolGroups.map((group) => ({
      ...group,
      tools: toolsIn(group.id).map(({ slug, name, blurb }) => ({ slug, name, blurb })),
    })),
  },
});

/** The list of tools as schema.org sees it. */
const listGraph = (groups: Group[]) => [
  {
    "@type": "ItemList",
    name: "Free tools from Beans",
    itemListElement: groups
      .flatMap((group) => group.tools)
      .map((tool, i) => ({ "@type": "ListItem", position: i + 1, name: tool.name, url: absoluteUrl(toolPath(tool.slug)) })),
  },
];

export default function Tools({ groups }: { groups: Group[] }) {
  const count = groups.reduce((sum, group) => sum + group.tools.length, 0);
  return (
    <div className={styles.page}>
      <PageHead page={publicPages.tools} graph={listGraph(groups)} />
      <SiteHeader />
      <main className={styles.main}>
        <div className={styles.intro}>
          <div className={styles.introText}>
            <h1 className={styles.h1}>Free tools for planning your time</h1>
            <p className={styles.lede}>
              {count} timers, planners and calculators that work in your browser. There&apos;s no account to make, and what you type stays on your
              device.
            </p>
            <nav aria-label="Kinds of tool">
              <ul className={styles.jump}>
                {groups.map((group) => (
                  <li key={group.id}>
                    <a href={`#${group.id}`}>{group.name}</a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <Illustration
            name="planning"
            width={640}
            height={480}
            shown={440}
            alt="The Beans mascot beside three garden rows of beans, with one bean hopping into a gap."
            className={styles.pose}
          />
        </div>

        <div className={styles.rows}>
          {groups.map((group) => (
            <section key={group.id} id={group.id} className={styles.group} aria-labelledby={`${group.id}-title`}>
              <div className={styles.groupHead}>
                <h2 id={`${group.id}-title`} className={styles.h2}>
                  {group.name}
                </h2>
                <p className={styles.about}>{group.about}</p>
              </div>
              <ul className={styles.tools}>
                {group.tools.map((tool) => (
                  <li key={tool.slug} className={styles.tool}>
                    <a href={toolPath(tool.slug)} className={styles.toolLink}>
                      <VineLeaf className={styles.leaf} />
                      <span className={styles.name}>{tool.name}</span>
                      <span className={styles.blurb}>{tool.blurb}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className={styles.closing} aria-labelledby="beans">
          <h2 id="beans" className={styles.h2}>
            These are pieces of Beans.
          </h2>
          <p>
            Beans is a daily planner. It keeps your to-do list, your week and your schedule for the day together, with the timer built in. Try it
            free for 7 days.
          </p>
          <Calls />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

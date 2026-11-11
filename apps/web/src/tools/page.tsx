/* eslint-disable @next/next/no-html-link-for-pages -- plain anchors, like every public page, so the visitor's source can ride on them (lib/source.ts). */
import type { ReactNode } from "react";
import { absoluteUrl } from "@/lib/site";
import { BeanMark, Illustration, VineLeaf } from "@/marketing/art";
import { SiteFooter, SiteHeader } from "@/marketing/chrome";
import chrome from "@/marketing/chrome.module.css";
import { PageHead } from "@/marketing/head";
import { TOOLS_PATH, toolPath } from "./slugs";
import styles from "./tools.module.css";
import type { ToolDef, ToolPageProps, ToolPose } from "./types";

const poseAlt: Record<ToolPose, string> = {
  focus: "The Beans mascot sitting still under a large leaf, next to a green timer ring.",
  timebox: "The Beans mascot clinging to a beanstalk, with leaves marking even steps along it.",
  planning: "The Beans mascot beside three garden rows of beans, with one bean hopping into a gap.",
  "brain-dump": "The Beans mascot watching a pile of beans spill out of a tipped seed packet.",
  analytics: "The Beans mascot beside a full harvest basket and three green stalks of different heights.",
  rollover: "The Beans mascot asleep under a crescent moon while two beans roll toward the next row.",
};

/** The tool as schema.org sees it: a free web app, where it sits on the site, and its questions. */
function toolGraph(tool: ToolDef): Record<string, unknown>[] {
  const url = absoluteUrl(toolPath(tool.slug));
  return [
    {
      "@type": "WebApplication",
      "@id": `${url}#tool`,
      name: tool.name,
      url,
      description: tool.description,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Web browser",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Beans", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Free tools", item: absoluteUrl(TOOLS_PATH) },
        { "@type": "ListItem", position: 3, name: tool.name, item: url },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: tool.faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ];
}

/** The page around a free tool. `children` is the working tool. */
export function ToolPage({ tool, related, terms, children }: ToolPageProps & { children: ReactNode }) {
  const page = { path: toolPath(tool.slug), title: tool.title, description: tool.description, lastModified: tool.lastModified };
  return (
    <div className={styles.page}>
      <PageHead page={page} graph={toolGraph(tool)} />
      <SiteHeader />
      <main className={`${styles.main} ${tool.wide ? styles.wide : ""}`}>
        <nav aria-label="Breadcrumb">
          <ol className={styles.crumbs}>
            <li>
              <a href={TOOLS_PATH}>Free tools</a>
            </li>
            <li aria-current="page">{tool.name}</li>
          </ol>
        </nav>
        <div className={styles.intro}>
          <h1 className={styles.h1}>{tool.h1}</h1>
          <p className={styles.lede}>{tool.lede}</p>
        </div>

        <section className={styles.plot} aria-label={tool.name} data-tool={tool.slug}>
          <BeanMark done className={styles.perch} />
          {children}
        </section>
        {tool.saves ? <p className={styles.saved}>Saved in this browser only. Nothing you type here is sent to Beans.</p> : null}

        <div className={styles.below}>
          <section className={styles.section} aria-labelledby="how">
            <h2 id="how" className={styles.h2}>
              How to use it
            </h2>
            <ol className={styles.steps}>
              {tool.steps.map((step) => (
                <li key={step} className={styles.step}>
                  <VineLeaf className={styles.stepLeaf} />
                  {step}
                </li>
              ))}
            </ol>
          </section>

          {tool.sections.map((section, i) => (
            <section key={section.heading} className={styles.section} aria-labelledby={`section-${i}`}>
              <h2 id={`section-${i}`} className={styles.h2}>
                {section.heading}
              </h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}

          <section className={styles.section} aria-labelledby="questions">
            <h2 id="questions" className={styles.h2}>
              Questions
            </h2>
            <dl className={styles.faq}>
              {tool.faq.map(({ q, a }) => (
                <div key={q}>
                  <dt>{q}</dt>
                  <dd>{a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className={`${styles.section} ${styles.beans}`} aria-labelledby="beans">
            <Illustration name={tool.beans.pose} width={640} height={480} shown={320} alt={poseAlt[tool.beans.pose]} className={styles.pose} />
            <div className={styles.beansText}>
              <h2 id="beans" className={styles.h2}>
                {tool.beans.heading}
              </h2>
              <p>{tool.beans.body}</p>
              <a href="/sign-up" className={chrome.primaryLarge}>
                Start planning
              </a>
              <p className={styles.terms}>
                {terms} <a href="/pricing">See pricing</a>
              </p>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="more">
            <h2 id="more" className={styles.h2}>
              More free tools
            </h2>
            <ul className={styles.more}>
              {related.map((other) => (
                <li key={other.slug}>
                  <a href={toolPath(other.slug)} className={styles.moreLink}>
                    <span className={styles.moreName}>{other.name}</span>
                    <span className={styles.moreBlurb}>{other.blurb}</span>
                  </a>
                </li>
              ))}
            </ul>
            <a href={TOOLS_PATH} className={styles.all}>
              All free tools
            </a>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

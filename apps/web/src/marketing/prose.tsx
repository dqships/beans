import { SiteFooter, SiteHeader } from "./chrome";
import { SoilLine } from "./art";
import { PageHead } from "./head";
import type { PublicPage } from "./pages";
import styles from "./prose.module.css";

/** The plain reading layout for About, Contact, Privacy and Terms. */
export function ProsePage({
  page,
  title,
  updated,
  children,
}: {
  page: PublicPage;
  title: string;
  /** Shown under the title, for pages with a "last updated" date. */
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.page}>
      <PageHead page={page} />
      <SiteHeader />
      <main className={styles.main}>
        <h1 className={styles.h1}>{title}</h1>
        <SoilLine />
        {updated ? <p className={styles.updated}>Last updated {updated}</p> : null}
        <div className={styles.prose}>{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

import { SiteFooter, SiteHeader } from "./chrome";
import { SoilLine } from "./art";
import { PageHead } from "./head";
import type { PublicPage } from "./pages";
import styles from "./prose.module.css";

/** The plain reading layout for About, Contact, Privacy and Terms. */
export function ProsePage({
  page,
  title,
  draft,
  children,
}: {
  page: PublicPage;
  title: string;
  draft?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <PageHead page={page} />
      <SiteHeader />
      <main className={styles.main}>
        <h1 className={styles.h1}>{title}</h1>
        <SoilLine />
        {draft ? (
          <p className={styles.draft}>
            <strong>Draft.</strong> This page is a placeholder waiting on legal review. It isn&apos;t final, and it may change.
          </p>
        ) : null}
        <div className={styles.prose}>{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}

/* eslint-disable @next/next/no-html-link-for-pages -- plain anchors, so this page needs no client code of its own. */
import { Illustration } from "./art";
import { Calls, SiteFooter, SiteHeader } from "./chrome";
import styles from "./not-found-scene.module.css";

/** The 404 page. It renders in the App Router, with no Clerk or Convex on it. */
export function NotFoundScene() {
  return (
    <div className={styles.page}>
      <SiteHeader />
      <main className={styles.main}>
        <Illustration
          name="404"
          width={640}
          height={480}
          shown={480}
          alt="The Beans mascot beside an empty hole in the soil, with a trowel stuck in a mound of dirt."
          className={styles.art}
        />
        <div className={styles.text}>
          <h1 className={styles.h1}>Nothing planted here.</h1>
          <p className={styles.body}>
            This page doesn&apos;t exist, or it moved. Head back to <a href="/">the Beans home page</a>, or go straight to your
            planner.
          </p>
          <Calls />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

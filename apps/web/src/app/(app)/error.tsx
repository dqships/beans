"use client";

import { useEffect } from "react";
import { Button } from "@/ui/Button";
import { Illustration } from "@/ui/Illustration";
import styles from "./auth.module.css";

/** Shown when a page under `(app)` throws. The layout's providers stay in place, so Try again re-renders the page. */
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className={styles.page}>
      <div className={styles.panel}>
        <Illustration name="error" alt="" compact eager className={styles.mascot} />
        <h1 className={styles.title}>Something went wrong</h1>
        <p className={styles.lede}>This page didn&apos;t load. Try again, and if it keeps happening, reload Beans.</p>
        <Button variant="primary" onClick={() => retry()}>
          Try again
        </Button>
      </div>
    </main>
  );
}

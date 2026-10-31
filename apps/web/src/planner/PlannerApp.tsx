"use client";

import { useEffect } from "react";
import { useDataReady, useSettings } from "@/data/hooks";
import { THEME_STORAGE_KEY } from "@/app/theme-script";
import { Mascot } from "@/ui/garden";
import { Board } from "./Board";
import { BulkBar } from "./BulkBar";
import { PlannerDnd } from "./dnd";
import { Sidebar } from "./Sidebar";
import { TimeboxPanel } from "./TimeboxPanel";
import { Toasts } from "./Toasts";
import { TopBar } from "./TopBar";
import { UiProvider, useUi } from "./ui-state";
import styles from "./shell.module.css";

export function PlannerApp() {
  const ready = useDataReady();
  if (!ready) return <LoadingScreen />;
  return (
    <UiProvider>
      <ThemeSync />
      <PlannerDnd>
        <Shell />
      </PlannerDnd>
    </UiProvider>
  );
}

export function LoadingScreen() {
  return (
    <div className={styles.loading} role="status">
      <Mascot scene="sleep" className={styles.loadingMascot} />
      <p>Opening your garden…</p>
    </div>
  );
}

function ThemeSync() {
  const theme = useSettings()?.theme ?? "system";
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
  }, [theme]);
  return null;
}

function Shell() {
  const ui = useUi();
  const showSidebar = ui.sidebarOpen && !ui.focusMode;
  return (
    <div className={styles.app}>
      <TopBar />
      <div className={styles.body}>
        {showSidebar ? <Sidebar /> : null}
        <main className={styles.main}>
          <Board />
        </main>
        {ui.timeboxOpen ? <TimeboxPanel /> : null}
      </div>
      <BulkBar />
      <Toasts />
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useDataReady, useSettings } from "@/data/hooks";
import { THEME_STORAGE_KEY } from "@/app/theme-script";
import { Mascot } from "@/ui/garden";
import { Board } from "./Board";
import { PhoneLayout } from "./PhoneLayout";
import { useIsPhone } from "@/ui/useMedia";
import { CalendarView, DayTasksPanel } from "./CalendarView";
import { BulkBar } from "./BulkBar";
import { PlannerDnd } from "./dnd";
import { Sidebar } from "./Sidebar";
import { TaskModal } from "./TaskModal";
import { QuickCapture } from "./QuickCapture";
import { SearchDialog } from "./SearchDialog";
import { ShortcutSheet } from "./ShortcutSheet";
import { TimerPill } from "./TimerPill";
import { useShortcuts } from "./shortcuts";
import { SettingsDialog } from "./SettingsDialog";
import { TrashDrawer } from "./TrashDrawer";
import { Analytics } from "./Analytics";
import { Rituals } from "./Rituals";
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
  useShortcuts();
  const phone = useIsPhone();
  const showSidebar = ui.sidebarOpen && !ui.focusMode;
  return (
    <div className={styles.app}>
      <TopBar />
      {phone ? (
        <PhoneLayout />
      ) : (
      <div className={styles.body}>
        {showSidebar ? <Sidebar /> : null}
        <main className={styles.main}>{ui.view === "calendar" ? <CalendarView /> : <Board />}</main>
        {ui.timeboxOpen ? ui.view === "calendar" ? <DayTasksPanel /> : <TimeboxPanel /> : null}
      </div>
      )}
      <BulkBar />
      <TaskModal />
      <QuickCapture />
      <SearchDialog />
      <ShortcutSheet />
      <SettingsDialog />
      <TrashDrawer />
      <Analytics />
      <Rituals />
      <TimerPill placement="floating" />
      <Toasts />
    </div>
  );
}

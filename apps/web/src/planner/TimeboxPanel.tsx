"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { addDays, dayOfMonth, weekdayName } from "@beans/core";
import { useToday } from "@/data/hooks";
import { Button, IconButton } from "@/ui/Button";
import { TimeGrid } from "./TimeGrid";
import { useUi } from "./ui-state";
import styles from "./shell.module.css";

/** One-day calendar on the right of the board. */
export function TimeboxPanel() {
  const ui = useUi();
  const today = useToday();
  const date = ui.timeboxDate ?? today;
  return (
    <aside className={styles.rightPanel} aria-label="Timebox">
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Timebox</h2>
        <IconButton icon={CaretLeft} label="Previous day" onClick={() => ui.setTimeboxDate(addDays(date, -1))} />
        <Button size="sm" onClick={() => ui.setTimeboxDate(null)} disabled={date === today}>
          Today
        </Button>
        <IconButton icon={CaretRight} label="Next day" onClick={() => ui.setTimeboxDate(addDays(date, 1))} />
      </div>
      <div className={styles.timeboxDay}>
        {weekdayName(date)} <span className={date === today ? styles.dayPillToday : styles.dayPill}>{dayOfMonth(date)}</span>
      </div>
      <div className={styles.timeboxGrid}>
        <TimeGrid days={[date]} scrollKey={date} />
      </div>
    </aside>
  );
}

"use client";

import { CalendarBlank, Lightning, ListChecks, Tray } from "@phosphor-icons/react";
import { addDays, dayOfMonth, monthName, relativeDay, weekdayName } from "@beans/core";
import { useDayTasks, useToday } from "@/data/hooks";
import { Icon } from "@/ui/Icon";
import { DayColumn } from "./Board";
import { Sidebar } from "./Sidebar";
import { TimeGrid } from "./TimeGrid";
import { useUi, type PhoneTab } from "./ui-state";
import styles from "./phone.module.css";

/** Phone layout: one day at a time, with tabs for Brain Dump, the day and its Timebox. */
export function PhoneLayout() {
  const ui = useUi();
  const today = useToday();
  const date = ui.timeboxDate ?? today;
  const tasks = useDayTasks(date);
  return (
    <div className={styles.phone}>
      <div className={styles.panel}>
        {ui.phoneTab === "dump" ? <Sidebar /> : null}
        {ui.phoneTab === "today" ? (
          <div className={styles.day}>
            <DayColumn date={date} tasks={tasks} today={today} focus />
          </div>
        ) : null}
        {ui.phoneTab === "timebox" ? (
          <div className={styles.timebox}>
            <div className={styles.timeboxHead}>
              {weekdayName(date)}, {monthName(date)} {dayOfMonth(date)}
            </div>
            <TimeGrid days={[date]} scrollKey={`phone-${date}`} />
          </div>
        ) : null}
      </div>
      <nav className={styles.tabbar} aria-label="Sections">
        <Tab tab="dump" icon={Tray} label="Brain Dump" />
        <Tab tab="today" icon={ListChecks} label={relativeDay(date, today)} />
        <Tab tab="timebox" icon={CalendarBlank} label="Timebox" />
        <button type="button" className={styles.capture} onClick={() => ui.setDialog("capture")} aria-label="Quick Capture">
          <Icon icon={Lightning} size="md" />
        </button>
      </nav>
    </div>
  );
}

function Tab({ tab, icon, label }: { tab: PhoneTab; icon: typeof Tray; label: string }) {
  const ui = useUi();
  const active = ui.phoneTab === tab;
  return (
    <button type="button" className={`${styles.tab} ${active ? styles.tabActive : ""}`} aria-current={active ? "page" : undefined} onClick={() => ui.setPhoneTab(tab)}>
      <Icon icon={icon} size="md" />
      <span>{label}</span>
    </button>
  );
}

export function phoneStep(date: string, dir: 1 | -1) {
  return addDays(date, dir);
}

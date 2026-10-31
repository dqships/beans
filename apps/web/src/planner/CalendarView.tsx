"use client";

import { useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { CaretDown, CaretLeft, CaretRight, MagnifyingGlassMinus, MagnifyingGlassPlus } from "@phosphor-icons/react";
import {
  addDays,
  dayOfMonth,
  dayTotals,
  formatTime,
  isWeekend,
  relativeDay,
  startOfMonth,
  startOfWeek,
  weekdayName,
  type DateKey,
  type Task,
} from "@beans/core";
import { useActions, useDayTasks, useLabel, useRangeTasks, useSettings, useToday } from "@/data/hooks";
import { Button, IconButton } from "@/ui/Button";
import { LabelDot } from "@/ui/controls";
import { Menu, MenuDivider, MenuItem } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { Composer } from "./Composer";
import { SortableTask, TaskDropZone, containerId } from "./dnd";
import { useFilteredTasks } from "./FilterMenu";
import { DayTotalChip } from "./TaskCard";
import { TimeGrid } from "./TimeGrid";
import { useUi, type CalendarRange } from "./ui-state";
import shell from "./shell.module.css";
import styles from "./calendar.module.css";

const RANGE_LABEL: Record<string, string> = { day: "Day", 3: "3 days", week: "Week", month: "Month" };

export function useCalendarDays(): DateKey[] {
  const ui = useUi();
  const today = useToday();
  const settings = useSettings();
  const base = ui.calendarDate ?? today;
  const showWeekends = settings?.showWeekends ?? true;
  const r = ui.calendarRange;
  let days: DateKey[];
  if (r === "day") days = [base];
  else if (r === 3) days = [base, addDays(base, 1), addDays(base, 2)];
  else if (r === "week") {
    const start = startOfWeek(base, settings?.weekStart ?? 0);
    days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  } else days = [base];
  if (!showWeekends && r === "week") days = days.filter((d) => !isWeekend(d));
  return days;
}

export function CalendarView() {
  const ui = useUi();
  const days = useCalendarDays();
  return (
    <div className={styles.view}>
      <div className={styles.toolbar}>
        <RangeMenu />
      </div>
      {ui.calendarRange === "month" ? <MonthGrid /> : <TimeGrid days={days} showHeader scrollKey={days[0]} />}
    </div>
  );
}

function RangeMenu() {
  const ui = useUi();
  const settings = useSettings();
  const actions = useActions();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const zoom = settings?.calendarZoom ?? 1;
  const pick = (r: CalendarRange) => {
    ui.setCalendarRange(r);
    setOpen(false);
  };
  return (
    <>
      <Button ref={ref} size="sm" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {RANGE_LABEL[String(ui.calendarRange)]} <CaretDown />
      </Button>
      <Popover open={open} onClose={() => setOpen(false)} anchor={ref} label="Calendar range">
        <Menu label="Calendar range">
          <MenuItem onSelect={() => pick("day")} checked={ui.calendarRange === "day"} hint="D">
            Day
          </MenuItem>
          <MenuItem onSelect={() => pick(3)} checked={ui.calendarRange === 3}>
            3 days
          </MenuItem>
          <MenuItem onSelect={() => pick("week")} checked={ui.calendarRange === "week"} hint="W">
            Week
          </MenuItem>
          <MenuItem onSelect={() => pick("month")} checked={ui.calendarRange === "month"} hint="M">
            Month
          </MenuItem>
          <MenuDivider />
          <MenuItem
            onSelect={() => actions.updateSettings({ showWeekends: !(settings?.showWeekends ?? true) })}
          >
            {settings?.showWeekends ? "Hide weekends" : "Show weekends"}
          </MenuItem>
        </Menu>
      </Popover>
      {ui.calendarRange !== "month" ? (
        <div className={styles.zoom}>
          <IconButton icon={MagnifyingGlassMinus} label="Zoom out" disabled={zoom <= 0.5} onClick={() => actions.updateSettings({ calendarZoom: Math.max(0.5, zoom - 0.25) })} />
          <IconButton icon={MagnifyingGlassPlus} label="Zoom in" disabled={zoom >= 2} onClick={() => actions.updateSettings({ calendarZoom: Math.min(2, zoom + 0.25) })} />
        </div>
      ) : null}
    </>
  );
}

function MonthGrid() {
  const ui = useUi();
  const today = useToday();
  const settings = useSettings();
  const base = ui.calendarDate ?? today;
  const month = startOfMonth(base);
  const start = startOfWeek(month, settings?.weekStart ?? 0);
  const tasks = useRangeTasks(start, 42);
  const weekdays = Array.from({ length: 7 }, (_, i) => weekdayName(addDays(start, i)));
  return (
    <div className={styles.month}>
      <div className={styles.monthHead}>
        {weekdays.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className={styles.monthGrid}>
        {Array.from({ length: 42 }, (_, i) => addDays(start, i)).map((d) => (
          <MonthCell key={d} date={d} tasks={tasks[d] ?? []} outside={d.slice(0, 7) !== month.slice(0, 7)} today={today} />
        ))}
      </div>
    </div>
  );
}

function MonthCell({ date, tasks, outside, today }: { date: DateKey; tasks: Task[]; outside: boolean; today: DateKey }) {
  const ui = useUi();
  const settings = useSettings();
  const shown = useFilteredTasks(tasks);
  const { setNodeRef, isOver } = useDroppable({ id: `month:${date}`, data: { kind: "day", date } });
  const visible = shown.slice(0, 3);
  return (
    <div
      ref={setNodeRef}
      className={`${styles.cell} ${outside ? styles.outside : ""} ${isOver ? styles.cellOver : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          ui.setCalendarDate(date);
          ui.setCalendarRange("day");
        }
      }}
    >
      <button
        type="button"
        className={`${styles.cellDate} ${date === today ? styles.cellToday : ""}`}
        onClick={() => {
          ui.setCalendarDate(date);
          ui.setCalendarRange("day");
        }}
        aria-label={`Open ${date}`}
      >
        {dayOfMonth(date)}
      </button>
      {visible.map((t) => (
        <button key={t.id} type="button" className={`${styles.chip} ${t.done ? styles.chipDone : ""}`} onClick={() => ui.openTask(t.id)}>
          <MonthChipLabel task={t} />
          {t.start ? <span className={styles.chipTime}>{formatTime(t.start, settings?.timeFormat ?? "12h", true)}</span> : null}
          <span className={styles.chipTitle}>{t.title}</span>
        </button>
      ))}
      {shown.length > visible.length ? (
        <button
          type="button"
          className={styles.more}
          onClick={() => {
            ui.setCalendarDate(date);
            ui.setCalendarRange("day");
          }}
        >
          {shown.length - visible.length} more
        </button>
      ) : null}
    </div>
  );
}

function MonthChipLabel({ task }: { task: Task }) {
  const label = useLabel(task.labelId);
  return <LabelDot color={label?.color ?? null} />;
}

/** Right panel in calendar view: one day's tasks, ready to drag onto the calendar. */
export function DayTasksPanel() {
  const ui = useUi();
  const today = useToday();
  const settings = useSettings();
  const date = ui.timeboxDate ?? today;
  const tasks = useDayTasks(date);
  const shown = useFilteredTasks(tasks);
  const totals = dayTotals(tasks);
  const over = settings?.workloadLimit != null && totals.estimate > settings.workloadLimit;
  const container = containerId({ kind: "day", date });
  return (
    <aside className={shell.rightPanel} aria-label="Tasks for the day">
      <div className={shell.panelHeader}>
        <h2 className={shell.panelTitle}>{relativeDay(date, today)}</h2>
        <IconButton icon={CaretLeft} label="Previous day" onClick={() => ui.setTimeboxDate(addDays(date, -1))} />
        <Button size="sm" onClick={() => ui.setTimeboxDate(null)} disabled={date === today}>
          Today
        </Button>
        <IconButton icon={CaretRight} label="Next day" onClick={() => ui.setTimeboxDate(addDays(date, 1))} />
      </div>
      <div className={styles.dayList}>
        <Composer date={date} trailing={<DayTotalChip estimate={totals.estimate} actual={totals.actual} over={over} />} />
        <TaskDropZone target={{ kind: "day", date }} tasks={shown} className={styles.dayListTasks}>
          {shown.map((t, i) => (
            <SortableTask key={t.id} task={t} container={container} index={i} />
          ))}
        </TaskDropZone>
      </div>
    </aside>
  );
}

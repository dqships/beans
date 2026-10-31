"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Crosshair, X } from "@phosphor-icons/react";
import {
  addDays,
  dayOfMonth,
  dayTotals,
  diffDays,
  isWeekend,
  monthName,
  weekdayName,
  type DateKey,
  type Task,
} from "@beans/core";
import { useRangeTasks, useSettings, useToday } from "@/data/hooks";
import { Button } from "@/ui/Button";
import { EmptyState } from "@/ui/garden";
import { Composer } from "./Composer";
import { TaskDropZone, SortableTask, containerId } from "./dnd";
import { useFilteredTasks } from "./FilterMenu";
import { DayTotalChip } from "./TaskCard";
import { useUi } from "./ui-state";
import styles from "./board.module.css";

const PAD_DAYS = 14;
const WINDOW_DAYS = 42;

export function Board() {
  const today = useToday();
  const ui = useUi();
  const settings = useSettings();
  const scroller = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState(() => addDays(today, -PAD_DAYS));
  const [count, setCount] = useState(WINDOW_DAYS);
  const pendingShift = useRef(0);
  const tasks = useRangeTasks(start, count);
  const showWeekends = settings?.showWeekends ?? true;

  const days: DateKey[] = [];
  for (let i = 0; i < count; i++) {
    const d = addDays(start, i);
    if (showWeekends || !isWeekend(d) || d === today) days.push(d);
  }

  const columnStep = () => {
    const el = scroller.current?.querySelector<HTMLElement>("[data-day]");
    const next = el?.nextElementSibling as HTMLElement | null;
    if (!el) return 0;
    return next ? next.offsetLeft - el.offsetLeft : el.offsetWidth;
  };

  const scrollToDay = (date: DateKey, smooth: boolean) => {
    const el = scroller.current?.querySelector<HTMLElement>(`[data-day="${date}"]`);
    if (!el || !scroller.current) return false;
    const pad = parseFloat(getComputedStyle(scroller.current).paddingLeft) || 0;
    scroller.current.scrollTo({ left: el.offsetLeft - pad, behavior: smooth ? "smooth" : "auto" });
    return true;
  };

  // Start with today as the first column.
  useLayoutEffect(() => {
    scrollToDay(today, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the view steady after days are added on the left.
  useLayoutEffect(() => {
    if (pendingShift.current && scroller.current) {
      scroller.current.scrollLeft += pendingShift.current;
      pendingShift.current = 0;
    }
  }, [start]);

  // The top bar's Today, back and forward buttons drive the board through this.
  const { registerBoard } = ui;
  useEffect(() => {
    registerBoard({
      scrollTo: (date) => {
        const offset = diffDays(date, start);
        if (offset < 2 || offset > count - 6) {
          setStart(addDays(date, -PAD_DAYS));
          setCount(WINDOW_DAYS);
          requestAnimationFrame(() => scrollToDay(date, false));
        } else {
          scrollToDay(date, true);
        }
      },
      step: (direction) => {
        const el = scroller.current;
        const step = columnStep();
        if (el && step) el.scrollBy({ left: direction * step, behavior: "smooth" });
      },
    });
    return () => registerBoard(null);
  });

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const step = columnStep();
    if (!step) return;
    if (el.scrollLeft < step * 3) {
      pendingShift.current = step * PAD_DAYS;
      setStart((s) => addDays(s, -PAD_DAYS));
      setCount((c) => c + PAD_DAYS);
    } else if (el.scrollLeft + el.clientWidth > el.scrollWidth - step * 3) {
      setCount((c) => c + PAD_DAYS);
    }
  };

  if (ui.focusMode) {
    return (
      <div className={styles.focusWrap}>
        <div className={styles.focusBar}>
          <Button size="sm" icon={X} onClick={() => ui.setFocusMode(false)}>
            Leave focus
          </Button>
        </div>
        <div className={styles.board}>
          <DayColumn date={today} tasks={tasks[today] ?? []} today={today} focus />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.board} ref={scroller} onScroll={onScroll} aria-label="Days" role="region">
      {days.map((d) => (
        <DayColumn key={d} date={d} tasks={tasks[d] ?? []} today={today} />
      ))}
    </div>
  );
}

export function DayColumn({ date, tasks, today, focus }: { date: DateKey; tasks: Task[]; today: DateKey; focus?: boolean }) {
  const ui = useUi();
  const settings = useSettings();
  const shown = useFilteredTasks(tasks);
  const totals = dayTotals(tasks);
  const limit = settings?.workloadLimit ?? null;
  const over = limit !== null && totals.estimate > limit;
  const isToday = date === today;
  const isPast = date < today;
  const container = containerId({ kind: "day", date });
  return (
    <section className={`${styles.column} ${isPast ? styles.past : ""} ${focus ? styles.focusColumn : ""}`} data-day={date} aria-label={`${weekdayName(date, true)}, ${monthName(date, true)} ${dayOfMonth(date)}`}>
      <header className={styles.dayHeader}>
        <h2 className={styles.dayTitle}>
          {weekdayName(date)} <span>{monthName(date)} {dayOfMonth(date)}</span>
        </h2>
        {isToday ? <span className={styles.todayTag}>Today</span> : null}
        {isToday && !focus ? (
          <Button size="sm" variant="quiet" icon={Crosshair} className={styles.focusButton} onClick={() => ui.setFocusMode(true)} title="Show only today (Shift F)">
            Focus
          </Button>
        ) : null}
      </header>
      <div className={styles.columnBody}>
        <Composer date={date} trailing={<DayTotalChip estimate={totals.estimate} actual={totals.actual} over={over} />} />
        <TaskDropZone target={{ kind: "day", date }} tasks={shown} className={styles.taskList}>
          {shown.map((t, i) => (
            <SortableTask key={t.id} task={t} container={container} index={i} />
          ))}
          {isToday && tasks.length === 0 ? (
            <EmptyState compact scene="rest" title="Nothing planned yet">
              Drag something over from the Brain Dump, or add a task above.
            </EmptyState>
          ) : null}
          {isToday && tasks.length > 0 && totals.done === totals.count ? (
            <EmptyState compact scene="cheer" title="All done for today">
              Every bean is planted. Enjoy the rest of your day.
            </EmptyState>
          ) : null}
        </TaskDropZone>
      </div>
    </section>
  );
}

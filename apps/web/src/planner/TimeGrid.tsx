"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Warning } from "@phosphor-icons/react";
import { hourHeight } from "@beans/tokens";
import {
  blockMinutes,
  dayOfMonth,
  formatHour,
  formatTime,
  minutesNowIn,
  minutesToTime,
  runsPastMidnight,
  snapMinutes,
  timeToMinutes,
  weekdayName,
  type DateKey,
  type Task,
  type TimeKey,
} from "@beans/core";
import { useActions, useClock, useLabel, useRangeTasks, useSettings, useTimeZone, useToday } from "@/data/hooks";
import { BeanCheckbox, NowBean } from "@/ui/garden";
import { Icon } from "@/ui/Icon";
import { useDragState, useTimeboxDrop } from "./dnd";
import { useFilteredTasks } from "./FilterMenu";
import { useUi } from "./ui-state";
import styles from "./timegrid.module.css";

interface Lane {
  task: Task;
  top: number;
  minutes: number;
  lane: number;
  lanes: number;
}

/** Places overlapping blocks side by side. */
function layout(tasks: Task[]): Lane[] {
  const items = tasks
    .filter((t) => t.start)
    .map((t) => ({ task: t, top: timeToMinutes(t.start!), minutes: blockMinutes(t) }))
    .sort((a, b) => a.top - b.top || b.minutes - a.minutes);
  const out: Lane[] = [];
  let group: (typeof out)[number][] = [];
  let groupEnd = -1;
  const flush = () => {
    const lanes = Math.max(1, ...group.map((g) => g.lane + 1));
    group.forEach((g) => (g.lanes = lanes));
    group = [];
  };
  for (const item of items) {
    if (item.top >= groupEnd) {
      flush();
      groupEnd = -1;
    }
    const used = new Set(group.filter((g) => g.top + Math.max(g.minutes, 20) > item.top).map((g) => g.lane));
    let lane = 0;
    while (used.has(lane)) lane++;
    const entry = { ...item, lane, lanes: 1 };
    group.push(entry);
    out.push(entry);
    groupEnd = Math.max(groupEnd, item.top + Math.max(item.minutes, 20));
  }
  flush();
  return out;
}

/** First-run setup's Timebox: a click places the chosen task instead of starting a new one. */
export interface TimeboxPick {
  /** Hours offered as buttons, so the keyboard and screen readers can place a task too. */
  hours: TimeKey[];
  /** The task a click places, if one is chosen. */
  title: string | null;
  place: (date: DateKey, start: TimeKey) => void;
  /** Clicking a block takes its time away instead of opening its details. */
  clear: (task: Task) => void;
}

export function TimeGrid({
  days,
  showHeader,
  scrollKey,
  pick,
}: {
  days: DateKey[];
  showHeader?: boolean;
  scrollKey?: string;
  pick?: TimeboxPick;
}) {
  const settings = useSettings();
  const zone = useTimeZone();
  const now = useClock();
  const today = useToday();
  const scroller = useRef<HTMLDivElement>(null);
  const startHour = settings?.dayStartHour ?? 0;
  const zoom = settings?.calendarZoom ?? 1;
  const hourPx = hourHeight * zoom;
  const hours = Array.from({ length: 24 - startHour }, (_, i) => startHour + i);
  const format = settings?.timeFormat ?? "12h";
  const tasksByDay = useRangeTasks(days[0]!, days.length);

  // Open near the current hour, or the first hour on offer.
  const openAt = pick?.hours[0];
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const minutes = openAt ? timeToMinutes(openAt) : minutesNowIn(zone);
    // Half an hour above the first hour on offer keeps its label clear of the top edge.
    const above = openAt ? 0.5 : 1;
    el.scrollTop = Math.max(0, ((minutes - startHour * 60) / 60 - above) * hourPx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollKey, hourPx, openAt]);

  return (
    <div className={styles.wrap} style={{ ["--hour" as string]: `calc(var(--layout-hour) * ${zoom})` }}>
      {showHeader ? (
        <div className={styles.headRow}>
          <div className={styles.gutterHead} />
          {days.map((d) => (
            <div key={d} className={`${styles.dayHead} ${d === today ? styles.dayHeadToday : ""}`}>
              <span>{weekdayName(d)}</span>
              <strong>{dayOfMonth(d)}</strong>
            </div>
          ))}
        </div>
      ) : null}
      <div className={styles.scroll} ref={scroller}>
        <div className={styles.grid} style={{ height: hours.length * hourPx }}>
          <div className={styles.gutter} aria-hidden="true">
            {hours.map((h) => (
              <div key={h} className={styles.hourLabel}>
                {h === startHour ? null : <span>{formatHour(h, format)}</span>}
                <svg className={styles.vineLeaf} viewBox="0 0 12 8">
                  <path d="M1 4 C3 0 9 0 11 4 C9 8 3 8 1 4 Z" />
                </svg>
              </div>
            ))}
          </div>
          {days.map((d) => (
            <DayGrid
              key={d}
              date={d}
              tasks={tasksByDay[d] ?? []}
              hours={hours}
              startHour={startHour}
              hourPx={hourPx}
              nowMinutes={d === today ? minutesNowIn(zone, now) : null}
              pick={pick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DayGrid({
  date,
  tasks,
  hours,
  startHour,
  hourPx,
  nowMinutes,
  pick,
}: {
  date: DateKey;
  tasks: Task[];
  hours: number[];
  startHour: number;
  hourPx: number;
  nowMinutes: number | null;
  pick?: TimeboxPick;
}) {
  const ui = useUi();
  const settings = useSettings();
  const { setNodeRef, isOver } = useTimeboxDrop(date, startHour, hourPx);
  const { preview } = useDragState();
  const shown = useFilteredTasks(tasks);
  const lanes = useMemo(() => layout(shown), [shown]);
  const snap = settings?.snapMinutes ?? 15;
  const offset = startHour * 60;

  const format = settings?.timeFormat ?? "12h";

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const minutes = offset + ((e.clientY - rect.top) / hourPx) * 60;
    const start = minutesToTime(Math.min(24 * 60 - snap, Math.floor(minutes / snap) * snap));
    if (pick) {
      if (pick.title) pick.place(date, start);
    } else {
      ui.setDraft({ date, start, estimate: 15 });
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`${styles.day} ${isOver ? styles.dayOver : ""}`}
      onClick={onClick}
      data-timebox={date}
      aria-label={pick ? `Timebox for ${date}` : `Timebox for ${date}. Click an empty time to add a task.`}
    >
      {hours.map((h) => (
        <div key={h} className={styles.hourLine} style={{ top: (h - startHour) * hourPx }} aria-hidden="true" />
      ))}
      {pick?.hours.map((hour) => {
        const time = formatTime(hour, format);
        return (
          <button
            key={hour}
            type="button"
            className={styles.slot}
            style={{ top: ((timeToMinutes(hour) - offset) / 60) * hourPx, height: hourPx }}
            disabled={!pick.title}
            aria-label={pick.title ? `Put ${pick.title} at ${time}` : `${time} is open`}
            // The hour its name promises; dragging places a task to the snap step.
            onClick={() => pick.place(date, hour)}
          />
        );
      })}
      {lanes.map((l) => (
        <Block key={l.task.id} lane={l} offset={offset} hourPx={hourPx} snap={snap} onPick={pick?.clear} />
      ))}
      {preview && preview.date === date ? (
        <div
          className={styles.preview}
          style={{
            top: ((timeToMinutes(preview.start) - offset) / 60) * hourPx,
            height: Math.max((preview.minutes / 60) * hourPx, hourPx / 4),
          }}
        >
          {formatTime(preview.start, settings?.timeFormat ?? "12h")}
        </div>
      ) : null}
      {nowMinutes !== null && nowMinutes >= offset ? (
        <div className={styles.now} style={{ top: ((nowMinutes - offset) / 60) * hourPx }} aria-label="Now">
          <NowBean className={styles.nowBean} />
        </div>
      ) : null}
    </div>
  );
}

function Block({
  lane,
  offset,
  hourPx,
  snap,
  onPick,
}: {
  lane: Lane;
  offset: number;
  hourPx: number;
  snap: number;
  onPick?: (task: Task) => void;
}) {
  const { task } = lane;
  const ui = useUi();
  const actions = useActions();
  const settings = useSettings();
  const label = useLabel(task.labelId);
  const [resize, setResize] = useState<number | null>(null);
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: `block:${task.id}`,
    data: { kind: "task", taskId: task.id, container: `timebox:${task.date}` },
  });
  const minutes = resize ?? lane.minutes;
  const top = ((lane.top - offset) / 60) * hourPx;
  const visibleMinutes = Math.min(minutes, 24 * 60 - lane.top);
  const height = Math.max((visibleMinutes / 60) * hourPx, hourPx / 4);
  const past = runsPastMidnight({ start: task.start, estimate: minutes });
  const format = settings?.timeFormat ?? "12h";
  const end = minutesToTime(Math.min(lane.top + minutes, 24 * 60 - 1));

  const onResizeStart = (e: ReactPointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startY = e.clientY;
    const base = lane.minutes;
    let latest = base;
    const move = (ev: PointerEvent) => {
      latest = Math.max(snap, snapMinutes(base + ((ev.clientY - startY) / hourPx) * 60, snap));
      setResize(latest);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setResize(null);
      if (latest !== base) actions.updateTask(task.id, { estimate: latest });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`${styles.block} ${task.done ? styles.blockDone : ""} ${label ? "" : styles.blockPlain} ${isDragging ? styles.blockDragging : ""} ${past ? styles.blockPast : ""}`}
      style={{
        top,
        height,
        left: `calc(${(lane.lane / lane.lanes) * 100}% + var(--space-1))`,
        width: `calc(${100 / lane.lanes}% - var(--space-1) * 2)`,
        background: label ? `var(--label-${label.color})` : undefined,
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (onPick) onPick(task);
        else ui.openTask(task.id);
      }}
      role="button"
      // When a click clears the block, it's named by what it shows, after the word that says so.
      aria-label={onPick ? undefined : `${task.title}, ${formatTime(task.start!, format)} to ${formatTime(end, format)}`}
    >
      <div className={styles.blockTop}>
        {onPick ? (
          <span className="visually-hidden">Clear </span>
        ) : (
          <BeanCheckbox size="sm" checked={task.done} onChange={(d) => actions.setDone(task.id, d)} label={`Mark “${task.title}” ${task.done ? "not done" : "done"}`} />
        )}
        <span className={styles.blockTitle}>{task.title}</span>
        {past ? <Icon icon={Warning} label="Runs past midnight" /> : null}
      </div>
      {height >= hourPx / 2 ? (
        <span className={styles.blockTime}>
          {formatTime(task.start!, format)} – {formatTime(end, format)}
          {past ? " · runs past midnight" : ""}
        </span>
      ) : null}
      <div className={styles.resize} onPointerDown={onResizeStart} aria-hidden="true" />
    </div>
  );
}

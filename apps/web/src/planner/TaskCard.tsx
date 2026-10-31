"use client";

import { memo, useRef, useState, type MouseEvent } from "react";
import {
  ArrowsClockwise,
  CalendarCheck,
  ClockCounterClockwise,
  Copy,
  DotsThree,
  FlowArrow,
  Notepad,
  Pause,
  Play,
  Stop,
  Tag,
  Trash,
  TreeStructure,
} from "@phosphor-icons/react";
import {
  diffDays,
  formatClock,
  formatDuration,
  formatStopwatch,
  formatTime,
  relativeDay,
  timerElapsed,
  type Task,
} from "@beans/core";
import { useActions, useLabel, useSettings, useSubtasks, useTicker, useToday } from "@/data/hooks";
import { BeanCheckbox } from "@/ui/garden";
import { Chip, LabelDot } from "@/ui/controls";
import { Icon } from "@/ui/Icon";
import { Menu, MenuDivider, MenuItem } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { LabelPicker, PriorityFlag, PriorityPicker } from "./pickers";
import { useUi } from "./ui-state";
import styles from "./card.module.css";

interface TaskCardProps {
  task: Task;
  /** Compact cards are used in the Timebox side list and rituals. */
  compact?: boolean;
  overlay?: boolean;
}

export const TaskCard = memo(function TaskCard({ task, compact, overlay }: TaskCardProps) {
  const ui = useUi();
  const actions = useActions();
  const settings = useSettings();
  const today = useToday();
  const label = useLabel(task.labelId);
  const subtasks = useSubtasks(task.id);
  const [expanded, setExpanded] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [picker, setPicker] = useState<null | "label" | "priority">(null);
  const labelRef = useRef<HTMLButtonElement>(null);
  const priorityRef = useRef<HTMLButtonElement>(null);
  const timer = settings?.activeTimer?.taskId === task.id ? settings.activeTimer : null;
  const now = useTicker(timer !== null && timer.runningSince !== null);
  const features = settings?.features;
  const selected = ui.selection.includes(task.id);
  const focused = ui.focusedTaskId === task.id;
  const doneSubs = subtasks.filter((s) => s.done).length;
  const hasNotes = task.notes.replace(/<[^>]+>/g, "").trim().length > 0;
  const dueSoon =
    features?.dueDates && task.dueDate && !task.done && diffDays(task.dueDate, today) <= (settings?.dueSoonDays ?? 7);
  const overdue = task.dueDate !== null && diffDays(task.dueDate, today) < 0;

  const onClick = (e: MouseEvent) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      e.preventDefault();
      ui.toggleSelected(task.id);
      return;
    }
    if (ui.selection.length) {
      ui.toggleSelected(task.id);
      return;
    }
    ui.setFocusedTaskId(task.id);
    ui.openTask(task.id);
  };

  const toggleDone = (done: boolean) => {
    const undo = actions.setDone(task.id, done);
    if (done) ui.toast(`Done: ${task.title || "Untitled task"}`, undo);
  };

  const timeChip =
    task.actual > 0 ? `${formatClock(task.actual)} / ${formatClock(task.estimate ?? 0)}` : formatClock(task.estimate ?? 0);

  return (
    <div
      className={[
        styles.card,
        task.done ? styles.done : "",
        selected ? styles.selected : "",
        focused ? styles.focused : "",
        compact ? styles.compact : "",
        overlay ? styles.overlay : "",
      ].join(" ")}
      data-task-id={task.id}
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenu({ x: e.clientX, y: e.clientY });
      }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter") {
          e.preventDefault();
          ui.openTask(task.id);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`${task.title || "Untitled task"}${task.done ? ", done" : ""}`}
    >
      <div className={styles.row}>
        <BeanCheckbox checked={task.done} onChange={toggleDone} label={`Mark “${task.title || "Untitled task"}” ${task.done ? "not done" : "done"}`} />
        <div className={styles.title}>{task.title || <span className={styles.untitled}>Untitled task</span>}</div>
        {!compact ? (
          <button
            type="button"
            className={`${styles.timeChip} ${timer ? styles.timeChipLive : ""}`}
            aria-label={`Time: ${task.actual > 0 ? `${formatDuration(task.actual)} of ` : ""}${task.estimate ? formatDuration(task.estimate) : "no estimate"}`}
            aria-expanded={expanded}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {timeChip}
          </button>
        ) : null}
      </div>

      {(label || task.start || (features?.priority && task.priority) || subtasks.length || hasNotes || task.seriesId || dueSoon || task.rolledFrom) && !compact ? (
        <div className={styles.meta}>
          {label ? (
            <span className={styles.metaItem}>
              <LabelDot color={label.color} /> {label.name}
            </span>
          ) : null}
          {features?.priority && task.priority ? <PriorityFlag priority={task.priority} /> : null}
          {task.start ? <span className={styles.metaStrong}>{formatTime(task.start, settings?.timeFormat ?? "12h")}</span> : null}
          {subtasks.length ? (
            <span className={styles.metaItem} aria-label={`${doneSubs} of ${subtasks.length} subtasks done`}>
              <Icon icon={TreeStructure} /> {doneSubs}/{subtasks.length}
            </span>
          ) : null}
          {hasNotes ? <Icon icon={Notepad} label="Has notes" /> : null}
          {task.seriesId ? <Icon icon={ArrowsClockwise} label="Repeats" /> : null}
          {task.rolledFrom ? (
            <span className={styles.metaItem} title={`Rolled over from ${relativeDay(task.rolledFrom, today)}`}>
              <Icon icon={ClockCounterClockwise} /> Rolled over
            </span>
          ) : null}
          {dueSoon ? (
            <span className={`${styles.metaItem} ${overdue ? styles.overdue : styles.due}`}>
              <Icon icon={CalendarCheck} /> {overdue ? "Overdue" : `Due ${relativeDay(task.dueDate!, today)}`}
            </span>
          ) : null}
        </div>
      ) : null}

      {!compact && !overlay && !label && !task.done ? (
        <div className={styles.hoverRow} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <button ref={labelRef} type="button" className={styles.hoverButton} onClick={() => setPicker("label")}>
            <Icon icon={Tag} /> Label
          </button>
          {features?.priority ? (
            <button ref={priorityRef} type="button" className={styles.hoverButton} aria-label="Priority" onClick={() => setPicker("priority")}>
              <PriorityFlag priority={task.priority} />
            </button>
          ) : null}
        </div>
      ) : null}

      {expanded && !compact ? (
        <div className={styles.timeRow} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          {timer ? (
            <>
              <button type="button" className={styles.play} aria-label={timer.runningSince ? "Pause timer" : "Resume timer"} onClick={() => (timer.runningSince ? actions.pauseTimer() : actions.resumeTimer())}>
                <Icon icon={timer.runningSince ? Pause : Play} size="md" />
              </button>
              <button type="button" className={styles.play} aria-label="Stop timer" onClick={() => actions.stopTimer()}>
                <Icon icon={Stop} size="md" />
              </button>
            </>
          ) : (
            <button type="button" className={styles.play} aria-label="Start timer" onClick={() => actions.startTimer(task.id, "stopwatch")}>
              <Icon icon={Play} size="md" />
            </button>
          )}
          <div className={styles.timeStat}>
            <span>Actual</span>
            <strong>{formatDuration(task.actual)}</strong>
          </div>
          <div className={styles.timeStat}>
            <span>Estimate</span>
            <strong>{task.estimate ? formatDuration(task.estimate) : "None"}</strong>
          </div>
        </div>
      ) : null}

      {timer ? (
        <div className={styles.timerFooter}>
          <span className={styles.liveDot} aria-hidden="true" />
          {timer.mode === "pomodoro" ? (timer.phase === "focus" ? "Focus session" : "On a break") : timer.runningSince ? "Timer running" : "Timer paused"}
          {timer.mode === "pomodoro" && !timer.runningSince ? " (paused)" : ""} · {formatStopwatch(timerElapsed(timer, now))}
        </div>
      ) : null}

      <Popover open={picker === "label"} onClose={() => setPicker(null)} anchor={labelRef} label="Label">
        <LabelPicker
          value={task.labelId}
          onChange={(id) => {
            actions.updateTask(task.id, { labelId: id });
            setPicker(null);
          }}
        />
      </Popover>
      <Popover open={picker === "priority"} onClose={() => setPicker(null)} anchor={priorityRef} label="Priority">
        <PriorityPicker
          value={task.priority}
          onChange={(p) => {
            actions.updateTask(task.id, { priority: p });
            setPicker(null);
          }}
        />
      </Popover>
      <TaskContextMenu task={task} at={menu} onClose={() => setMenu(null)} />
    </div>
  );
});

export function TaskContextMenu({ task, at, onClose }: { task: Task; at: { x: number; y: number } | null; onClose: () => void }) {
  const ui = useUi();
  const actions = useActions();
  const settings = useSettings();
  const pick = (fn: () => void) => () => {
    onClose();
    fn();
  };
  return (
    <Popover open={at !== null} onClose={onClose} anchor={at} label="Task actions">
      <Menu label="Task actions">
        <MenuItem icon={DotsThree} onSelect={pick(() => ui.openTask(task.id))}>
          Open
        </MenuItem>
        <MenuItem
          icon={Copy}
          onSelect={pick(() => {
            const { undo } = actions.duplicateTask(task.id);
            ui.toast("Task duplicated", undo);
          })}
        >
          Duplicate
        </MenuItem>
        {settings?.features.templates ? (
          <MenuItem
            icon={FlowArrow}
            onSelect={pick(() => {
              actions.saveAsTemplate(task.id);
              ui.toast("Saved as a template");
            })}
          >
            Save as template
          </MenuItem>
        ) : null}
        <MenuItem icon={Play} onSelect={pick(() => actions.startTimer(task.id, "stopwatch"))}>
          Start timer
        </MenuItem>
        <MenuDivider />
        <MenuItem
          icon={Trash}
          danger
          onSelect={pick(() => {
            const undo = actions.deleteTask(task.id);
            ui.toast("Moved to Trash", undo);
          })}
        >
          Delete
        </MenuItem>
      </Menu>
    </Popover>
  );
}

export function DayTotalChip({ estimate, actual, over }: { estimate: number; actual: number; over: boolean }) {
  if (!estimate && !actual) return null;
  return (
    <Chip tone={over ? "danger" : "plain"} title={over ? "More than your daily limit" : "Planned time"}>
      {actual > 0 ? `${formatClock(actual)} / ${formatClock(estimate)}` : formatClock(estimate)}
    </Chip>
  );
}

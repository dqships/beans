import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { Copy } from "@phosphor-icons/react/dist/ssr/Copy";
import { DotsSixVertical } from "@phosphor-icons/react/dist/ssr/DotsSixVertical";
import { Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { Trash } from "@phosphor-icons/react/dist/ssr/Trash";
import { formatHour, minutesToTime, timeToMinutes } from "@beans/core/dates";
import { formatDuration } from "@beans/core/duration";
import { BeanCheckbox, NowBean } from "@/ui/garden";
import { copyText, newId, useNow, useStored } from "../hooks";
import { Button, Field, Icon, IconButton, PrintButton, Select, TextInput, kit } from "../kit";
import {
  EMPTY_PLAN,
  EXAMPLE_PLAN,
  LENGTHS,
  MAX_TASKS,
  SNAP,
  addTask,
  clock,
  layout,
  moveBy,
  nextFree,
  parseDayPlan,
  planAsText,
  range,
  removeTask,
  renameTask,
  resizeBy,
  scheduleNext,
  setHours,
  setMinutes,
  setStart,
  toggleTask,
  totals,
  type DayPlan,
  type PlanTask,
} from "../logic/timeblocks";
import lists from "./lists.module.css";
import styles from "./timeblocks.module.css";

const LENGTH_OPTIONS = LENGTHS.map((minutes) => ({ value: String(minutes), label: formatDuration(minutes) }));
const FROM_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({ value: String(hour), label: formatHour(hour, "12h") }));
const TO_OPTIONS = Array.from({ length: 24 }, (_, i) => ({ value: String(i + 1), label: i + 1 === 24 ? "Midnight" : formatHour(i + 1, "12h") }));
const COLORS = [styles.c0, styles.c1, styles.c2, styles.c3, styles.c4, styles.c5, styles.c6, styles.c7];

/** What a pointer is doing: carrying a task from the list, moving a block, or stretching one. */
type Drag = { kind: "carry"; id: string; x: number; y: number; at: number | null } | { kind: "move"; id: string; start: number } | { kind: "size"; id: string; minutes: number };

const vars = (values: Record<string, number>) => values as CSSProperties;

export function TimeBlockingPlanner() {
  const [plan, setPlan] = useStored("time-blocking-planner", EMPTY_PLAN, parseDayPlan);
  const [title, setTitle] = useState("");
  const [length, setLength] = useState("30");
  const [drag, setDrag] = useState<Drag | null>(null);
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const lane = useRef<HTMLDivElement>(null);
  const origin = useRef({ y: 0, start: 0, minutes: 0 });
  const now = useNow(true, 30_000);

  // While a block is being dragged, the grid shows where it would land.
  const shown: DayPlan = drag?.kind === "move" ? setStart(plan, drag.id, drag.start) : drag?.kind === "size" ? setMinutes(plan, drag.id, drag.minutes) : plan;
  const placed = layout(shown.tasks);
  const { blocked, capacity, waiting, waitingMinutes } = totals(shown);
  const dayStart = plan.from * 60;
  const hours = Array.from({ length: plan.to - plan.from }, (_, i) => plan.from + i);
  const colorOf = (id: string) => COLORS[plan.tasks.findIndex((task) => task.id === id) % COLORS.length];
  const full = plan.tasks.length >= MAX_TASKS;

  const nowMinutes = now === null ? null : new Date(now).getHours() * 60 + new Date(now).getMinutes();
  const showNow = nowMinutes !== null && nowMinutes >= dayStart && nowMinutes <= plan.to * 60;

  const add = () => {
    if (!title.trim()) return;
    setPlan((current) => addTask(current, title, Number(length), newId()));
    setTitle("");
  };

  const schedule = (task: PlanTask) => {
    const at = nextFree(plan, task.minutes, dayStart, task.id);
    if (at === null) {
      setStatus(`No gap is long enough for ${task.title}. Shorten it, or show more hours.`);
      return;
    }
    setPlan((current) => scheduleNext(current, task.id));
    setStatus(`${task.title} scheduled at ${clock(at)}.`);
  };

  /** The minute a point on the screen stands for, or null when it's off the hours. */
  const minuteAt = (x: number, y: number): number | null => {
    const box = lane.current?.getBoundingClientRect();
    if (!box || x < box.left || x > box.right || y < box.top || y > box.bottom) return null;
    return dayStart + ((y - box.top) / box.height) * capacity;
  };
  const minutesPerPixel = () => capacity / (lane.current?.getBoundingClientRect().height || 1);

  // Mouse and pen drag. Touch scrolls the page, and uses Schedule or the time field.
  const grab = (event: PointerEvent<HTMLElement>): boolean => {
    if (event.pointerType === "touch" || event.button !== 0) return false;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    return true;
  };

  const carry = {
    onPointerDown: (event: PointerEvent<HTMLElement>, task: PlanTask) => {
      if (grab(event)) setDrag({ kind: "carry", id: task.id, x: event.clientX, y: event.clientY, at: null });
    },
    onPointerMove: (event: PointerEvent<HTMLElement>, task: PlanTask) => {
      if (drag?.kind !== "carry") return;
      const at = minuteAt(event.clientX, event.clientY);
      // The block hangs from the pointer by its middle.
      const start = at === null ? null : setStart(plan, task.id, at - task.minutes / 2).tasks.find((t) => t.id === task.id)!.start;
      setDrag({ kind: "carry", id: task.id, x: event.clientX, y: event.clientY, at: start });
    },
    onPointerUp: (task: PlanTask) => {
      if (drag?.kind !== "carry") return;
      const at = drag.at;
      if (at !== null) {
        setPlan((current) => setStart(current, task.id, at));
        setStatus(`${task.title} scheduled at ${clock(at)}.`);
      }
      setDrag(null);
    },
  };

  const startMove = (event: PointerEvent<HTMLElement>, task: PlanTask) => {
    if (task.start === null || !grab(event)) return;
    origin.current = { y: event.clientY, start: task.start, minutes: task.minutes };
    setDrag({ kind: "move", id: task.id, start: task.start });
  };
  const startSize = (event: PointerEvent<HTMLElement>, task: PlanTask) => {
    event.stopPropagation();
    if (!grab(event)) return;
    origin.current = { y: event.clientY, start: task.start ?? 0, minutes: task.minutes };
    setDrag({ kind: "size", id: task.id, minutes: task.minutes });
  };
  const dragBlock = (event: PointerEvent<HTMLElement>) => {
    if (!drag || drag.kind === "carry") return;
    const delta = (event.clientY - origin.current.y) * minutesPerPixel();
    if (drag.kind === "move") setDrag({ ...drag, start: origin.current.start + delta });
    else setDrag({ ...drag, minutes: origin.current.minutes + delta });
  };
  const dropBlock = () => {
    if (!drag || drag.kind === "carry") return;
    if (drag.kind === "move") setPlan((current) => setStart(current, drag.id, drag.start));
    else setPlan((current) => setMinutes(current, drag.id, drag.minutes));
    setDrag(null);
  };

  const onBlockKey = (event: KeyboardEvent<HTMLElement>, task: PlanTask) => {
    const step = event.key === "ArrowUp" ? -SNAP : event.key === "ArrowDown" ? SNAP : 0;
    if (step) {
      event.preventDefault();
      setPlan((current) => (event.shiftKey ? resizeBy(current, task.id, step) : moveBy(current, task.id, step)));
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      setPlan((current) => setStart(current, task.id, null));
      setStatus(`${task.title} taken off the schedule.`);
    }
  };

  const carried = drag?.kind === "carry" ? plan.tasks.find((task) => task.id === drag.id) : undefined;

  return (
    <div className={styles.planner}>
      <div className={styles.head}>
        <input className={lists.title} value={plan.title} onChange={(e) => setPlan({ ...plan, title: e.target.value.slice(0, 120) })} placeholder="Name the day" aria-label="Day" />
        <div className={`${styles.hoursPick} ${kit.noPrint}`}>
          <Field label="From">
            <Select value={String(plan.from)} onValue={(from) => setPlan((current) => setHours(current, Number(from), Math.max(current.to, Number(from) + 1)))} options={FROM_OPTIONS} />
          </Field>
          <Field label="To">
            <Select value={String(plan.to)} onValue={(to) => setPlan((current) => setHours(current, Math.min(current.from, Number(to) - 1), Number(to)))} options={TO_OPTIONS} />
          </Field>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.tasks}>
          <p className={styles.columnTitle}>Tasks</p>
          <form
            className={`${styles.add} ${kit.noPrint}`}
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <TextInput value={title} onValue={setTitle} placeholder={full ? "The list is full" : "Add a task"} aria-label="New task" maxLength={120} disabled={full} />
            <Select value={length} onValue={setLength} options={LENGTH_OPTIONS} aria-label="How long it takes" />
            <Button type="submit" variant="primary" icon={Plus} disabled={full || !title.trim()}>
              Add
            </Button>
          </form>

          {plan.tasks.length === 0 ? (
            <div className={`${styles.rows} ${styles.emptyRows}`}>
              <p>Add what you need to do today, with a guess at how long each task takes. Then give each one a time.</p>
              <Button onClick={() => setPlan(EXAMPLE_PLAN)}>Load an example day</Button>
            </div>
          ) : (
            <ul className={styles.rows}>
              {plan.tasks.map((task) => (
                <li key={task.id} className={`${styles.row} ${task.done ? lists.done : ""}`}>
                  <BeanCheckbox checked={task.done} onChange={() => setPlan((current) => toggleTask(current, task.id))} label={`${task.title} done`} />
                  <TaskTitle task={task} onRename={(next) => setPlan((current) => renameTask(current, task.id, next))} />
                  <span className={kit.noPrint}>
                    <IconButton icon={Trash} label={`Delete ${task.title}`} iconSize="sm" onClick={() => setPlan((current) => removeTask(current, task.id))} />
                  </span>
                  <div className={styles.rowMeta}>
                    <span
                      className={`${styles.handle} ${kit.noPrint}`}
                      title="Drag onto the hours"
                      aria-hidden="true"
                      onPointerDown={(e) => carry.onPointerDown(e, task)}
                      onPointerMove={(e) => carry.onPointerMove(e, task)}
                      onPointerUp={() => carry.onPointerUp(task)}
                      onPointerCancel={() => setDrag(null)}
                    >
                      <Icon icon={DotsSixVertical} />
                    </span>
                    <select className={styles.small} value={String(task.minutes)} aria-label={`How long ${task.title} takes`} onChange={(e) => setPlan((current) => setMinutes(current, task.id, Number(e.target.value)))}>
                      {(LENGTHS.includes(task.minutes) ? LENGTHS : [...LENGTHS, task.minutes].sort((a, b) => a - b)).map((minutes) => (
                        <option key={minutes} value={minutes}>
                          {formatDuration(minutes)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="time"
                      step={SNAP * 60}
                      className={styles.small}
                      value={task.start === null ? "" : minutesToTime(task.start)}
                      aria-label={`Start time for ${task.title}`}
                      onChange={(e) => {
                        const value = e.target.value;
                        setPlan((current) => setStart(current, task.id, value ? timeToMinutes(value) : null));
                      }}
                    />
                    {task.start === null ? (
                      <Button size="sm" className={kit.noPrint} onClick={() => schedule(task)}>
                        Schedule<span className="visually-hidden"> {task.title} in the next gap</span>
                      </Button>
                    ) : (
                      <Button size="sm" variant="quiet" className={kit.noPrint} onClick={() => setPlan((current) => setStart(current, task.id, null))}>
                        Take off<span className="visually-hidden"> {task.title} from the schedule</span>
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className={styles.summary}>
            {formatDuration(blocked)} blocked out of {formatDuration(capacity)}.{" "}
            {waiting === 0 ? (plan.tasks.length ? "Every task has a time." : "") : `${waiting} ${waiting === 1 ? "task" : "tasks"} still to schedule (${formatDuration(waitingMinutes)}).`}
          </p>
        </div>

        <div className={styles.timebox} role="group" aria-label="Schedule">
          <p className={styles.columnTitle}>Schedule</p>
          <div className={styles.grid} style={vars({ "--hours": hours.length })}>
            <ol className={styles.hours} aria-hidden="true">
              {hours.map((hour) => (
                <li key={hour} className={styles.hour}>
                  {formatHour(hour, "12h")}
                </li>
              ))}
            </ol>
            <div className={styles.lane} ref={lane}>
              {placed.map(({ task, start, col, cols }) => (
                <div
                  key={task.id}
                  tabIndex={0}
                  role="group"
                  aria-roledescription="time block"
                  aria-label={`${task.title}, ${range(start, task.minutes)}`}
                  aria-describedby="block-keys"
                  className={[styles.block, colorOf(task.id), task.minutes <= 30 ? styles.short : "", task.done ? styles.blockDone : "", drag && drag.kind !== "carry" && drag.id === task.id ? styles.dragging : ""].join(" ")}
                  style={vars({ "--at": start - dayStart, "--len": task.minutes, "--col": col, "--cols": cols })}
                  onPointerDown={(e) => startMove(e, task)}
                  onPointerMove={dragBlock}
                  onPointerUp={dropBlock}
                  onPointerCancel={() => setDrag(null)}
                  onKeyDown={(e) => onBlockKey(e, task)}
                >
                  <span className={styles.blockTitle}>{task.title}</span>
                  <span className={styles.blockTime}>{range(start, task.minutes)}</span>
                  <span className={styles.grip} onPointerDown={(e) => startSize(e, task)} onPointerMove={dragBlock} onPointerUp={dropBlock} onPointerCancel={() => setDrag(null)} />
                </div>
              ))}
              {drag?.kind === "carry" && drag.at !== null && carried ? (
                <div className={`${styles.block} ${styles.preview}`} style={vars({ "--at": drag.at - dayStart, "--len": carried.minutes, "--col": 0, "--cols": 1 })} />
              ) : null}
              {showNow ? (
                <div className={`${styles.now} ${kit.noPrint}`} style={vars({ "--at": nowMinutes - dayStart })} aria-hidden="true">
                  <NowBean className={styles.nowBean} />
                </div>
              ) : null}
            </div>
          </div>
          <p id="block-keys" className={`${styles.hint} ${kit.noPrint}`}>
            <span className={styles.dragHint}>Drag a block to move it, or its lower edge to change its length. </span>
            With a block selected, the arrow keys move it, Shift and the arrow keys change its length, and Delete takes it off.
          </p>
        </div>
      </div>

      <div className={`${styles.foot} ${kit.noPrint}`}>
        {plan.tasks.length ? (
          <Button
            variant={confirmClear ? "danger" : "quiet"}
            onBlur={() => setConfirmClear(false)}
            onClick={() => {
              if (!confirmClear) return setConfirmClear(true);
              setPlan(EMPTY_PLAN);
              setConfirmClear(false);
            }}
          >
            {confirmClear ? "Clear the whole day?" : "Clear"}
          </Button>
        ) : null}
        <Button
          icon={Copy}
          disabled={plan.tasks.length === 0}
          onClick={async () => {
            setCopied(await copyText(planAsText(plan)));
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
        <PrintButton />
      </div>

      <p className="visually-hidden" role="status">
        {status}
      </p>
      {carried && drag?.kind === "carry" ? (
        <div className={styles.ghost} style={{ transform: `translate(${drag.x}px, ${drag.y}px)` }} aria-hidden="true">
          {carried.title}
        </div>
      ) : null}
    </div>
  );
}

/** A task's name, edited in place and saved on Enter or when you leave the field. */
function TaskTitle({ task, onRename }: { task: PlanTask; onRename: (title: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      className={lists.text}
      value={draft ?? task.title}
      aria-label="Task"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== null && draft !== task.title) onRename(draft);
        setDraft(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setDraft(null);
      }}
    />
  );
}

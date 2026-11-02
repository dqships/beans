"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowsClockwise,
  CalendarBlank,
  CalendarCheck,
  Clock,
  Copy,
  DotsSixVertical,
  DotsThreeVertical,
  Flag,
  FlowArrow,
  Hourglass,
  Plus,
  Tag,
  Trash,
  X,
} from "@phosphor-icons/react";
import {
  describeRule,
  formatDuration,
  formatStopwatch,
  formatTime,
  minutesToTime,
  parseDuration,
  relativeDay,
  timerElapsed,
  type DateKey,
  type Subtask,
  type Task,
} from "@beans/core";
import {
  useActions,
  useLabel,
  useLists,
  useSeries,
  useSettings,
  useSubtasks,
  useTask,
  useTicker,
  useToday,
} from "@/data/hooks";
import { Button, IconButton } from "@/ui/Button";
import { LabelDot, TextInput } from "@/ui/controls";
import { BeanCheckbox } from "@/ui/garden";
import { Icon } from "@/ui/Icon";
import { Menu, MenuDivider, MenuHeading, MenuItem } from "@/ui/Menu";
import { Modal } from "@/ui/Modal";
import { Popover } from "@/ui/Popover";
import { NotesEditor } from "./NotesEditor";
import { DatePicker, EstimatePicker, LabelPicker, ListPicker, PRIORITIES, PriorityFlag, PriorityPicker } from "./pickers";
import { RepeatPicker } from "./repeat-picker";
import { useUi } from "./ui-state";
import styles from "./modal.module.css";

export function TaskModal() {
  const ui = useUi();
  const task = useTask(ui.openTaskId);
  const close = () => ui.openTask(null);
  return (
    <>
      <Modal open={task !== null} onClose={close} label="Task details">
        {task ? <TaskDetails key={task.id} task={task} onClose={close} /> : null}
      </Modal>
      <Modal open={ui.draft !== null} onClose={() => ui.setDraft(null)} label="New task">
        {ui.draft ? <DraftForm /> : null}
      </Modal>
    </>
  );
}

type PickerName = "date" | "time" | "list" | "due" | "estimate" | "actual" | "priority" | "label" | "repeat" | "menu" | "delete";

function TaskDetails({ task, onClose }: { task: Task; onClose: () => void }) {
  const ui = useUi();
  const actions = useActions();
  const settings = useSettings();
  const today = useToday();
  const label = useLabel(task.labelId);
  const series = useSeries(task.seriesId);
  const lists = useLists();
  const [picker, setPicker] = useState<PickerName | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const anchor = useMemo(() => ({ current: anchorEl }), [anchorEl]);
  const openPicker = (name: PickerName) => (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
    setPicker(name);
  };
  const features = settings?.features;
  const format = settings?.timeFormat ?? "12h";
  const timer = settings?.activeTimer?.taskId === task.id ? settings.activeTimer : null;
  const now = useTicker(timer?.runningSince != null);
  const [title, setTitle] = useState(task.title);
  const close = () => setPicker(null);
  const update = (fields: Partial<Task>) => actions.updateTask(task.id, fields);
  const list = task.listId ? lists.find((l) => l.id === task.listId) : undefined;

  const saveTitle = () => {
    if (title.trim() !== task.title) update({ title: title.trim() });
  };

  const remove = () => {
    const undo = actions.deleteInstance(task.id);
    ui.toast("Moved to Trash", undo);
    onClose();
  };

  const placement = task.date
    ? `${relativeDay(task.date, today)}${task.start ? `, ${formatTime(task.start, format)}` : ""}`
    : list
      ? `${list.icon} ${list.name}`
      : "Brain Dump";

  return (
    <div
      className={styles.body}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && (e.key === "Backspace" || e.key === "Delete")) {
          e.preventDefault();
          remove();
        }
      }}
    >
      <div className={styles.titleRow}>
        <BeanCheckbox
          checked={task.done}
          onChange={(d) => {
            const undo = actions.setDone(task.id, d);
            if (d) ui.toast(`Done: ${task.title}`, undo);
          }}
          label={task.done ? "Mark not done" : "Mark done"}
        />
        <AutoTextarea
          className={`${styles.titleInput} ${task.done ? styles.doneTitle : ""}`}
          value={title}
          placeholder="Untitled task"
          aria-label="Task title"
          onChange={setTitle}
          onBlur={saveTitle}
          onEnter={saveTitle}
        />
        <IconButton icon={DotsThreeVertical} label="More actions" onClick={openPicker("menu")} />
        <IconButton icon={X} label="Close" onClick={onClose} />
      </div>

      <div className={styles.fields}>
        <Field icon={CalendarBlank} name="Task date">
          <button type="button" className={styles.fieldValue} onClick={openPicker("date")}>
            {placement}
          </button>
          {task.date ? (
            <>
              <button type="button" className={styles.aside} onClick={openPicker("time")}>
                {task.start ? "Change time" : "Add a time"}
              </button>
              <button type="button" className={styles.aside} onClick={openPicker("list")}>
                Move to a list
              </button>
            </>
          ) : null}
          {task.start && task.estimate && task.start && toMinutes(task.start) + task.estimate > 24 * 60 ? (
            <span className={`${styles.aside} ${styles.warn}`}>Runs past midnight</span>
          ) : null}
        </Field>

        {features?.dueDates ? (
          <Field icon={CalendarCheck} name="Due date">
            <button type="button" className={styles.fieldValue} onClick={openPicker("due")}>
              {task.dueDate ? `Due ${relativeDay(task.dueDate, today)}` : <Empty />}
            </button>
          </Field>
        ) : null}

        <Field icon={Hourglass} name="Estimate">
          <button type="button" className={styles.fieldValue} onClick={openPicker("estimate")}>
            {task.estimate ? formatDuration(task.estimate) : <Empty />}
          </button>
        </Field>

        <Field icon={Clock} name="Actual time">
          <button type="button" className={styles.fieldValue} onClick={openPicker("actual")}>
            {task.actual ? formatDuration(task.actual) : <Empty text="Click to edit" />}
          </button>
          {timer ? (
            <>
              <span className={styles.aside}>
                {timer.runningSince ? "Running" : "Paused"} {formatStopwatch(timerElapsed(timer, now))}
              </span>
              <button type="button" className={styles.aside} onClick={() => (timer.runningSince ? actions.pauseTimer() : actions.resumeTimer())}>
                {timer.runningSince ? "Pause" : "Resume"}
              </button>
              <button type="button" className={styles.aside} onClick={() => actions.stopTimer()}>
                Stop
              </button>
            </>
          ) : (
            <>
              <button type="button" className={styles.aside} onClick={() => actions.startTimer(task.id, "stopwatch")}>
                Start timer
              </button>
              {features?.pomodoro ? (
                <button type="button" className={styles.aside} onClick={() => actions.startTimer(task.id, "pomodoro")}>
                  Start focus session
                </button>
              ) : null}
            </>
          )}
        </Field>

        {features?.priority ? (
          <Field icon={Flag} name="Priority">
            <button type="button" className={styles.fieldValue} onClick={openPicker("priority")}>
              {task.priority ? (
                <>
                  <PriorityFlag priority={task.priority} /> {PRIORITIES.find((p) => p.value === task.priority)!.label}
                </>
              ) : (
                <Empty />
              )}
            </button>
          </Field>
        ) : null}

        <Field icon={Tag} name="Label">
          <button type="button" className={styles.fieldValue} onClick={openPicker("label")}>
            {label ? (
              <>
                <LabelDot color={label.color} /> {label.name}
              </>
            ) : (
              <Empty />
            )}
          </button>
        </Field>

        <Field icon={ArrowsClockwise} name="Repeats">
          <button type="button" className={styles.fieldValue} onClick={openPicker("repeat")}>
            {series ? describeRule(series.rule) : <Empty text="Doesn't repeat" />}
          </button>
        </Field>
      </div>

      <div className={styles.divider} />
      <h3 className={styles.sectionTitle}>Notes</h3>
      <NotesEditor value={task.notes} onChange={(notes) => notes !== task.notes && update({ notes })} />
      <div className={styles.divider} />
      <Subtasks task={task} />

      {/* Pickers */}
      <Popover open={picker === "date"} onClose={close} anchor={anchor} label="Task date">
        <DatePicker
          value={task.date}
          onChange={(date) => {
            actions.moveTask(task.id, date ? { date, start: date === task.date ? task.start : null } : { date: null, listId: null });
            close();
          }}
          allowNone
          noneLabel="Move to Brain Dump"
        />
      </Popover>
      <Popover open={picker === "time"} onClose={close} anchor={anchor} label="Time">
        <TimePicker
          value={task.start}
          onChange={(start) => {
            update({ start });
            close();
          }}
        />
      </Popover>
      <Popover open={picker === "list"} onClose={close} anchor={anchor} label="Move to a list">
        <ListPicker
          onChange={(listId) => {
            actions.moveTask(task.id, { date: null, listId });
            close();
          }}
        />
      </Popover>
      <Popover open={picker === "due"} onClose={close} anchor={anchor} label="Due date">
        <DatePicker
          value={task.dueDate}
          allowNone
          noneLabel="Remove due date"
          onChange={(dueDate) => {
            update({ dueDate });
            close();
          }}
        />
      </Popover>
      <Popover open={picker === "estimate"} onClose={close} anchor={anchor} label="Estimate">
        <EstimatePicker
          value={task.estimate}
          onChange={(estimate) => {
            update({ estimate });
            close();
          }}
        />
      </Popover>
      <Popover open={picker === "actual"} onClose={close} anchor={anchor} label="Actual time">
        <ActualEditor
          value={task.actual}
          onChange={(actual) => {
            update({ actual });
            close();
          }}
        />
      </Popover>
      <Popover open={picker === "priority"} onClose={close} anchor={anchor} label="Priority">
        <PriorityPicker
          value={task.priority}
          onChange={(priority) => {
            update({ priority });
            close();
          }}
        />
      </Popover>
      <Popover open={picker === "label"} onClose={close} anchor={anchor} label="Label">
        <LabelPicker
          value={task.labelId}
          onChange={(labelId) => {
            update({ labelId });
            close();
          }}
        />
      </Popover>
      <Popover open={picker === "repeat"} onClose={close} anchor={anchor} label="Repeat">
        <RepeatPicker
          date={task.date ?? today}
          current={series?.rule ?? null}
          hasTime={task.start !== null}
          atTime={series ? series.start !== null : false}
          onAtTime={(v) => {
            if (series) actions.apply([{ kind: "patch", table: "series", id: series.id, fields: { start: v ? task.start : null } }]);
          }}
          onPick={(rule) => {
            if (series) actions.changeRule(series.id, rule, task.seriesDate ?? task.date ?? today);
            else actions.makeRepeating(task.id, rule);
            close();
          }}
          onStop={
            series
              ? () => {
                  actions.stopRepeating(task.id);
                  ui.toast("This task no longer repeats");
                  close();
                }
              : undefined
          }
          onUpdateAll={
            series
              ? () => {
                  actions.updateAllIncomplete(task.id);
                  ui.toast("Every unfinished repeat now matches");
                  close();
                }
              : undefined
          }
        />
      </Popover>
      <Popover open={picker === "menu"} onClose={close} anchor={anchor} placement="bottom-end" label="More actions">
        <Menu label="More actions">
          <MenuItem
            icon={Copy}
            onSelect={() => {
              const { undo } = actions.duplicateTask(task.id);
              ui.toast("Task duplicated", undo);
              close();
            }}
          >
            Duplicate
          </MenuItem>
          {features?.templates ? (
            <MenuItem
              icon={FlowArrow}
              onSelect={() => {
                actions.saveAsTemplate(task.id);
                ui.toast("Saved as a template");
                close();
              }}
            >
              Save as template
            </MenuItem>
          ) : null}
          <MenuDivider />
          <MenuItem icon={Trash} danger hint="Ctrl ⌫" onSelect={() => (series ? setPicker("delete") : remove())}>
            Delete
          </MenuItem>
        </Menu>
      </Popover>
      <Popover open={picker === "delete"} onClose={close} anchor={anchor} placement="bottom-end" label="Delete a repeating task">
        <Menu label="Delete a repeating task">
          <MenuHeading>This task repeats</MenuHeading>
          <MenuItem icon={Trash} onSelect={remove}>
            Delete just this one
          </MenuItem>
          <MenuItem
            icon={Trash}
            danger
            onSelect={() => {
              if (series && window.confirm("Delete every repeat of this task? This can't be undone.")) {
                actions.deleteSeries(series.id);
                ui.toast("Deleted every repeat");
                onClose();
              }
            }}
          >
            Delete every repeat
          </MenuItem>
        </Menu>
      </Popover>
    </div>
  );
}

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function Field({ icon, name, children }: { icon: typeof Clock; name: string; children: ReactNode }) {
  return (
    <>
      <span className={styles.fieldName}>
        <Icon icon={icon} /> {name}
      </span>
      <span className={styles.fieldGroup}>{children}</span>
    </>
  );
}

function Empty({ text = "Click to add" }: { text?: string }) {
  return <span className={styles.empty}>{text}</span>;
}

function AutoTextarea({
  value,
  onChange,
  onBlur,
  onEnter,
  className,
  placeholder,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  onEnter?: () => void;
  className?: string;
  placeholder?: string;
  "aria-label": string;
  "data-autofocus"?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`; // token-ok: measured content height
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, " "))}
      onBlur={onBlur}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onEnter?.();
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
      {...rest}
    />
  );
}

export function TimePicker({ value, onChange }: { value: string | null; onChange: (t: string | null) => void }) {
  const settings = useSettings();
  const step = settings?.snapMinutes ?? 15;
  const startHour = settings?.dayStartHour ?? 0;
  const format = settings?.timeFormat ?? "12h";
  const [text, setText] = useState("");
  const times: string[] = [];
  for (let m = startHour * 60; m < 24 * 60; m += step) times.push(minutesToTime(m));
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target = listRef.current?.querySelector<HTMLElement>(`[data-time="${value ?? "09:00"}"]`);
    target?.scrollIntoView({ block: "center" });
  }, [value]);
  return (
    <div className={styles.timePicker}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const match = text.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
          if (!match) return;
          let h = Number(match[1]);
          const m = Number(match[2] ?? 0);
          const suffix = match[3]?.toLowerCase();
          if (suffix === "pm" && h < 12) h += 12;
          if (suffix === "am" && h === 12) h = 0;
          if (h < 24 && m < 60) onChange(minutesToTime(h * 60 + m));
        }}
      >
        <TextInput data-autofocus placeholder="Type a time, like 3:30pm" aria-label="Time" value={text} onChange={(e) => setText(e.target.value)} />
      </form>
      <div ref={listRef} className={styles.timeList}>
        <Menu label="Times">
          {value ? (
            <MenuItem icon={X} onSelect={() => onChange(null)}>
              Remove time
            </MenuItem>
          ) : null}
          {times.map((t) => (
            <div key={t} data-time={t}>
              <MenuItem onSelect={() => onChange(t)} checked={value === t}>
                {formatTime(t, format)}
              </MenuItem>
            </div>
          ))}
        </Menu>
      </div>
    </div>
  );
}

function ActualEditor({ value, onChange }: { value: number; onChange: (m: number) => void }) {
  const [text, setText] = useState(value ? formatDuration(value) : "");
  const parsed = parseDuration(text);
  return (
    <form
      className={styles.actualEditor}
      onSubmit={(e) => {
        e.preventDefault();
        onChange(text.trim() === "" ? 0 : (parsed ?? value));
      }}
    >
      <TextInput data-autofocus aria-label="Actual time" placeholder="Like 1h 15m" value={text} onChange={(e) => setText(e.target.value)} />
      <Button type="submit" variant="primary" size="sm" disabled={text.trim() !== "" && parsed === null}>
        Save
      </Button>
    </form>
  );
}

function Subtasks({ task }: { task: Task }) {
  const subtasks = useSubtasks(task.id);
  const actions = useActions();
  const [adding, setAdding] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const done = subtasks.filter((s) => s.done).length;
  return (
    <div className={styles.subtasks}>
      <h3 className={styles.sectionTitle}>
        Subtasks {subtasks.length ? <span className={styles.empty}>{done}/{subtasks.length}</span> : null}
      </h3>
      <div role="list">
        {subtasks.map((s, i) => (
          <SubtaskRow
            key={s.id}
            subtask={s}
            autoFocus={focusId === s.id}
            dragging={dragId === s.id}
            onDragStart={() => setDragId(s.id)}
            onDragEnd={() => setDragId(null)}
            onDropOn={() => {
              if (dragId && dragId !== s.id) actions.moveSubtask(dragId, i);
              setDragId(null);
            }}
            onEnter={() => {
              const { id } = actions.addSubtask(task.id, "", s.id);
              setFocusId(id);
            }}
          />
        ))}
      </div>
      {adding ? (
        <NewSubtask
          onAdd={(title) => {
            actions.addSubtask(task.id, title);
          }}
          onDone={() => setAdding(false)}
        />
      ) : (
        <Button size="sm" variant="quiet" icon={Plus} onClick={() => setAdding(true)} className={styles.addSubtask}>
          Add subtask
        </Button>
      )}
    </div>
  );
}

function SubtaskRow({
  subtask,
  autoFocus,
  dragging,
  onDragStart,
  onDragEnd,
  onDropOn,
  onEnter,
}: {
  subtask: Subtask;
  autoFocus: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropOn: () => void;
  onEnter: () => void;
}) {
  const actions = useActions();
  const [title, setTitle] = useState(subtask.title);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const save = () => {
    if (title !== subtask.title) actions.updateSubtask(subtask.id, { title });
  };
  return (
    <div
      role="listitem"
      className={`${styles.subtask} ${dragging ? styles.subtaskDragging : ""}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDropOn();
      }}
    >
      <span
        className={styles.handle}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        aria-label="Drag to reorder"
        title="Drag to reorder"
      >
        <Icon icon={DotsSixVertical} />
      </span>
      <BeanCheckbox size="sm" checked={subtask.done} onChange={(d) => actions.setSubtaskDone(subtask.id, d)} label={`Mark “${subtask.title}” ${subtask.done ? "not done" : "done"}`} />
      <input
        className={`${styles.subtaskInput} ${subtask.done ? styles.doneTitle : ""}`}
        value={title}
        autoFocus={autoFocus}
        aria-label="Subtask"
        placeholder="Subtask"
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => {
          if (!title.trim()) actions.deleteSubtask(subtask.id);
          else save();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
            if (title.trim()) onEnter();
          } else if (e.key === "Backspace" && title === "") {
            e.preventDefault();
            actions.deleteSubtask(subtask.id);
          }
        }}
      />
      <IconButton ref={menuRef} icon={DotsThreeVertical} iconSize="sm" label="Subtask actions" onClick={() => setMenu(true)} className={styles.subtaskMenu} />
      <Popover open={menu} onClose={() => setMenu(false)} anchor={menuRef} placement="bottom-end" label="Subtask actions">
        <Menu label="Subtask actions">
          <MenuItem icon={Copy} onSelect={() => { actions.duplicateSubtask(subtask.id); setMenu(false); }}>
            Duplicate
          </MenuItem>
          <MenuItem icon={Trash} danger onSelect={() => { actions.deleteSubtask(subtask.id); setMenu(false); }}>
            Delete
          </MenuItem>
        </Menu>
      </Popover>
    </div>
  );
}

function NewSubtask({ onAdd, onDone }: { onAdd: (title: string) => void; onDone: () => void }) {
  const [title, setTitle] = useState("");
  return (
    <div className={styles.subtask}>
      <span className={styles.handle} />
      <BeanCheckbox size="sm" checked={false} onChange={() => {}} label="New subtask" />
      <input
        autoFocus
        className={styles.subtaskInput}
        placeholder="What's the next step?"
        aria-label="New subtask"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => {
          if (title.trim()) onAdd(title.trim());
          onDone();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (title.trim()) onAdd(title.trim());
            setTitle("");
          } else if (e.key === "Escape") {
            e.stopPropagation();
            onDone();
          }
        }}
      />
    </div>
  );
}

/** Quick create from an empty calendar slot. */
function DraftForm() {
  const ui = useUi();
  const actions = useActions();
  const settings = useSettings();
  const today = useToday();
  const draft = ui.draft!;
  const [title, setTitle] = useState("");
  const [labelId, setLabelId] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<number | null>(draft.estimate);
  const [picker, setPicker] = useState<null | "label" | "estimate">(null);
  const label = useLabel(labelId);
  const labelRef = useRef<HTMLButtonElement>(null);
  const estimateRef = useRef<HTMLButtonElement>(null);
  const format = settings?.timeFormat ?? "12h";
  const create = () => {
    if (!title.trim()) return;
    actions.createTask({ title, date: draft.date, start: draft.start, estimate, labelId, position: "top" });
    ui.setDraft(null);
  };
  return (
    <form
      className={styles.body}
      onSubmit={(e) => {
        e.preventDefault();
        create();
      }}
    >
      <div className={styles.titleRow}>
        <input
          data-autofocus
          className={styles.titleInput}
          placeholder="New task"
          aria-label="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <IconButton icon={X} label="Close" onClick={() => ui.setDraft(null)} />
      </div>
      <div className={styles.fields}>
        <Field icon={CalendarBlank} name="Task date">
          <span className={styles.fieldValue}>
            {relativeDay(draft.date, today)}
            {draft.start ? `, ${formatTime(draft.start, format)}` : ""}
          </span>
        </Field>
        <Field icon={Hourglass} name="Estimate">
          <button ref={estimateRef} type="button" className={styles.fieldValue} onClick={() => setPicker("estimate")}>
            {estimate ? formatDuration(estimate) : <Empty />}
          </button>
        </Field>
        <Field icon={Tag} name="Label">
          <button ref={labelRef} type="button" className={styles.fieldValue} onClick={() => setPicker("label")}>
            {label ? (
              <>
                <LabelDot color={label.color} /> {label.name}
              </>
            ) : (
              <Empty />
            )}
          </button>
        </Field>
      </div>
      <div className={styles.footer}>
        <Button onClick={() => ui.setDraft(null)}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={!title.trim()}>
          Add task
        </Button>
      </div>
      <Popover open={picker === "estimate"} onClose={() => setPicker(null)} anchor={estimateRef} label="Estimate">
        <EstimatePicker value={estimate} onChange={(m) => { setEstimate(m); setPicker(null); }} />
      </Popover>
      <Popover open={picker === "label"} onClose={() => setPicker(null)} anchor={labelRef} label="Label">
        <LabelPicker value={labelId} onChange={(l) => { setLabelId(l); setPicker(null); }} />
      </Popover>
    </form>
  );
}

export type { DateKey };

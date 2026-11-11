import { useRef, useState, type CSSProperties } from "react";
import { Check } from "@phosphor-icons/react/dist/ssr/Check";
import { Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { Trash } from "@phosphor-icons/react/dist/ssr/Trash";
import { newId, useStored } from "../hooks";
import { Button, Checkbox, Field, PrintButton, Segmented, Select, TextInput, kit } from "../kit";
import {
  DAY_NAMES,
  DAY_SHORT,
  EMPTY_DRAFT,
  EMPTY_WEEK,
  LABEL_COLORS,
  MAX_BLOCKS,
  MAX_NAME,
  MAX_TITLE,
  addBlock,
  checkDraft,
  dayOrder,
  daysLabel,
  draftOf,
  formatClock,
  hiddenCount,
  layoutDay,
  parseWeek,
  removeBlock,
  setEndHour,
  setStartHour,
  slotCount,
  updateBlock,
  type BlockDraft,
  type DraftProblem,
  type LabelColor,
  type WeekBlock,
  type WeekStart,
} from "../logic/weekly";
import lists from "./lists.module.css";
import { ConfirmButton, paper } from "./paper";
import styles from "./weekly.module.css";

const WEEK_STARTS = [
  { value: "mon", label: "Monday" },
  { value: "sun", label: "Sunday" },
] as const;

const START_HOURS = Array.from({ length: 24 }, (_, hour) => ({ value: String(hour), label: formatClock(hour * 60) }));
const END_HOURS = Array.from({ length: 24 }, (_, i) => ({ value: String(i + 1), label: i + 1 === 24 ? "Midnight" : formatClock((i + 1) * 60) }));

const COLOR_NAMES: Record<LabelColor, string> = { soil: "Soil", tomato: "Tomato", pumpkin: "Pumpkin", corn: "Corn", sprout: "Sprout", rain: "Rain", plum: "Plum", beet: "Beet" };

const PROBLEMS: Record<DraftProblem, string> = {
  name: "Give the block a name.",
  days: "Pick at least one day.",
  time: "Set a start time and an end time.",
  order: "The end has to be later than the start. A block can't run past midnight.",
};

export function WeeklyScheduleMaker() {
  const [week, setWeek] = useStored("weekly-schedule-maker", EMPTY_WEEK, parseWeek);
  const [draft, setDraft] = useState<BlockDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  /** The form's problem shows only once you've tried to save, not while you're still typing. */
  const [tried, setTried] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  const order = dayOrder(week.weekStart);
  // The block may have been deleted in another tab; then the form goes back to adding.
  const editing = editingId === null ? undefined : week.blocks.find((block) => block.id === editingId);
  const checked = checkDraft(draft);
  const full = !editing && week.blocks.length >= MAX_BLOCKS;
  const hidden = hiddenCount(week);
  const hours = Array.from({ length: week.endHour - week.startHour }, (_, i) => week.startHour + i);

  const reset = () => {
    setDraft((current) => ({ ...EMPTY_DRAFT, start: current.start, end: current.end, color: current.color }));
    setEditingId(null);
    setTried(false);
  };

  const save = () => {
    if (!checked.ok || full) return setTried(true);
    if (editing) {
      setWeek((current) => updateBlock(current, editing.id, checked.block));
    } else {
      const id = newId();
      setWeek((current) => addBlock(current, checked.block, id));
    }
    reset();
  };

  const edit = (block: WeekBlock) => {
    setDraft(draftOf(block));
    setEditingId(block.id);
    setTried(false);
    const name = form.current?.querySelector("input");
    name?.focus();
    form.current?.scrollIntoView({ block: "nearest" });
  };

  const toggleDay = (day: number, on: boolean) => setDraft((current) => ({ ...current, days: on ? [...current.days, day] : current.days.filter((other) => other !== day) }));

  let status = "";
  if (full) status = `This schedule is full at ${MAX_BLOCKS} blocks. Delete one to add another.`;
  else if (tried && !checked.ok) status = PROBLEMS[checked.problem];
  else if (editing) status = `Editing ${editing.name}. Save your changes, or delete the block.`;
  else if (hidden > 0) status = `${hidden} ${hidden === 1 ? "block is" : "blocks are"} outside the hours shown. Widen the hours to see ${hidden === 1 ? "it" : "them"}.`;
  else if (week.blocks.length > 0) status = "Click a block in the grid to change or delete it.";
  else status = "Add a block and it appears in the grid on each day you picked.";

  return (
    <div className={`${styles.maker} ${paper.paper}`}>
      <input
        className={`${lists.title} ${week.title ? "" : paper.noPrint}`}
        value={week.title}
        maxLength={MAX_TITLE}
        placeholder="Weekly schedule"
        aria-label="Schedule name"
        onChange={(e) => setWeek((current) => ({ ...current, title: e.target.value.slice(0, MAX_TITLE) }))}
      />

      <form
        ref={form}
        className={`${styles.form} ${paper.noPrint}`}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className={styles.fields}>
          <Field label="Block name" className={styles.name}>
            <TextInput value={draft.name} maxLength={MAX_NAME} placeholder="Biology 101" onValue={(name) => setDraft((current) => ({ ...current, name }))} />
          </Field>
          <fieldset className={styles.group}>
            <legend className={styles.legend}>Days</legend>
            <div className={styles.days}>
              {order.map((day) => (
                <Checkbox key={day} label={DAY_SHORT[day]!} checked={draft.days.includes(day)} onChange={(on) => toggleDay(day, on)} />
              ))}
            </div>
          </fieldset>
          <Field label="Starts">
            <TextInput type="time" className={styles.time} value={draft.start} onValue={(start) => setDraft((current) => ({ ...current, start }))} />
          </Field>
          <Field label="Ends">
            <TextInput type="time" className={styles.time} value={draft.end} onValue={(end) => setDraft((current) => ({ ...current, end }))} />
          </Field>
          <fieldset className={styles.group}>
            <legend className={styles.legend}>Color</legend>
            <div className={styles.colors}>
              {LABEL_COLORS.map((color) => (
                <label key={color} className={`${styles.swatch} ${styles[color]}`}>
                  <input type="radio" name="block-color" value={color} checked={draft.color === color} aria-label={COLOR_NAMES[color]} onChange={() => setDraft((current) => ({ ...current, color }))} />
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div className={styles.actions}>
          <Button type="submit" variant="primary" icon={editing ? Check : Plus} disabled={full}>
            {editing ? "Save block" : "Add block"}
          </Button>
          {editing ? (
            <>
              <Button
                icon={Trash}
                onClick={() => {
                  setWeek((current) => removeBlock(current, editing.id));
                  reset();
                }}
              >
                Delete
              </Button>
              <Button variant="quiet" onClick={reset}>
                Cancel
              </Button>
            </>
          ) : null}
          <p className={styles.status} role="status">
            {status}
          </p>
        </div>
      </form>

      <div className={`${styles.settings} ${paper.noPrint}`}>
        <div className={`${kit.bar} ${kit.barEnd}`}>
          <div className={styles.group}>
            <span className={styles.legend}>Week starts on</span>
            <Segmented label="Week starts on" options={WEEK_STARTS} value={week.weekStart} onChange={(weekStart: WeekStart) => setWeek((current) => ({ ...current, weekStart }))} />
          </div>
          <Field label="From">
            <Select className={styles.hourPick} value={String(week.startHour)} options={START_HOURS} onValue={(hour) => setWeek((current) => setStartHour(current, Number(hour)))} />
          </Field>
          <Field label="To">
            <Select className={styles.hourPick} value={String(week.endHour)} options={END_HOURS} onValue={(hour) => setWeek((current) => setEndHour(current, Number(hour)))} />
          </Field>
        </div>
        <div className={kit.bar}>
          <PrintButton />
          <ConfirmButton
            confirm="Clear it all?"
            disabled={week.blocks.length === 0 && !week.title}
            onConfirm={() => {
              setWeek((current) => ({ ...EMPTY_WEEK, weekStart: current.weekStart, startHour: current.startHour, endHour: current.endHour }));
              reset();
            }}
          >
            Clear
          </ConfirmButton>
        </div>
      </div>

      {/* Focusable, so the grid can be scrolled sideways by keyboard on a narrow screen. */}
      <div className={styles.scroll} role="region" aria-label="Week grid" tabIndex={0}>
        <div className={styles.grid} style={{ "--hours": hours.length, "--slots": slotCount(week) } as CSSProperties}>
          <div className={styles.corner} />
          {order.map((day) => (
            <div key={day} className={styles.dayName}>
              {DAY_NAMES[day]}
            </div>
          ))}
          <div className={styles.gutter} aria-hidden="true">
            {hours.map((hour) => (
              <div key={hour} className={styles.hourLabel}>
                {formatClock(hour * 60)}
              </div>
            ))}
          </div>
          {order.map((day) => (
            <div key={day} className={styles.day}>
              <div className={styles.lines} aria-hidden="true">
                {hours.map((hour) => (
                  <div key={hour} className={styles.hourCell} />
                ))}
              </div>
              <ul className={styles.blocks} aria-label={DAY_NAMES[day]}>
                {layoutDay(week, day).map(({ block, rowStart, rowEnd, lane, lanes }) => (
                  <li key={block.id} className={styles.slot} style={{ "--row-start": rowStart, "--row-end": rowEnd, "--lane": lane, "--lanes": lanes } as CSSProperties}>
                    <button
                      type="button"
                      className={`${styles.block} ${styles[block.color]} ${block.id === editing?.id ? styles.editing : ""}`}
                      onClick={() => edit(block)}
                    >
                      <span className={styles.blockName}>{block.name}</span>{" "}
                      <span className={styles.blockTime}>
                        {formatClock(block.start)} to {formatClock(block.end)}
                      </span>
                      {/* The rest of the button's name, for screen readers: which days, and what pressing it does. */}
                      <span className="visually-hidden">
                        . {daysLabel(block.days, week.weekStart, true)}. Edit
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

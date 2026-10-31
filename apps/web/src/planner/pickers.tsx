"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CaretLeft, CaretRight, Check, Flag, Plus, Tray, X } from "@phosphor-icons/react";
import { labelColors } from "@beans/tokens";
import {
  ESTIMATE_PRESETS,
  addDays,
  addMonths,
  dayOfMonth,
  formatDuration,
  monthName,
  parseDuration,
  startOfMonth,
  startOfWeek,
  weekday,
  type DateKey,
  type Priority,
} from "@beans/core";
import { useActions, useLabels, useLists, useSettings, useToday } from "@/data/hooks";
import { IconButton } from "@/ui/Button";
import { LabelDot, TextInput } from "@/ui/controls";
import { Icon } from "@/ui/Icon";
import { Menu, MenuDivider, MenuHeading, MenuItem } from "@/ui/Menu";
import styles from "./pickers.module.css";

/** Monday or Sunday after today, depending on the week start. */
export function nextWeek(today: DateKey, weekStart: 0 | 1): DateKey {
  return addDays(startOfWeek(today, weekStart), 7);
}

export function DatePicker({
  value,
  onChange,
  allowNone,
  noneLabel = "No date",
  extra,
}: {
  value: DateKey | null;
  onChange: (d: DateKey | null) => void;
  allowNone?: boolean;
  noneLabel?: string;
  extra?: ReactNode;
}) {
  const today = useToday();
  const settings = useSettings();
  const weekStart = settings?.weekStart ?? 0;
  const [month, setMonth] = useState(startOfMonth(value ?? today));
  const gridStart = startOfWeek(month, weekStart);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const weekdayLabels = Array.from({ length: 7 }, (_, i) => ["S", "M", "T", "W", "T", "F", "S"][(i + weekStart) % 7]);
  return (
    <div className={styles.datePicker}>
      <Menu label="Quick dates">
        <MenuItem onSelect={() => onChange(today)} checked={value === today}>
          Today
        </MenuItem>
        <MenuItem onSelect={() => onChange(addDays(today, 1))} checked={value === addDays(today, 1)}>
          Tomorrow
        </MenuItem>
        <MenuItem onSelect={() => onChange(nextWeek(today, weekStart))} checked={value === nextWeek(today, weekStart)}>
          Next week
        </MenuItem>
        {allowNone ? (
          <MenuItem icon={X} onSelect={() => onChange(null)}>
            {noneLabel}
          </MenuItem>
        ) : null}
        {extra}
      </Menu>
      <div className={styles.calendar}>
        <div className={styles.calHead}>
          <IconButton icon={CaretLeft} iconSize="sm" label="Previous month" onClick={() => setMonth(addMonths(month, -1))} />
          <span>
            {monthName(month, true)} {month.slice(0, 4)}
          </span>
          <IconButton icon={CaretRight} iconSize="sm" label="Next month" onClick={() => setMonth(addMonths(month, 1))} />
        </div>
        <div className={styles.calGrid} role="grid">
          {weekdayLabels.map((d, i) => (
            <span key={i} className={styles.calWeekday}>
              {d}
            </span>
          ))}
          {days.map((d) => (
            <button
              key={d}
              type="button"
              className={[
                styles.calDay,
                d.slice(0, 7) !== month.slice(0, 7) ? styles.calOutside : "",
                d === today ? styles.calToday : "",
                d === value ? styles.calSelected : "",
              ].join(" ")}
              aria-label={d}
              aria-pressed={d === value}
              onClick={() => onChange(d)}
            >
              {dayOfMonth(d)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EstimatePicker({ value, onChange, title = "Estimate" }: { value: number | null; onChange: (m: number | null) => void; title?: string }) {
  const [text, setText] = useState("");
  const parsed = parseDuration(text);
  return (
    <div className={styles.estimate}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (parsed !== null) onChange(parsed);
        }}
      >
        <TextInput
          data-autofocus
          placeholder="Type 45m or 1h 30m"
          value={text}
          aria-label={title}
          onChange={(e) => setText(e.target.value)}
        />
        {text && parsed === null ? <p className={styles.hint}>Try 25m, 1h or 1:30</p> : null}
        {parsed !== null ? <p className={styles.hint}>Press Enter for {formatDuration(parsed)}</p> : null}
      </form>
      <Menu label={title}>
        {ESTIMATE_PRESETS.map((m) => (
          <MenuItem key={m} onSelect={() => onChange(m)} checked={value === m}>
            {formatDuration(m)}
          </MenuItem>
        ))}
        {value !== null ? (
          <>
            <MenuDivider />
            <MenuItem icon={X} onSelect={() => onChange(null)}>
              Clear
            </MenuItem>
          </>
        ) : null}
      </Menu>
    </div>
  );
}

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export function PriorityFlag({ priority }: { priority: Priority | null }) {
  return (
    <span className={`${styles.flag} ${priority ? styles[`flag-${priority}`] : ""}`}>
      <Icon icon={Flag} />
    </span>
  );
}

export function PriorityPicker({ value, onChange }: { value: Priority | null; onChange: (p: Priority | null) => void }) {
  return (
    <Menu label="Priority">
      {PRIORITIES.map((p) => (
        <MenuItem key={p.value} onSelect={() => onChange(p.value)} checked={value === p.value} trailing={<PriorityFlag priority={p.value} />}>
          {p.label}
        </MenuItem>
      ))}
      <MenuItem onSelect={() => onChange(null)} checked={value === null}>
        None
      </MenuItem>
    </Menu>
  );
}

export function LabelPicker({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const labels = useLabels();
  const actions = useActions();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState<string | null>(null);
  const q = query.trim().toLowerCase();
  const shown = useMemo(() => labels.filter((l) => l.name.toLowerCase().includes(q)), [labels, q]);
  const exact = labels.some((l) => l.name.toLowerCase() === q);
  if (creating !== null) {
    return <NewLabelColors name={creating} onCancel={() => setCreating(null)} onCreate={(color) => {
      const { id } = actions.createLabel({ name: creating, color });
      onChange(id);
    }} />;
  }
  return (
    <div className={styles.labelPicker}>
      <TextInput
        data-autofocus
        placeholder="Find or create a label"
        value={query}
        aria-label="Find or create a label"
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (shown[0] && (exact || shown.length === 1)) onChange(shown[0].id);
            else if (q) setCreating(query.trim());
          }
        }}
      />
      <Menu label="Labels">
        {shown.map((l) => (
          <MenuItem key={l.id} onSelect={() => onChange(l.id)} checked={value === l.id} trailing={value === l.id ? <Icon icon={Check} /> : null}>
            <span className={styles.labelRow}>
              <LabelDot color={l.color} /> {l.name}
            </span>
          </MenuItem>
        ))}
        {q && !exact ? (
          <MenuItem icon={Plus} onSelect={() => setCreating(query.trim())}>
            Create “{query.trim()}”
          </MenuItem>
        ) : null}
        {!labels.length && !q ? <p className={styles.hint}>Type a name to make your first label.</p> : null}
        {value ? (
          <>
            <MenuDivider />
            <MenuItem icon={X} onSelect={() => onChange(null)}>
              Remove label
            </MenuItem>
          </>
        ) : null}
      </Menu>
    </div>
  );
}

export function ColorSwatches({ value, onChange }: { value: string | null; onChange: (c: string) => void }) {
  return (
    <div className={styles.swatches} role="radiogroup" aria-label="Color">
      {labelColors.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          title={c}
          className={`${styles.swatch} ${value === c ? styles.swatchOn : ""}`}
          style={{ background: `var(--label-${c})` }}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  );
}

function NewLabelColors({ name, onCreate, onCancel }: { name: string; onCreate: (color: string) => void; onCancel: () => void }) {
  return (
    <div className={styles.labelPicker}>
      <MenuHeading>Pick a color for “{name}”</MenuHeading>
      <ColorSwatches value={null} onChange={onCreate} />
      <MenuItem icon={X} onSelect={onCancel}>
        Back
      </MenuItem>
    </div>
  );
}

/** Picker for moving a task into the Brain Dump or a list. */
export function ListPicker({ onChange }: { onChange: (listId: string | null) => void }) {
  const lists = useLists();
  return (
    <Menu label="Move to a list">
      <MenuHeading>Move to a list</MenuHeading>
      <MenuItem icon={Tray} onSelect={() => onChange(null)}>
        Brain Dump
      </MenuItem>
      {lists.map((l) => (
        <MenuItem key={l.id} onSelect={() => onChange(l.id)}>
          {l.icon} {l.name}
        </MenuItem>
      ))}
    </Menu>
  );
}

export function weekdayShort(d: DateKey) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][weekday(d)];
}

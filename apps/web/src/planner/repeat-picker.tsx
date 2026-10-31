"use client";

import { useState } from "react";
import { ArrowsClockwise, Check, PencilSimple, StopCircle } from "@phosphor-icons/react";
import {
  describeRule,
  formatRule,
  parseRule,
  repeatPresets,
  weekday,
  type DateKey,
  type RepeatFrequency,
} from "@beans/core";
import { Button } from "@/ui/Button";
import { TextInput, Toggle } from "@/ui/controls";
import { Menu, MenuDivider, MenuHeading, MenuItem } from "@/ui/Menu";
import { DatePicker } from "./pickers";
import styles from "./repeat.module.css";

/** Repeat choices for a task that doesn't repeat yet, or the rule editor. */
export function RepeatPicker({
  date,
  current,
  onPick,
  onStop,
  onUpdateAll,
  hasTime,
  atTime,
  onAtTime,
}: {
  date: DateKey;
  current: string | null;
  onPick: (rule: string) => void;
  onStop?: () => void;
  onUpdateAll?: () => void;
  hasTime: boolean;
  atTime: boolean;
  onAtTime: (v: boolean) => void;
}) {
  const [custom, setCustom] = useState(false);
  if (custom) return <CustomRule date={date} initial={current} onDone={onPick} onCancel={() => setCustom(false)} />;
  return (
    <div className={styles.picker}>
      {current ? (
        <Menu label="Repeating task">
          <MenuHeading>{describeRule(current)}</MenuHeading>
          {onUpdateAll ? (
            <MenuItem icon={ArrowsClockwise} onSelect={onUpdateAll}>
              Make every unfinished repeat match this one
            </MenuItem>
          ) : null}
          {onStop ? (
            <MenuItem icon={StopCircle} onSelect={onStop}>
              Stop repeating
            </MenuItem>
          ) : null}
          <MenuDivider />
          <MenuHeading>Change to</MenuHeading>
        </Menu>
      ) : null}
      <Menu label="Repeat options">
        {repeatPresets(date).map((p) => (
          <MenuItem key={p.id} onSelect={() => onPick(p.rule)} checked={current === p.rule} trailing={current === p.rule ? <Check /> : null}>
            {p.label}
          </MenuItem>
        ))}
        <MenuItem icon={PencilSimple} onSelect={() => setCustom(true)}>
          Custom…
        </MenuItem>
      </Menu>
      {hasTime ? (
        <label className={styles.atTime}>
          <span>Repeat at this time and timebox it</span>
          <Toggle label="Repeat at a set time" checked={atTime} onChange={onAtTime} />
        </label>
      ) : null}
    </div>
  );
}

const FREQS: { value: RepeatFrequency; one: string; many: string }[] = [
  { value: "DAILY", one: "day", many: "days" },
  { value: "WEEKLY", one: "week", many: "weeks" },
  { value: "MONTHLY", one: "month", many: "months" },
  { value: "YEARLY", one: "year", many: "years" },
];

function CustomRule({ date, initial, onDone, onCancel }: { date: DateKey; initial: string | null; onDone: (rule: string) => void; onCancel: () => void }) {
  const start = initial ? parseRule(initial) : null;
  const [freq, setFreq] = useState<RepeatFrequency>(start?.freq ?? "WEEKLY");
  const [interval, setInterval] = useState(start?.interval ?? 1);
  const [days, setDays] = useState<number[]>(start?.byDay.length ? start.byDay : [weekday(date)]);
  const [end, setEnd] = useState<"never" | "on" | "after">(start?.until ? "on" : start?.count ? "after" : "never");
  const [until, setUntil] = useState<DateKey | null>(start?.until ?? null);
  const [count, setCount] = useState(start?.count ?? 10);
  const [pickUntil, setPickUntil] = useState(false);
  const rule = formatRule({
    freq,
    interval: Math.max(1, interval),
    byDay: freq === "WEEKLY" ? days : [],
    byMonthDay: freq === "MONTHLY" || freq === "YEARLY" ? Number(date.slice(8, 10)) : null,
    byMonth: freq === "YEARLY" ? Number(date.slice(5, 7)) : null,
    until: end === "on" ? until : null,
    count: end === "after" ? count : null,
  });
  return (
    <form
      className={styles.custom}
      onSubmit={(e) => {
        e.preventDefault();
        onDone(rule);
      }}
    >
      <MenuHeading>Custom repeat</MenuHeading>
      <div className={styles.row}>
        <span>Every</span>
        <TextInput
          type="number"
          min={1}
          max={99}
          className={styles.number}
          aria-label="Interval"
          value={interval}
          onChange={(e) => setInterval(Number(e.target.value) || 1)}
        />
        <select className={styles.select} aria-label="Frequency" value={freq} onChange={(e) => setFreq(e.target.value as RepeatFrequency)}>
          {FREQS.map((f) => (
            <option key={f.value} value={f.value}>
              {interval > 1 ? f.many : f.one}
            </option>
          ))}
        </select>
      </div>
      {freq === "WEEKLY" ? (
        <div className={styles.days} role="group" aria-label="On these days">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={days.includes(i)}
              aria-label={["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][i]}
              className={`${styles.day} ${days.includes(i) ? styles.dayOn : ""}`}
              onClick={() => setDays(days.includes(i) ? (days.length > 1 ? days.filter((x) => x !== i) : days) : [...days, i])}
            >
              {d}
            </button>
          ))}
        </div>
      ) : null}
      <div className={styles.ends} role="radiogroup" aria-label="Ends">
        <span className={styles.endsLabel}>Ends</span>
        <label>
          <input type="radio" name="end" checked={end === "never"} onChange={() => setEnd("never")} /> Never
        </label>
        <label>
          <input type="radio" name="end" checked={end === "on"} onChange={() => setEnd("on")} /> On
          <Button size="sm" disabled={end !== "on"} onClick={() => setPickUntil((v) => !v)}>
            {until ?? "Pick a day"}
          </Button>
        </label>
        {pickUntil && end === "on" ? (
          <DatePicker
            value={until}
            onChange={(d) => {
              setUntil(d);
              setPickUntil(false);
            }}
          />
        ) : null}
        <label>
          <input type="radio" name="end" checked={end === "after"} onChange={() => setEnd("after")} /> After
          <TextInput
            type="number"
            min={1}
            className={styles.number}
            aria-label="Number of times"
            disabled={end !== "after"}
            value={count}
            onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
          />
          times
        </label>
      </div>
      <p className={styles.summary}>{describeRule(rule)}</p>
      <div className={styles.actions}>
        <Button onClick={onCancel}>Back</Button>
        <Button type="submit" variant="primary" disabled={end === "on" && !until}>
          Repeat
        </Button>
      </div>
    </form>
  );
}

import { useState, type ReactNode } from "react";
import { diffDays, localTimeZone, todayIn } from "@beans/core/dates";
import { useNow, useStored } from "../hooks";
import { Checkbox, Field, NumberInput, Readout, Segmented, Select, TextInput, kit } from "../kit";
import {
  DEFAULT_DATE_CALC,
  MAX_AMOUNT,
  daysBetween,
  daysUntil,
  formatCount,
  formatLongDate,
  isDateKey,
  joinParts,
  parseDateCalc,
  plural,
  shiftDate,
  type DateCalcState,
  type Mode,
  type Unit,
} from "../logic/datecalc";
import styles from "./datecalc.module.css";

const MODES: readonly { value: Mode; label: string }[] = [
  { value: "between", label: "Days between" },
  { value: "add", label: "Add or subtract" },
  { value: "until", label: "Days until" },
];

const DIRECTIONS = [
  { value: "add", label: "Add" },
  { value: "subtract", label: "Subtract" },
] as const;

const UNIT_OPTIONS: readonly { value: Unit; label: string }[] = [
  { value: "days", label: "days" },
  { value: "weekdays", label: "weekdays (Monday to Friday)" },
  { value: "weeks", label: "weeks" },
  { value: "months", label: "months" },
];

const UNIT_WORD: Record<Unit, string> = { days: "day", weekdays: "weekday", weeks: "week", months: "month" };

/** Holds a line's place before there is an answer, so the box keeps its size. */
const BLANK = " ";

/**
 * A date field that reports only whole, real dates (or "" when emptied).
 * What's being typed is kept here, so a half-typed year doesn't fight the keyboard.
 */
function DateField({ label, hint, value, onValue }: { label: string; hint?: string; value: string; onValue: (value: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Field label={label} hint={hint} className={styles.date}>
      <TextInput
        type="date"
        min="1600-01-01"
        max="9999-12-31"
        value={draft ?? value}
        onValue={(raw) => {
          setDraft(raw);
          if (raw === "" || isDateKey(raw)) onValue(raw);
        }}
        onBlur={() => setDraft(null)}
      />
    </Field>
  );
}

type Line = { label: string; value: string };

/** The answer on its soil line, with the same sum said other ways under it. */
function Result({ label, value, note, lines }: { label: string; value: ReactNode; note?: string; lines: Line[] }) {
  return (
    <div className={styles.result}>
      <Readout small label={label} value={value} note={note ?? BLANK} className={styles.readout} />
      <dl className={styles.lines}>
        {lines.map((line) => (
          <div key={line.label} className={styles.line}>
            <dt>{line.label}</dt>
            <dd>{line.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function DateCalculator() {
  const [state, setState] = useStored("date-calculator", DEFAULT_DATE_CALC, parseDateCalc);
  // Today comes from the visitor's clock, so it's unknown until the page has mounted.
  const now = useNow(true, 60_000);
  const today = now === null ? null : todayIn(localTimeZone(), now);
  const set = (change: Partial<DateCalcState>) => setState((current) => ({ ...current, ...change }));

  let panel: ReactNode;

  if (state.mode === "between") {
    const from = state.from || today || "";
    const span = daysBetween(from, state.to, state.includeEnd);
    panel = (
      <>
        <div className={styles.controls}>
          <DateField label="From" value={from} onValue={(next) => set({ from: next })} />
          <DateField label="To" value={state.to} onValue={(to) => set({ to })} />
          <Checkbox label="Count the end date too" checked={state.includeEnd} onChange={(includeEnd) => set({ includeEnd })} />
        </div>
        <Result
          label={span ? `From ${formatLongDate(span.from)} to ${formatLongDate(span.to)}` : "Days between the two dates"}
          value={span ? plural(span.days, "day") : <span className={styles.waiting}>Pick both dates</span>}
          note={span ? (state.includeEnd ? "Counting the first day and the last." : "Counting the first day but not the last.") : undefined}
          lines={[
            { label: "Weeks and days", value: span ? joinParts([plural(span.weeks.weeks, "week"), plural(span.weeks.days, "day")]) : BLANK },
            { label: "Months and days", value: span ? joinParts([plural(span.months.months, "month"), plural(span.months.days, "day")]) : BLANK },
            {
              label: "Years, months and days",
              value: !span ? BLANK : span.years.years === 0 ? "Under 1 year" : joinParts([plural(span.years.years, "year"), plural(span.years.months, "month"), plural(span.years.days, "day")]),
            },
            { label: "Weekdays, Monday to Friday", value: span ? formatCount(span.weekdays) : BLANK },
          ]}
        />
      </>
    );
  } else if (state.mode === "add") {
    const start = state.start || today || "";
    const signed = state.direction === "subtract" ? -state.amount : state.amount;
    const result = shiftDate(start, signed, state.unit);
    const outOfRange = isDateKey(start) && result === null;
    panel = (
      <>
        <div className={styles.controls}>
          <DateField label="Start date" value={start} onValue={(next) => set({ start: next })} />
          <Segmented label="Add or subtract" options={DIRECTIONS} value={state.direction} onChange={(direction) => set({ direction })} />
          <Field label="How many">
            <NumberInput value={state.amount} min={0} max={MAX_AMOUNT} step="1" inputMode="numeric" onValue={(amount) => set({ amount: Math.round(amount) })} />
          </Field>
          <Field label="Of what">
            <Select value={state.unit} onValue={(unit) => set({ unit })} options={UNIT_OPTIONS} />
          </Field>
        </div>
        <Result
          label={
            isDateKey(start)
              ? `${plural(state.amount, UNIT_WORD[state.unit])} ${state.direction === "add" ? "after" : "before"} ${formatLongDate(start)}`
              : "The date you land on"
          }
          value={result ? formatLongDate(result) : <span className={styles.waiting}>{outOfRange ? "Outside the years 1600 to 9999" : "Pick a start date"}</span>}
          note={state.unit === "weekdays" ? "Saturdays and Sundays are skipped. Public holidays are not." : undefined}
          lines={[
            { label: "Calendar days from the start", value: result ? formatCount(Math.abs(diffDays(result, start))) : BLANK },
            { label: "Written as year, month, day", value: result ?? BLANK },
          ]}
        />
      </>
    );
  } else {
    const until = today ? daysUntil(today, state.target) : null;
    const size = until ? Math.abs(until.days) : 0;
    let value: ReactNode = <span className={styles.waiting}>{state.target ? BLANK : "Pick a date"}</span>;
    if (until) value = until.days === 0 ? "Today" : until.days > 0 ? plural(size, "day") : `${plural(size, "day")} ago`;
    panel = (
      <>
        <div className={styles.controls}>
          <DateField label="Date" value={state.target} onValue={(target) => set({ target })} />
        </div>
        <Result
          label={until ? `${until.days < 0 ? "Since" : "Until"} ${formatLongDate(state.target)}` : "Days until the date"}
          value={value}
          note={today ? `Counted from today, ${formatLongDate(today)}.` : undefined}
          lines={[
            { label: "Weeks and days", value: until ? joinParts([plural(until.weeks.weeks, "week"), plural(until.weeks.days, "day")]) : BLANK },
            { label: until && until.days < 0 ? "Weekdays since then, Monday to Friday" : "Weekdays left, Monday to Friday", value: until ? formatCount(until.weekdays) : BLANK },
          ]}
        />
      </>
    );
  }

  return (
    <div className={kit.stack}>
      <Segmented label="What to work out" options={MODES} value={state.mode} onChange={(mode) => set({ mode })} className={styles.modes} />
      {panel}
    </div>
  );
}

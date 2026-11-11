import type { FocusEvent } from "react";
import { Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { X } from "@phosphor-icons/react/dist/ssr/X";
import { newId, useStored } from "../hooks";
import { Button, Field, IconButton, Readout, Segmented, Select, TextInput, kit } from "../kit";
import { MINUS, clock12, clock24, decimalHours, decimalMinutes, digitsOnly, fixed, formatHms, spanWords, trimmed } from "../logic/hms";
import {
  FIELD_DIGITS,
  INITIAL_TIME_CALC,
  MAX_ROWS,
  addRow,
  clearRows,
  countFilled,
  dayOffsetText,
  parseTimeCalc,
  removeRow,
  rowSeconds,
  shiftClock,
  totalSeconds,
  updateRow,
  type ClockShift,
  type Sign,
  type TimeCalc,
  type TimeCalcMode,
  type TimeRow,
} from "../logic/time-calculator";
import styles from "./time-math.module.css";

const MODES: readonly { value: TimeCalcMode; label: string }[] = [
  { value: "lengths", label: "Add up time" },
  { value: "clock", label: "Add to a clock time" },
];

const SIGNS: readonly { value: Sign; label: string }[] = [
  { value: "add", label: "+" },
  { value: "subtract", label: MINUS },
];

const SIGN_WORDS: readonly { value: Sign; label: string }[] = [
  { value: "add", label: "Add" },
  { value: "subtract", label: "Subtract" },
];

const digits = (text: string) => digitsOnly(text, FIELD_DIGITS);
const selectAll = (event: FocusEvent<HTMLInputElement>) => event.currentTarget.select();

type SetCalc = (next: (previous: TimeCalc) => TimeCalc) => void;

/** Lengths of time, each added or taken away, and what they come to. */
function Lengths({ rows, setCalc }: { rows: TimeRow[]; setCalc: SetCalc }) {
  const total = totalSeconds(rows);
  const filled = countFilled(rows);
  const patch = (id: string, change: Partial<Omit<TimeRow, "id">>) => setCalc((calc) => updateRow(calc, id, change));

  let note = "Type hours, minutes or seconds in any row.";
  if (total < 0) note = `A negative total. You subtracted ${spanWords(total)} more than you added.`;
  else if (filled > 0) note = `That's ${spanWords(total)}.`;

  return (
    <>
      <div className={styles.sheet}>
        <div>
          <div className={styles.rowHead} aria-hidden="true">
            <span />
            <span>Hours</span>
            <span>Minutes</span>
            <span>Seconds</span>
            <span />
          </div>
          <ul className={styles.rows}>
            {rows.map((row, i) => (
              <li key={row.id} className={styles.row}>
                <Select className={styles.cell} aria-label={`Row ${i + 1}: add or subtract`} value={row.sign} options={SIGNS} onValue={(sign) => patch(row.id, { sign })} />
                <TextInput className={styles.cell} inputMode="numeric" placeholder="0" aria-label={`Row ${i + 1} hours`} value={row.hours} onValue={(hours) => patch(row.id, { hours: digits(hours) })} onFocus={selectAll} />
                <TextInput className={styles.cell} inputMode="numeric" placeholder="0" aria-label={`Row ${i + 1} minutes`} value={row.minutes} onValue={(minutes) => patch(row.id, { minutes: digits(minutes) })} onFocus={selectAll} />
                <TextInput className={styles.cell} inputMode="numeric" placeholder="0" aria-label={`Row ${i + 1} seconds`} value={row.seconds} onValue={(seconds) => patch(row.id, { seconds: digits(seconds) })} onFocus={selectAll} />
                <IconButton
                  icon={X}
                  iconSize="sm"
                  label={`Remove row ${i + 1}`}
                  disabled={rows.length === 1 && rowSeconds(row) === 0}
                  onClick={() => setCalc((calc) => removeRow(calc, row.id))}
                />
              </li>
            ))}
          </ul>
        </div>
        <div className={kit.bar}>
          <Button
            icon={Plus}
            disabled={rows.length >= MAX_ROWS}
            onClick={() => {
              const id = newId();
              setCalc((calc) => addRow(calc, id));
            }}
          >
            Add a row
          </Button>
          <Button variant="quiet" disabled={filled === 0 && rows.length <= 2} onClick={() => setCalc(clearRows)}>
            Clear
          </Button>
        </div>
      </div>

      <Readout className={styles.answer} label="Total (hours:minutes:seconds)" value={formatHms(total)} note={note} />
      <div className={styles.pair}>
        <Readout small label="Decimal hours" value={fixed(decimalHours(total))} />
        <Readout small label="Total minutes" value={trimmed(decimalMinutes(total))} />
      </div>
    </>
  );
}

/** A clock time moved forwards or back by a length. */
function Clock({ clock, setCalc }: { clock: ClockShift; setCalc: SetCalc }) {
  const patch = (change: Partial<ClockShift>) => setCalc((calc) => ({ ...calc, clock: { ...calc.clock, ...change } }));
  const result = shiftClock(clock);

  return (
    <>
      <div className={`${kit.bar} ${kit.barEnd}`}>
        <Field label="Start time">
          <TextInput type="time" className={styles.time} value={clock.time} onValue={(time) => patch({ time })} />
        </Field>
        <Field label="Add or subtract">
          <Select value={clock.sign} options={SIGN_WORDS} onValue={(sign) => patch({ sign })} />
        </Field>
        <Field label="Hours">
          <TextInput narrow inputMode="numeric" placeholder="0" value={clock.hours} onValue={(hours) => patch({ hours: digits(hours) })} onFocus={selectAll} />
        </Field>
        <Field label="Minutes">
          <TextInput narrow inputMode="numeric" placeholder="0" value={clock.minutes} onValue={(minutes) => patch({ minutes: digits(minutes) })} onFocus={selectAll} />
        </Field>
      </div>

      <Readout
        className={styles.answer}
        label="The time will be"
        value={
          result ? (
            <>
              {clock12(result.minutes)}
              {result.dayOffset !== 0 ? <span className={styles.dayTag}>{dayOffsetText(result.dayOffset)}</span> : null}
            </>
          ) : (
            "--:--"
          )
        }
        note={result ? `${clock24(result.minutes)} on a 24-hour clock, ${dayOffsetText(result.dayOffset)}.` : "Pick a start time to see the answer."}
      />
    </>
  );
}

export function TimeCalculator() {
  const [calc, setCalc] = useStored("time-calculator", INITIAL_TIME_CALC, parseTimeCalc);

  return (
    <div className={kit.stack}>
      <Segmented className={styles.modes} label="What to work out" options={MODES} value={calc.mode} onChange={(mode) => setCalc((current) => ({ ...current, mode }))} />
      {calc.mode === "lengths" ? <Lengths rows={calc.rows} setCalc={setCalc} /> : <Clock clock={calc.clock} setCalc={setCalc} />}
    </div>
  );
}

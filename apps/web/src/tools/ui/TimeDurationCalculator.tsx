import type { FocusEvent } from "react";
import { ArrowsDownUp } from "@phosphor-icons/react/dist/ssr/ArrowsDownUp";
import { localTimeZone, todayIn } from "@beans/core/dates";
import { useNow, useStored } from "../hooks";
import { Button, Field, Readout, Segmented, TextInput, kit } from "../kit";
import { decimalHours, digitsOnly, fixed, plural, spanWords, trimmed } from "../logic/hms";
import { BREAK_DIGITS, INITIAL_DURATION, betweenDates, betweenTimes, parseDurationState, rangeLabel, resolveDate, swapDates, type DurationMode, type DurationState } from "../logic/time-duration";
import styles from "./time-math.module.css";

const MODES: readonly { value: DurationMode; label: string }[] = [
  { value: "times", label: "Between two times" },
  { value: "dates", label: "Between two dates" },
];

const selectAll = (event: FocusEvent<HTMLInputElement>) => event.currentTarget.select();

type Patch = (change: Partial<DurationState>) => void;

/** Shown where an answer goes while a field is still blank. */
const NO_ANSWER = "--";

/** The same span in two other units. */
function OtherUnits({ minutes, hoursLabel }: { minutes: number | null; hoursLabel: string }) {
  return (
    <div className={styles.pair}>
      <Readout small label={hoursLabel} value={minutes === null ? NO_ANSWER : fixed(decimalHours(minutes * 60))} />
      <Readout small label="Total minutes" value={minutes === null ? NO_ANSWER : trimmed(minutes)} />
    </div>
  );
}

/** Two clock times, a day apart at most. */
function Times({ state, patch }: { state: DurationState; patch: Patch }) {
  const span = betweenTimes(state.start, state.end, state.breakMinutes);

  let note = "Pick a start and an end time to see the answer.";
  if (span) {
    const day = span.overnight ? "The end is earlier than the start, so it's counted as the next day." : span.grossMinutes === 0 ? "Start and end are the same time." : "Both times are on the same day.";
    const rest = span.breakTooLong ? " The break is longer than the time between, so nothing is left." : span.breakMinutes > 0 ? ` ${plural(span.breakMinutes, "minute")} of break taken off.` : "";
    note = day + rest;
  }

  return (
    <>
      <div className={`${kit.bar} ${kit.barEnd}`}>
        <Field label="Start time">
          <TextInput type="time" className={styles.time} value={state.start} onValue={(start) => patch({ start })} />
        </Field>
        <Field label="End time">
          <TextInput type="time" className={styles.time} value={state.end} onValue={(end) => patch({ end })} />
        </Field>
        <Field label="Unpaid break (minutes)">
          <TextInput className={styles.time} inputMode="numeric" placeholder="0" value={state.breakMinutes} onValue={(breakMinutes) => patch({ breakMinutes: digitsOnly(breakMinutes, BREAK_DIGITS) })} onFocus={selectAll} />
        </Field>
      </div>

      <Readout className={styles.answer} label="Time between" value={span ? spanWords(span.minutes * 60) : NO_ANSWER} note={note} />
      <OtherUnits minutes={span ? span.minutes : null} hoursLabel="Decimal hours" />
    </>
  );
}

/** Two dates with times, any distance apart. */
function Dates({ state, patch, today }: { state: DurationState; patch: Patch; today: string | null }) {
  // A date that hasn't been picked is today, which only the visitor's browser knows. Blank until then.
  const startDate = resolveDate(state.startDate, today);
  const endDate = resolveDate(state.endDate, today);
  const span = betweenDates(startDate, state.startTime, endDate, state.endTime);

  let note = "Pick both dates and times to see the answer.";
  if (span) note = span.backwards ? "The end is before the start. This is the time between them, counted back." : rangeLabel(startDate, state.startTime, endDate, state.endTime);

  return (
    <>
      <div className={kit.stackTight}>
        <div className={`${kit.bar} ${kit.barEnd}`}>
          <Field label="Start date">
            <TextInput type="date" className={styles.date} value={startDate} onValue={(next) => patch({ startDate: next })} />
          </Field>
          <Field label="Start time">
            <TextInput type="time" className={styles.time} value={state.startTime} onValue={(startTime) => patch({ startTime })} />
          </Field>
        </div>
        <div className={`${kit.bar} ${kit.barEnd}`}>
          <Field label="End date">
            <TextInput type="date" className={styles.date} value={endDate} onValue={(next) => patch({ endDate: next })} />
          </Field>
          <Field label="End time">
            <TextInput type="time" className={styles.time} value={state.endTime} onValue={(endTime) => patch({ endTime })} />
          </Field>
          <Button variant="quiet" icon={ArrowsDownUp} onClick={() => patch(swapDates(state))}>
            Swap
          </Button>
        </div>
      </div>

      <Readout className={styles.answer} label="Time between" value={span ? spanWords(span.minutes * 60, { days: true }) : NO_ANSWER} note={note} />
      <OtherUnits minutes={span ? span.minutes : null} hoursLabel="Total hours" />
    </>
  );
}

export function TimeDurationCalculator() {
  const [state, setState] = useStored("time-duration-calculator", INITIAL_DURATION, parseDurationState);
  // Null on the server and until the page has mounted, so the first render is the same in both places.
  const now = useNow(true, 60_000);
  const today = now === null ? null : todayIn(localTimeZone(), now);
  const patch: Patch = (change) => setState((current) => ({ ...current, ...change }));

  return (
    <div className={kit.stack}>
      <Segmented className={styles.modes} label="What to measure" options={MODES} value={state.mode} onChange={(mode) => patch({ mode })} />
      {state.mode === "times" ? <Times state={state} patch={patch} /> : <Dates state={state} patch={patch} today={today} />}
    </div>
  );
}

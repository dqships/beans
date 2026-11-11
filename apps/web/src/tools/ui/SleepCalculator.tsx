import { useState } from "react";
import { localTimeZone, minutesNowIn } from "@beans/core/dates";
import { BeanMark } from "@/ui/garden";
import { useNow, useStored } from "../hooks";
import { Field, NumberInput, Segmented, TextInput, kit } from "../kit";
import {
  CYCLE_COUNTS,
  CYCLE_MINUTES,
  DEFAULT_SLEEP,
  MAX_FALL_ASLEEP,
  bedtimesFor,
  formatSleepHours,
  formatSleepTime,
  parseSleepSettings,
  parseTime,
  wakeTimesFor,
  type SleepMode,
  type SleepOption,
  type SleepSettings,
} from "../logic/sleep";
import styles from "./sleep.module.css";

const MODES: readonly { value: SleepMode; label: string }[] = [
  { value: "wake", label: "I need to wake up at" },
  { value: "bed", label: "I'm going to bed at" },
  { value: "now", label: "If I go to sleep now" },
];

const FORMATS = [
  { value: "12h", label: "12-hour" },
  { value: "24h", label: "24-hour" },
] as const;

/** Holds a time's place before there is one, so the rows keep their size. */
const BLANK = " ";

/** A time field that reports only whole times, and keeps what's being typed to itself. */
function TimeField({ label, value, onValue }: { label: string; value: string; onValue: (value: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Field label={label} className={styles.timeField}>
      <TextInput
        type="time"
        value={draft ?? value}
        onValue={(raw) => {
          setDraft(raw);
          if (raw === "" || parseTime(raw) !== null) onValue(raw);
        }}
        onBlur={() => setDraft(null)}
      />
    </Field>
  );
}

const dayNote = (shift: number) => (shift < 0 ? "the evening before" : shift > 0 ? "the next day" : BLANK);

export function SleepCalculator() {
  const [settings, setSettings] = useStored("sleep-calculator", DEFAULT_SLEEP, parseSleepSettings);
  const { mode, format, fallAsleep } = settings;
  // The clock is only read for "now", and only once the page has mounted.
  const now = useNow(mode === "now", 30_000);
  const nowMinutes = mode === "now" && now !== null ? minutesNowIn(localTimeZone(), now) : null;
  const set = (change: Partial<SleepSettings>) => setSettings((current) => ({ ...current, ...change }));

  const base = mode === "wake" ? parseTime(settings.wake) : mode === "bed" ? parseTime(settings.bed) : nowMinutes;
  let options: SleepOption[] | null = null;
  if (base !== null) options = mode === "wake" ? bedtimesFor(base, fallAsleep) : wakeTimesFor(base, fallAsleep);

  const baseText = base === null ? "" : formatSleepTime(base, format);
  let lead: string;
  if (mode === "wake") lead = base === null ? "Pick the time you need to wake up." : `To wake at ${baseText}, get into bed at one of these times.`;
  else if (mode === "bed") lead = base === null ? "Pick the time you'll get into bed." : `Get into bed at ${baseText} and set an alarm for one of these times.`;
  else lead = base === null ? "Checking the time." : `Get into bed now, at ${baseText}, and set an alarm for one of these times.`;

  return (
    <div className={kit.stack}>
      <Segmented label="What you know" options={MODES} value={mode} onChange={(next) => set({ mode: next })} className={styles.modes} />

      <div className={styles.controls}>
        {mode === "wake" ? <TimeField label="Wake-up time" value={settings.wake} onValue={(wake) => set({ wake })} /> : null}
        {mode === "bed" ? <TimeField label="Bedtime" value={settings.bed} onValue={(bed) => set({ bed })} /> : null}
        {mode === "now" ? (
          <Field label="The time now" className={styles.timeField}>
            <TextInput value={baseText} onValue={() => {}} readOnly />
          </Field>
        ) : null}
        <Field label="Minutes to fall asleep">
          <NumberInput value={fallAsleep} min={0} max={MAX_FALL_ASLEEP} step="1" inputMode="numeric" onValue={(minutes) => set({ fallAsleep: Math.round(minutes) })} />
        </Field>
        <Segmented label="Clock" options={FORMATS} value={format} onChange={(next) => set({ format: next })} className={styles.format} />
      </div>

      <div className={kit.stackTight}>
        <p className={styles.lead}>{lead}</p>
        <ol className={styles.options}>
          {CYCLE_COUNTS.map((cycles, i) => {
            const option = options?.[i] ?? null;
            const asleep = cycles * CYCLE_MINUTES;
            const good = option ? option.inRange : cycles >= 5;
            return (
              <li key={cycles} className={styles.option}>
                <BeanMark done={good} className={styles.bean} />
                <span className={styles.when}>
                  <output className={styles.time} aria-label={option ? `${cycles} cycles: ${formatSleepTime(option.minutes, format)}${option.shift ? ` ${dayNote(option.shift)}` : ""}` : undefined}>
                    {option ? formatSleepTime(option.minutes, format) : BLANK}
                  </output>
                  <span className={styles.day}>{option ? dayNote(option.shift) : BLANK}</span>
                </span>
                <span className={styles.amount}>
                  {formatSleepHours(asleep)} of sleep
                  <span className={styles.day}>{cycles} cycles</span>
                </span>
                <span className={good ? styles.good : styles.short}>{good ? "In the 7.5 to 9 hour range" : "Shorter than 7.5 hours"}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <p className={kit.muted}>
        A cycle is counted as {CYCLE_MINUTES} minutes. Real cycles vary from person to person and through the night, so use these as a rule of thumb. This is not medical advice.
      </p>
    </div>
  );
}

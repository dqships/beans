import { useEffect, useRef, useState } from "react";
import { Clock } from "@phosphor-icons/react/dist/ssr/Clock";
import { Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { X } from "@phosphor-icons/react/dist/ssr/X";
import { localTimeZone, minutesNowIn, todayIn } from "@beans/core/dates";
import { useNow, useStored } from "../hooks";
import { Button, Field, IconButton, Segmented, Select, TextInput, kit } from "../kit";
import {
  DEFAULT_PLANNER,
  MAX_PLACES,
  MIN_PLACES,
  buildStrips,
  cleanZone,
  clockToMinutes,
  dayShift,
  dayShiftLabel,
  defaultZones,
  formatCell,
  formatClock,
  formatDay,
  isPlannerDate,
  minutesToClock,
  offsetLabel,
  offsetMinutes,
  overlapSentence,
  parsePlanner,
  placeLabel,
  placeOptions,
  shiftDay,
  suggestZone,
  wallTime,
  zonedToUtc,
} from "../logic/timezones";
import styles from "./timezones.module.css";

const FORMATS = [
  { value: "24h", label: "24-hour" },
  { value: "12h", label: "12-hour" },
] as const;

const join = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(" ");

export function TimeZoneMeetingPlanner() {
  const [settings, setSettings] = useStored("time-zone-meeting-planner", DEFAULT_PLANNER, parsePlanner);
  // The visitor's zone and today's date come from their browser, so nothing is worked out until the page has mounted.
  const now = useNow(true, 60_000);
  /** What's in the date field. Null means today in the first place. */
  const [dateDraft, setDateDraft] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(9 * 60);
  const [timeDraft, setTimeDraft] = useState<string | null>(null);

  const ready = now !== null;
  const pickedHour = Math.floor(minutes / 60);
  const scroller = useRef<HTMLDivElement>(null);
  // On a phone the strips are wider than the screen: bring the chosen hour into view when it isn't.
  useEffect(() => {
    const box = scroller.current;
    const cell = box?.querySelector<HTMLElement>('[aria-pressed="true"]');
    const name = box?.querySelector<HTMLElement>("[data-name]");
    if (!ready || !box || !cell || !name) return;
    const frame = box.getBoundingClientRect();
    const spot = cell.getBoundingClientRect();
    const left = frame.left + name.offsetWidth;
    if (spot.left >= left && spot.right <= frame.right) return;
    box.scrollLeft += spot.left - left - spot.width;
  }, [ready, pickedHour]);

  if (now === null) {
    return (
      <div className={`${styles.planner} ${styles.waiting}`}>
        <p className={kit.muted}>Reading your time zone.</p>
      </div>
    );
  }

  const localZone = cleanZone(localTimeZone());
  const zones = (settings.zones ?? defaultZones(localZone)).map(cleanZone);
  const first = zones[0] ?? "UTC";
  const { format } = settings;
  const date = dateDraft !== null && isPlannerDate(dateDraft) ? dateDraft : todayIn(first, now);
  const moment = zonedToUtc(first, date, minutes);
  const strips = buildStrips(zones, date);
  const options = placeOptions(zones);
  const firstName = placeLabel(first);
  const sentence = overlapSentence(strips.overlap, format, first === localZone ? "your time" : `${firstName} time`);

  const setZones = (next: string[]) => setSettings((current) => ({ ...current, zones: next }));

  return (
    <div className={styles.planner}>
      <div className={styles.controls}>
        <Field label="Date" className={styles.dateField}>
          <TextInput
            type="date"
            min="1900-01-01"
            max="2200-12-31"
            value={dateDraft ?? date}
            onValue={setDateDraft}
            onBlur={() => setDateDraft((draft) => (draft !== null && isPlannerDate(draft) ? draft : null))}
          />
        </Field>
        <Field label={`Time in ${firstName}`} className={styles.timeField}>
          <TextInput
            type="time"
            value={timeDraft ?? minutesToClock(minutes)}
            onValue={(raw) => {
              setTimeDraft(raw);
              const parsed = clockToMinutes(raw);
              if (parsed !== null) setMinutes(parsed);
            }}
            onBlur={() => setTimeDraft(null)}
          />
        </Field>
        <Button
          icon={Clock}
          onClick={() => {
            setDateDraft(null);
            setTimeDraft(null);
            setMinutes(minutesNowIn(first));
          }}
        >
          Now
        </Button>
        <Segmented label="Clock" options={FORMATS} value={format} onChange={(next) => setSettings((current) => ({ ...current, format: next }))} className={styles.format} />
      </div>

      <ul className={styles.places}>
        {zones.map((zone, i) => {
          const wall = wallTime(zone, moment);
          const shift = dayShiftLabel(dayShift(wall.date, date));
          const name = placeLabel(zone);
          return (
            <li key={i} className={styles.place}>
              <Select
                value={zone}
                options={options}
                aria-label={i === 0 ? "First place, the one the time is set in" : `Place ${i + 1}`}
                onValue={(next) => setZones(zones.map((current, at) => (at === i ? next : current)))}
                className={styles.pick}
              />
              <output className={styles.time} aria-live="polite" aria-label={`${name}: ${formatClock(wall.minutes, format)}, ${formatDay(wall.date)}${shift ? `, ${shift}` : ""}`}>
                {formatClock(wall.minutes, format)}
              </output>
              <span className={styles.meta}>
                <span>{formatDay(wall.date)}</span>
                {shift ? <span className={styles.shift}>{shift}</span> : null}
                <span>{offsetLabel(offsetMinutes(zone, moment))}</span>
              </span>
              <IconButton icon={X} label={`Remove ${name}`} disabled={zones.length <= MIN_PLACES} onClick={() => setZones(zones.filter((_, at) => at !== i))} className={styles.remove} />
            </li>
          );
        })}
      </ul>

      <div className={kit.bar}>
        <Button icon={Plus} disabled={zones.length >= MAX_PLACES} onClick={() => setZones([...zones, suggestZone(zones)])}>
          Add a place
        </Button>
        <span className={kit.muted}>{zones.length >= MAX_PLACES ? `${MAX_PLACES} places is the most.` : `Up to ${MAX_PLACES} places.`}</span>
      </div>

      <p className={styles.sentence} role="status">
        {sentence}
      </p>

      <div ref={scroller} className={styles.scroll} role="group" aria-label={`The 24 hours of ${formatDay(date)} in ${firstName}, and what time each is in every place`}>
        <div className={styles.strips}>
          {zones.map((zone, row) => {
            const cells = strips.rows[row] ?? [];
            return (
              <div key={row} className={styles.strip} role="group" aria-label={placeLabel(zone)}>
                <span className={styles.stripName} data-name title={placeLabel(zone)}>
                  <span>{placeLabel(zone)}</span>
                </span>
                {cells.map((cell, hour) => {
                  const before = cells[hour - 1];
                  // Name the day wherever a place's date turns over, and at the start when it's already another day.
                  const newDay = before ? before.shift !== cell.shift : cell.shift !== 0;
                  const className = join(styles.cell, cell.working && styles.work, strips.overlap[hour] === true && styles.both, hour === pickedHour && styles.picked);
                  const inner = (
                    <>
                      <span>{formatCell(cell.minutes, format)}</span>
                      <span className={styles.tag}>{newDay ? formatDay(shiftDay(date, cell.shift)).slice(0, 3) : ""}</span>
                    </>
                  );
                  return row === 0 ? (
                    <button
                      key={hour}
                      type="button"
                      className={className}
                      aria-pressed={hour === pickedHour}
                      aria-label={`Set the time to ${formatClock(hour * 60, format)}`}
                      onClick={() => {
                        setTimeDraft(null);
                        setMinutes(hour * 60);
                      }}
                    >
                      {inner}
                    </button>
                  ) : (
                    <span key={hour} className={className}>
                      {inner}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <ul className={styles.legend}>
        <li>
          <span className={`${styles.swatch} ${styles.work}`} />
          Working hours, {formatClock(9 * 60, format)} to {formatClock(17 * 60, format)} local time
        </li>
        <li>
          <span className={`${styles.swatch} ${styles.both}`} />
          Everyone is in working hours
        </li>
        <li>
          <span className={`${styles.swatch} ${styles.picked}`} />
          The time you set
        </li>
      </ul>
    </div>
  );
}

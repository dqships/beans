import type { CSSProperties } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react/dist/ssr/ArrowCounterClockwise";
import { Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { Trash } from "@phosphor-icons/react/dist/ssr/Trash";
import { Mascot } from "@/ui/garden";
import { newId, useStored } from "../hooks";
import { Button, IconButton, NumberInput, Readout, Select, TextInput, kit } from "../kit";
import {
  DAYS_IN_WEEK,
  DEFAULT_ROWS,
  HOURS_IN_DAY,
  HOURS_IN_WEEK,
  MAX_NAME,
  MAX_ROWS,
  MINUTES_IN_WEEK,
  ROW_COLORS,
  addRow,
  budget,
  changeRow,
  formatHours,
  formatShare,
  hoursText,
  maxHours,
  parseRows,
  removeRow,
  type Per,
} from "../logic/weekbudget";
import styles from "./weekbudget.module.css";

const PER: readonly { value: Per; label: string }[] = [
  { value: "day", label: "a day" },
  { value: "week", label: "a week" },
];

/** The class that gives a row its label color. */
const colorClass = (color: number) => styles[`color-${ROW_COLORS[color] ?? "soil"}`] ?? "";

const share = (value: number) => ({ "--share": value }) as CSSProperties;

export function HoursInAWeek() {
  const [rows, setRows] = useStored("hours-in-a-week", DEFAULT_ROWS, parseRows);
  const result = budget(rows);
  const over = result.over > 0;
  const summary = over
    ? `${hoursText(result.spoken)} spoken for, ${hoursText(result.over)} more than a week holds.`
    : `${hoursText(result.spoken)} spoken for and ${hoursText(result.left)} left, out of ${HOURS_IN_WEEK}.`;

  return (
    <div className={kit.stack}>
      <Readout
        label="Hours in a week"
        value={`${HOURS_IN_WEEK} hours`}
        note={`${DAYS_IN_WEEK} days of ${HOURS_IN_DAY} hours, which is ${MINUTES_IN_WEEK.toLocaleString("en-US")} minutes.`}
      />

      <div className={kit.stackTight}>
        <p className={styles.heading}>Where your {HOURS_IN_WEEK} hours go</p>
        {rows.length === 0 ? (
          <div className={`${styles.rows} ${styles.empty}`}>
            <Mascot scene="rest" className={styles.mascot} />
            <p>Nothing in the week yet. Add a row for anything that takes your time.</p>
          </div>
        ) : (
          <ul className={styles.rows}>
            {rows.map((row, i) => {
              const name = row.name.trim() || `Row ${i + 1}`;
              const hours = result.rows[i]?.hours ?? 0;
              return (
                <li key={row.id} className={styles.row}>
                  <span className={`${styles.dot} ${colorClass(row.color)}`} aria-hidden="true" />
                  <TextInput
                    value={row.name}
                    onValue={(next) => setRows((current) => changeRow(current, row.id, { name: next }))}
                    placeholder="What takes the time"
                    maxLength={MAX_NAME}
                    aria-label={`Name of row ${i + 1}`}
                    className={styles.name}
                  />
                  <NumberInput
                    value={row.hours}
                    min={0}
                    max={maxHours(row.per)}
                    step="0.5"
                    onValue={(next) => setRows((current) => changeRow(current, row.id, { hours: next }))}
                    aria-label={`${name}: hours`}
                    className={styles.hours}
                  />
                  <Select value={row.per} options={PER} onValue={(per) => setRows((current) => changeRow(current, row.id, { per }))} aria-label={`${name}: a day or a week`} className={styles.per} />
                  <span className={styles.week}>{formatHours(hours)} h a week</span>
                  <IconButton icon={Trash} label={`Remove ${name}`} iconSize="sm" onClick={() => setRows((current) => removeRow(current, row.id))} className={styles.remove} />
                </li>
              );
            })}
          </ul>
        )}
        <div className={kit.bar}>
          <Button icon={Plus} disabled={rows.length >= MAX_ROWS} onClick={() => setRows((current) => addRow(current, newId()))}>
            Add a row
          </Button>
          <Button variant="quiet" icon={ArrowCounterClockwise} onClick={() => setRows(DEFAULT_ROWS)}>
            Start over
          </Button>
        </div>
      </div>

      <div className={kit.columns}>
        <Readout small label="Spoken for" value={hoursText(result.spoken)} note={`${formatShare(result.spoken / HOURS_IN_WEEK)} of the week`} />
        <Readout
          small
          label={over ? "Over by" : "Left over"}
          value={over ? <span className={styles.over}>{hoursText(result.over)}</span> : hoursText(result.left)}
          note={over ? `A week only has ${HOURS_IN_WEEK} hours. Something has to give.` : `out of ${HOURS_IN_WEEK}, or ${hoursText(Math.round((result.left / DAYS_IN_WEEK) * 100) / 100)} a day`}
        />
      </div>

      <div className={kit.stackTight}>
        <div className={styles.stalk} role="img" aria-label={`The week as one bar. ${summary}`}>
          {result.rows.map((row) => (row.width > 0 ? <span key={row.id} className={`${styles.part} ${colorClass(row.color)}`} style={share(row.width)} /> : null))}
          {result.leftWidth > 0 ? <span className={styles.free} style={share(result.leftWidth)} /> : null}
        </div>
        <ul className={styles.legend}>
          {result.rows.map((row, i) => (
            <li key={row.id} className={styles.key}>
              <span className={`${styles.dot} ${colorClass(row.color)}`} aria-hidden="true" />
              <span className={styles.keyName}>{row.name.trim() || `Row ${i + 1}`}</span>
              <span className={styles.keyHours}>{hoursText(row.hours)}</span>
              <span className={styles.keyShare}>{formatShare(row.share)}</span>
            </li>
          ))}
          <li className={styles.key}>
            <span className={`${styles.dot} ${styles.freeDot}`} aria-hidden="true" />
            <span className={styles.keyName}>Left over</span>
            <span className={styles.keyHours}>{hoursText(result.left)}</span>
            <span className={styles.keyShare}>{formatShare(result.left / HOURS_IN_WEEK)}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

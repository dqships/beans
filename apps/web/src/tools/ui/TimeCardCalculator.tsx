import { useState } from "react";
import { Copy } from "@phosphor-icons/react/dist/ssr/Copy";
import { Eraser } from "@phosphor-icons/react/dist/ssr/Eraser";
import { addDays, shortDate, startOfWeek } from "@beans/core/dates";
import { useStored } from "../hooks";
import { Button, Checkbox, Field, PrintButton, Readout, TextInput, kit } from "../kit";
import {
  DAY_NAMES,
  EMPTY_CARD,
  MAX_BREAK,
  MAX_RATE,
  OVERTIME_AFTER_HOURS,
  OVERTIME_TIMES,
  breakSwallowsShift,
  clearShifts,
  copyMondayToWeekdays,
  decimalHours,
  formatHoursMinutes,
  formatMoney,
  hasAnyTime,
  isOvernight,
  parseTimeCard,
  setShift,
  weekTotals,
  type Shift,
} from "../logic/timecard";
import styles from "./timecard.module.css";

/**
 * A number field where empty means zero, so deleting a break or the rate
 * clears it. What's being typed is kept here until the field is left.
 */
function AmountInput({ value, onValue, max, step, label, placeholder, whole }: { value: number; onValue: (value: number) => void; max: number; step: string; label?: string; placeholder: string; whole?: boolean }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <TextInput
      type="number"
      inputMode={whole ? "numeric" : "decimal"}
      min={0}
      max={max}
      step={step}
      placeholder={placeholder}
      aria-label={label}
      value={draft ?? (value > 0 ? String(value) : "")}
      onValue={(raw) => {
        setDraft(raw);
        const parsed = raw.trim() === "" ? 0 : Number(raw);
        if (Number.isFinite(parsed)) onValue(Math.min(max, Math.max(0, parsed)));
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

/** The Monday of the chosen week, or null when no usable date is set. */
function mondayOf(week: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week) || Number(week.slice(0, 4)) < 1900) return null;
  return startOfWeek(week, 1);
}

/** The small line under a day's hours: why they are what they are. */
function shiftNote(shift: Shift, minutes: number | null): string {
  if (minutes === null) return shift.start || shift.end ? "Add both times" : "";
  if (shift.start === shift.end) return "In and out are the same";
  if (breakSwallowsShift(shift)) return "Break covers the shift";
  return isOvernight(shift) ? "Ends the next day" : "";
}

export function TimeCardCalculator() {
  const [card, setCard] = useStored("time-card-calculator", EMPTY_CARD, parseTimeCard);
  const totals = weekTotals(card);
  const monday = mondayOf(card.week);
  const hasRate = card.rate > 0;
  const change = (index: number, next: Partial<Shift>) => setCard((current) => setShift(current, index, next));

  return (
    <div className={styles.card}>
      <div className={styles.who}>
        <Field label="Name">
          <TextInput value={card.name} onValue={(name) => setCard((current) => ({ ...current, name: name.slice(0, 80) }))} placeholder="Whose time card this is" maxLength={80} autoComplete="off" />
        </Field>
        <Field label="Week of">
          <TextInput type="date" value={card.week} onValue={(week) => setCard((current) => ({ ...current, week: /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : "" }))} />
        </Field>
      </div>

      <div className={styles.body}>
        <div className={styles.sheet}>
          <div className={styles.headRow} aria-hidden="true">
            <span>Day</span>
            <span>Clock in</span>
            <span>Clock out</span>
            <span>Break (min)</span>
            <span className={styles.end}>Hours</span>
          </div>

          {DAY_NAMES.map((day, i) => {
            const shift = card.days[i] ?? EMPTY_CARD.days[0]!;
            const minutes = totals.dayMinutes[i] ?? null;
            const note = shiftNote(shift, minutes);
            return (
              <div key={day} className={styles.row} role="group" aria-label={day}>
                <span className={styles.day}>
                  {day}
                  <span className={styles.small}>{monday ? shortDate(addDays(monday, i)) : ""}</span>
                </span>
                <label className={`${styles.cell} ${styles.clockIn}`}>
                  <span className={styles.cap} aria-hidden="true">
                    In
                  </span>
                  <TextInput type="time" value={shift.start} onValue={(start) => change(i, { start })} aria-label={`${day} clock in`} />
                </label>
                <label className={`${styles.cell} ${styles.clockOut}`}>
                  <span className={styles.cap} aria-hidden="true">
                    Out
                  </span>
                  <TextInput type="time" value={shift.end} onValue={(end) => change(i, { end })} aria-label={`${day} clock out`} />
                </label>
                <label className={`${styles.cell} ${styles.breakCell}`}>
                  <span className={styles.cap} aria-hidden="true">
                    Break
                  </span>
                  <AmountInput value={shift.breakMin} max={MAX_BREAK} step="5" placeholder="0" whole onValue={(breakMin) => change(i, { breakMin })} label={`${day} unpaid break in minutes`} />
                </label>
                <span className={`${styles.hours} ${minutes ? "" : styles.none}`}>
                  {formatHoursMinutes(minutes ?? 0)}
                  <span className={styles.small}>{note}</span>
                </span>
              </div>
            );
          })}

          <div className={styles.totalRow}>
            <span>Week total</span>
            <span className={styles.hours}>{formatHoursMinutes(totals.totalMinutes)}</span>
          </div>
        </div>

        <div className={styles.summary}>
          <Readout label="Total this week" value={formatHoursMinutes(totals.totalMinutes)} note={`${decimalHours(totals.totalMinutes)} decimal hours`} />

          <div className={`${styles.payControls} ${hasRate ? "" : kit.noPrint}`}>
            <Field label="Hourly rate" hint="Optional. Leave it empty for hours only." className={styles.rate}>
              <AmountInput value={card.rate} max={MAX_RATE} step="0.01" placeholder="0.00" onValue={(rate) => setCard((current) => ({ ...current, rate: Math.round(rate * 100) / 100 }))} />
            </Field>
            <span className={kit.noPrint}>
              <Checkbox
                label={`Overtime after ${OVERTIME_AFTER_HOURS} hours at ${OVERTIME_TIMES} times`}
                checked={card.overtime}
                onChange={(overtime) => setCard((current) => ({ ...current, overtime }))}
              />
            </span>
          </div>

          <dl className={styles.lines} aria-live="polite">
            {card.overtime ? (
              <>
                <div className={styles.line}>
                  <dt>Regular hours</dt>
                  <dd>{decimalHours(totals.regularMinutes)}</dd>
                </div>
                <div className={styles.line}>
                  <dt>Overtime hours</dt>
                  <dd>{decimalHours(totals.overtimeMinutes)}</dd>
                </div>
              </>
            ) : null}
            {card.overtime && hasRate ? (
              <>
                <div className={styles.line}>
                  <dt>Regular pay</dt>
                  <dd>{formatMoney(totals.regularPay)}</dd>
                </div>
                <div className={styles.line}>
                  <dt>Overtime pay</dt>
                  <dd>{formatMoney(totals.overtimePay)}</dd>
                </div>
              </>
            ) : null}
            <div className={`${styles.line} ${styles.gross} ${hasRate ? "" : kit.noPrint}`}>
              <dt>Gross pay</dt>
              <dd>{hasRate ? formatMoney(totals.grossPay) : <span className={styles.none}>Add an hourly rate</span>}</dd>
            </div>
          </dl>
          <p className={`${kit.muted} ${hasRate ? "" : kit.noPrint}`}>Gross pay is before taxes and deductions.</p>
        </div>
      </div>

      <div className={styles.sign} aria-hidden="true">
        <span>Signature</span>
        <span>Approved by</span>
        <span>Date</span>
      </div>

      <div className={`${kit.bar} ${kit.noPrint}`}>
        <Button icon={Copy} disabled={!card.days[0]?.start && !card.days[0]?.end} onClick={() => setCard((current) => copyMondayToWeekdays(current))}>
          Copy Monday to weekdays
        </Button>
        <Button variant="quiet" icon={Eraser} disabled={!hasAnyTime(card)} onClick={() => setCard((current) => clearShifts(current))}>
          Clear
        </Button>
        <PrintButton />
      </div>
    </div>
  );
}

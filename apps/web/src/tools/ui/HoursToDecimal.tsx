import { useId, useState, type FocusEvent } from "react";
import { Field, Readout, TextInput, kit } from "../kit";
import { decimalToTime, referencePairs, timeToDecimal } from "../logic/decimal-hours";
import { decimalNumber, decimalOnly, digitsOnly, fixed, formatHms, spanShort, trimmed, wholeNumber } from "../logic/hms";
import styles from "./time-math.module.css";

const REFERENCE = referencePairs();

/** Selects what's in a field when it takes focus, so typing replaces the example. */
const selectAll = (event: FocusEvent<HTMLInputElement>) => event.currentTarget.select();

export function HoursToDecimal() {
  // Starts on a worked example: 1 hour 30 minutes is 1.5 hours.
  const [time, setTime] = useState({ hours: "1", minutes: "30", seconds: "" });
  const [decimal, setDecimal] = useState("1.5");
  const toDecimalTitle = useId();
  const toTimeTitle = useId();

  const asDecimal = timeToDecimal(wholeNumber(time.hours), wholeNumber(time.minutes), wholeNumber(time.seconds));
  const asTime = decimalToTime(decimalNumber(decimal));

  return (
    <div className={kit.stack}>
      <div className={kit.columns}>
        <div className={styles.panel} role="group" aria-labelledby={toDecimalTitle}>
          <p id={toDecimalTitle} className={styles.panelTitle}>
            Hours and minutes to decimal
          </p>
          <div className={styles.fields}>
            <Field label="Hours">
              <TextInput inputMode="numeric" placeholder="0" value={time.hours} onValue={(hours) => setTime({ ...time, hours: digitsOnly(hours) })} onFocus={selectAll} />
            </Field>
            <Field label="Minutes">
              <TextInput inputMode="numeric" placeholder="0" value={time.minutes} onValue={(minutes) => setTime({ ...time, minutes: digitsOnly(minutes) })} onFocus={selectAll} />
            </Field>
            <Field label="Seconds">
              <TextInput inputMode="numeric" placeholder="0" value={time.seconds} onValue={(seconds) => setTime({ ...time, seconds: digitsOnly(seconds) })} onFocus={selectAll} />
            </Field>
          </div>
          <Readout small className={styles.answerSmall} label="Decimal hours" value={fixed(asDecimal.hours)} note={`Rounded to 2 decimal places. ${trimmed(asDecimal.minutes)} ${asDecimal.minutes === 1 ? "minute" : "minutes"} in total.`} />
        </div>

        <div className={styles.panel} role="group" aria-labelledby={toTimeTitle}>
          <p id={toTimeTitle} className={styles.panelTitle}>
            Decimal to hours and minutes
          </p>
          <Field label="Decimal hours">
            <TextInput inputMode="decimal" placeholder="0" value={decimal} onValue={(next) => setDecimal(decimalOnly(next))} onFocus={selectAll} />
          </Field>
          <Readout
            small
            className={styles.answerSmall}
            label="Hours and minutes"
            value={spanShort(asTime.totalSeconds)}
            note={`${formatHms(asTime.totalSeconds)} as h:mm:ss. ${trimmed(asTime.totalMinutes)} ${asTime.totalMinutes === 1 ? "minute" : "minutes"} in total.`}
          />
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <caption>Minutes as decimal hours</caption>
          <thead>
            <tr>
              <th scope="col">Minutes</th>
              <th scope="col">Decimal hours</th>
              <th scope="col">Minutes</th>
              <th scope="col">Decimal hours</th>
            </tr>
          </thead>
          <tbody>
            {REFERENCE.map(([left, right]) => (
              <tr key={left.minutes}>
                <td>{left.minutes}</td>
                <td>{left.hours}</td>
                <td>{right ? right.minutes : ""}</td>
                <td>{right ? right.hours : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

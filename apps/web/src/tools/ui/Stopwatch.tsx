import { useState } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react/dist/ssr/ArrowCounterClockwise";
import { Flag } from "@phosphor-icons/react/dist/ssr/Flag";
import { Play } from "@phosphor-icons/react/dist/ssr/Play";
import { Stop } from "@phosphor-icons/react/dist/ssr/Stop";
import { formatStopwatch } from "@beans/core/duration";
import { LeafRing } from "@/ui/garden";
import { useNow, useTabTitle } from "../hooks";
import { Button, kit } from "../kit";
import { MAX_LAPS, ZERO_STOPWATCH, addLap, currentLapMs, elapsedMs, formatHundredths, lapRows, startStopwatch, stopStopwatch, stopwatchReading } from "../logic/stopwatch";
import styles from "./timers.module.css";

/** How often the reading is redrawn while running. The time itself comes from the clock, not from counting these. */
const REDRAW_MS = 40;

const MARK_NAME = { fastest: "Fastest", slowest: "Slowest" } as const;

export function Stopwatch() {
  const [watch, setWatch] = useState(ZERO_STOPWATCH);
  const running = watch.startedAt !== null;
  const now = useNow(running, REDRAW_MS);
  const elapsed = elapsedMs(watch, now);
  const reading = stopwatchReading(elapsed);
  const laps = lapRows(watch.laps);
  const zero = !running && elapsed === 0;
  useTabTitle(zero ? null : `${formatStopwatch(elapsed)} · Stopwatch`);

  // The clock is read when a button is pressed, so the time is right to the moment of the press.
  const toggle = () => {
    const at = Date.now();
    setWatch((current) => (current.startedAt === null ? startStopwatch(current, at) : stopStopwatch(current, at)));
  };
  const lap = () => {
    const at = Date.now();
    setWatch((current) => addLap(current, at));
  };

  return (
    <div className={styles.timer}>
      <div className={styles.face}>
        <div className={styles.ring}>
          {/* The leaf grows through each minute, then starts again. */}
          <LeafRing progress={(elapsed % 60_000) / 60_000} />
        </div>
        <div className={`${styles.reading} ${styles.readingWide}`}>
          <span className={styles.phase} role="status">
            {running ? "Running" : zero ? "Ready" : "Stopped"}
          </span>
          <span className={kit.digits} role="timer" aria-label="Time on the stopwatch">
            {reading.main}
            <span className={styles.fraction}>.{reading.hundredths}</span>
          </span>
          <span className={styles.note}>{laps.length === 0 ? "No laps yet" : `Lap ${laps.length + 1}: ${formatHundredths(currentLapMs(watch, now))}`}</span>
        </div>
      </div>

      <div className={`${kit.bar} ${kit.barCenter}`}>
        <Button variant="primary" icon={running ? Stop : Play} onClick={toggle}>
          {running ? "Stop" : "Start"}
        </Button>
        <Button icon={Flag} onClick={lap} disabled={!running || watch.laps.length >= MAX_LAPS}>
          Lap
        </Button>
        <Button icon={ArrowCounterClockwise} onClick={() => setWatch(ZERO_STOPWATCH)} disabled={zero}>
          Reset
        </Button>
      </div>

      {laps.length === 0 ? (
        <p className={`${styles.laps} ${styles.lapsEmpty}`}>Press Lap while the stopwatch runs to mark a lap. Each one shows its own time and the total so far.</p>
      ) : (
        // A scrolling box needs to take focus, so the keyboard can scroll it.
        <div className={styles.laps} role="region" aria-label="Laps" tabIndex={0}>
          <table className={styles.lapTable}>
            <thead>
              <tr>
                <th scope="col">Lap</th>
                <th scope="col">Lap time</th>
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {laps.map((row) => (
                <tr key={row.number}>
                  <td>
                    Lap {row.number}
                    {row.mark ? <span className={`${styles.lapMark} ${row.mark === "fastest" ? styles.lapFastest : ""}`}>{MARK_NAME[row.mark]}</span> : null}
                  </td>
                  <td>{formatHundredths(row.lapMs)}</td>
                  <td className={styles.lapTotal}>{formatHundredths(row.totalMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

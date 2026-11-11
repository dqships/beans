import { ArrowCounterClockwise } from "@phosphor-icons/react/dist/ssr/ArrowCounterClockwise";
import { Pause } from "@phosphor-icons/react/dist/ssr/Pause";
import { Play } from "@phosphor-icons/react/dist/ssr/Play";
import { formatStopwatch } from "@beans/core/duration";
import { LeafRing } from "@/ui/garden";
import { askToNotify, chime, notify, useCountdown, useStored, useTabTitle } from "../hooks";
import { Button, Checkbox, Field, NumberInput, kit } from "../kit";
import { COUNTDOWN_PRESETS, DEFAULT_COUNTDOWN, ceilToSecond, describeLength, joinLength, parseCountdownSettings, splitLength, type LengthParts } from "../logic/countdown";
import styles from "./timers.module.css";

const STATUS_NAME = { idle: "Ready", running: "Counting down", paused: "Paused", done: "Time's up" } as const;

export function CountdownTimer() {
  const [settings, setSettings] = useStored("countdown-timer", DEFAULT_COUNTDOWN, parseCountdownSettings);
  const setMs = settings.seconds * 1000;

  const timer = useCountdown(setMs, () => {
    if (settings.sound) chime();
    notify(`Time's up. Your ${describeLength(settings.seconds)} timer has finished.`);
  });

  const { status } = timer;
  const idle = status === "idle";
  const running = status === "running";
  const done = status === "done";
  // While idle the face follows the fields, so a new length shows at once.
  const leftMs = idle ? setMs : ceilToSecond(timer.leftMs);
  const progress = idle ? 0 : timer.progress;
  const clock = formatStopwatch(leftMs);
  const parts = splitLength(settings.seconds);
  const empty = settings.seconds === 0;
  useTabTitle(running || status === "paused" ? `${clock} · Countdown` : done ? "Time's up · Countdown" : null);

  /** A new length always starts over: the timer goes back to ready with the new time on it. */
  const setLength = (seconds: number) => {
    setSettings({ ...settings, seconds });
    timer.reset(seconds * 1000);
  };
  const setPart = (part: Partial<LengthParts>) => setLength(joinLength({ ...parts, ...part }));

  return (
    <div className={styles.timer}>
      <div className={styles.presets} role="group" aria-label="Quick lengths">
        {COUNTDOWN_PRESETS.map((minutes) => (
          <Button key={minutes} variant="quiet" size="sm" aria-pressed={settings.seconds === minutes * 60} onClick={() => setLength(minutes * 60)}>
            {minutes} min
          </Button>
        ))}
      </div>

      <div className={styles.face}>
        <div className={styles.ring}>
          <LeafRing progress={progress} label={`Countdown: ${Math.round(progress * 100)}% done`} />
        </div>
        <div className={styles.reading}>
          <span className={`${styles.phase} ${done ? styles.over : ""}`} role="status">
            {STATUS_NAME[status]}
          </span>
          <span className={kit.digits} role="timer" aria-label="Time left">
            {clock}
          </span>
          <span className={styles.note}>{empty ? "Set a length to start" : `Set for ${describeLength(settings.seconds)}`}</span>
        </div>
      </div>

      <div className={`${kit.bar} ${kit.barCenter}`}>
        {running ? (
          <Button variant="primary" icon={Pause} onClick={timer.pause}>
            Pause
          </Button>
        ) : (
          <Button
            variant="primary"
            icon={Play}
            disabled={empty}
            onClick={() => {
              askToNotify();
              if (status === "paused") timer.start();
              else timer.restart(setMs);
            }}
          >
            {status === "paused" ? "Resume" : done ? "Start again" : "Start"}
          </Button>
        )}
        <Button icon={ArrowCounterClockwise} onClick={() => timer.reset(setMs)} disabled={idle}>
          Reset
        </Button>
      </div>

      <div className={styles.lengths}>
        <Field label="Hours">
          <NumberInput value={parts.hours} min={0} max={99} inputMode="numeric" onValue={(hours) => setPart({ hours })} />
        </Field>
        <Field label="Minutes">
          <NumberInput value={parts.minutes} min={0} max={59} inputMode="numeric" onValue={(minutes) => setPart({ minutes })} />
        </Field>
        <Field label="Seconds">
          <NumberInput value={parts.seconds} min={0} max={59} inputMode="numeric" onValue={(seconds) => setPart({ seconds })} />
        </Field>
        <Checkbox label="Chime when time is up" checked={settings.sound} onChange={(sound) => setSettings({ ...settings, sound })} />
      </div>
    </div>
  );
}

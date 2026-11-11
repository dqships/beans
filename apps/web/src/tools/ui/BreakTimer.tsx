import { useState } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react/dist/ssr/ArrowCounterClockwise";
import { Pause } from "@phosphor-icons/react/dist/ssr/Pause";
import { Play } from "@phosphor-icons/react/dist/ssr/Play";
import { SkipForward } from "@phosphor-icons/react/dist/ssr/SkipForward";
import { formatStopwatch } from "@beans/core/duration";
import { BeanMark, LeafRing } from "@/ui/garden";
import { askToNotify, chime, notify, useCountdown, useStored, useTabTitle } from "../hooks";
import { Button, Checkbox, Field, NumberInput, Segmented, kit } from "../kit";
import { BREAK_PRESETS, DEFAULT_BREAK, REST_RANGE, WORK_RANGE, cyclesAfter, describePlan, nextPart, parseBreakSettings, partDoneMessage, partMs, partName, type BreakPresetId, type BreakSettings, type Part } from "../logic/break-timer";
import { ceilToSecond } from "../logic/countdown";
import styles from "./timers.module.css";

const PATTERNS: readonly { value: BreakPresetId; label: string }[] = [...BREAK_PRESETS.map((preset) => ({ value: preset.id, label: preset.label })), { value: "custom", label: "Custom" }];

/** Beans shown for finished cycles before the count takes over. */
const MAX_BEANS = 12;

export function BreakTimer() {
  const [settings, setSettings] = useStored("break-timer", DEFAULT_BREAK, parseBreakSettings);
  const [part, setPart] = useState<Part>("work");
  const [cycles, setCycles] = useState(0);
  const lengthMs = partMs(part, settings);

  // Work and break follow each other with no button press, until Pause or Reset.
  const timer = useCountdown(lengthMs, ({ restart }) => {
    if (settings.sound) chime();
    notify(partDoneMessage(part, settings));
    const next = nextPart(part);
    setCycles(cyclesAfter(part, cycles));
    setPart(next);
    restart(partMs(next, settings));
  });

  const idle = timer.status === "idle";
  const running = timer.status === "running";
  // While idle the face follows the settings, so a new pattern shows at once.
  const leftMs = idle ? lengthMs : ceilToSecond(timer.leftMs);
  const progress = idle ? 0 : timer.progress;
  const name = partName(part, settings);
  useTabTitle(running || timer.status === "paused" ? `${formatStopwatch(leftMs)} · ${part === "work" ? "Work" : "Break"}` : null);

  /** New lengths start the cycle over from work. */
  const change = (next: BreakSettings) => {
    setSettings(next);
    setPart("work");
    setCycles(0);
    timer.reset(partMs("work", next));
  };

  const skip = () => {
    const next = nextPart(part);
    const nextMs = partMs(next, settings);
    setPart(next);
    if (running) timer.restart(nextMs);
    else timer.reset(nextMs);
  };

  return (
    <div className={styles.timer}>
      <Segmented label="Work and break lengths" options={PATTERNS} value={settings.preset} onChange={(preset) => change({ ...settings, preset })} />

      <div className={styles.plan}>
        {settings.preset === "custom" ? (
          <>
            <Field label="Work (minutes)">
              <NumberInput value={settings.work} min={WORK_RANGE.min} max={WORK_RANGE.max} inputMode="numeric" onValue={(work) => change({ ...settings, work: Math.round(work) })} />
            </Field>
            <Field label="Break (minutes)">
              <NumberInput value={settings.rest} min={REST_RANGE.min} max={REST_RANGE.max} inputMode="numeric" onValue={(rest) => change({ ...settings, rest: Math.round(rest) })} />
            </Field>
          </>
        ) : (
          <p className={styles.planLine}>{describePlan(settings)}</p>
        )}
      </div>

      <div className={styles.face}>
        <div className={styles.ring}>
          <LeafRing progress={progress} label={`${name}: ${Math.round(progress * 100)}% done`} />
        </div>
        <div className={styles.reading}>
          <span className={styles.phase} role="status">
            {name}
          </span>
          <span className={kit.digits} role="timer" aria-label="Time left">
            {formatStopwatch(leftMs)}
          </span>
          <span className={styles.rounds} aria-label={`${cycles} ${cycles === 1 ? "cycle" : "cycles"} finished`}>
            {cycles === 0 ? "No cycles finished yet" : Array.from({ length: Math.min(cycles, MAX_BEANS) }, (_, i) => <BeanMark key={i} done className={styles.roundBean} />)}
            {cycles > MAX_BEANS ? `+${cycles - MAX_BEANS}` : null}
          </span>
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
            onClick={() => {
              askToNotify();
              if (idle) timer.restart(lengthMs);
              else timer.start();
            }}
          >
            {timer.status === "paused" ? "Resume" : "Start"}
          </Button>
        )}
        <Button
          icon={ArrowCounterClockwise}
          disabled={idle && part === "work" && cycles === 0}
          onClick={() => {
            setPart("work");
            setCycles(0);
            timer.reset(partMs("work", settings));
          }}
        >
          Reset
        </Button>
        <Button variant="quiet" icon={SkipForward} onClick={skip}>
          {part === "work" ? "Skip to break" : "Skip to work"}
        </Button>
      </div>

      <Checkbox label="Chime at each change" checked={settings.sound} onChange={(sound) => setSettings({ ...settings, sound })} />
    </div>
  );
}

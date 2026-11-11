import { useState } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react/dist/ssr/ArrowCounterClockwise";
import { Pause } from "@phosphor-icons/react/dist/ssr/Pause";
import { Play } from "@phosphor-icons/react/dist/ssr/Play";
import { SkipForward } from "@phosphor-icons/react/dist/ssr/SkipForward";
import { formatStopwatch } from "@beans/core/duration";
import { BeanMark, LeafRing } from "@/ui/garden";
import { askToNotify, chime, notify, useCountdown, useStored, useTabTitle } from "../hooks";
import { Button, Checkbox, Field, NumberInput, Segmented, TextInput, kit } from "../kit";
import { DEFAULT_POMODORO, nextPhase, parsePomodoroSettings, phaseMinutes, phaseName, roundInSet, type Phase } from "../logic/pomodoro";
import styles from "./timers.module.css";

const PHASES = [
  { value: "focus", label: "Focus" },
  { value: "short", label: "Short break" },
  { value: "long", label: "Long break" },
] as const;

const parseTask = (stored: unknown) => (typeof stored === "string" ? stored.slice(0, 200) : null);

export function PomodoroTimer() {
  const [settings, setSettings] = useStored("pomodoro", DEFAULT_POMODORO, parsePomodoroSettings);
  const [task, setTask] = useStored("pomodoro-task", "", parseTask);
  const [phase, setPhase] = useState<Phase>("focus");
  const [focusDone, setFocusDone] = useState(0);
  const phaseMs = phaseMinutes(phase, settings) * 60_000;

  /** Moves to the next round and returns its length. */
  const advance = () => {
    const done = phase === "focus" ? focusDone + 1 : focusDone;
    const next = nextPhase(phase, done, settings.every);
    setFocusDone(done);
    setPhase(next);
    return phaseMinutes(next, settings) * 60_000;
  };

  const timer = useCountdown(phaseMs, ({ reset, restart }) => {
    if (settings.sound) chime();
    notify(phase === "focus" ? "Focus done. Time for a break." : "Break over. Back to it.");
    const nextMs = advance();
    if (settings.autoStart) restart(nextMs);
    else reset(nextMs);
  });

  const idle = timer.status === "idle";
  const running = timer.status === "running";
  // While idle the face follows the settings, so changing a length shows at once.
  const leftMs = idle ? phaseMs : timer.leftMs;
  const progress = idle ? 0 : timer.progress;
  useTabTitle(running || timer.status === "paused" ? `${formatStopwatch(leftMs)} · ${phaseName[phase]}` : null);

  const choose = (next: Phase) => {
    setPhase(next);
    timer.reset(phaseMinutes(next, settings) * 60_000);
  };

  return (
    <div className={styles.timer}>
      <Segmented label="Round" options={PHASES} value={phase} onChange={choose} />

      <div className={styles.face}>
        <div className={styles.ring}>
          <LeafRing progress={progress} label={`${phaseName[phase]}: ${Math.round(progress * 100)}% done`} />
        </div>
        <div className={styles.reading}>
          <span className={styles.phase}>{phase === "focus" ? `Focus, round ${roundInSet(focusDone, settings.every)} of ${settings.every}` : phaseName[phase]}</span>
          <span className={kit.digits} role="timer" aria-label="Time left">
            {formatStopwatch(leftMs)}
          </span>
          <span className={styles.rounds} aria-label={`${focusDone} focus ${focusDone === 1 ? "round" : "rounds"} finished`}>
            {focusDone === 0 ? "No rounds finished yet" : Array.from({ length: Math.min(focusDone, 12) }, (_, i) => <BeanMark key={i} done className={styles.roundBean} />)}
            {focusDone > 12 ? `+${focusDone - 12}` : null}
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
              if (idle) timer.restart(phaseMs);
              else timer.start();
            }}
          >
            {timer.status === "paused" ? "Resume" : "Start"}
          </Button>
        )}
        <Button icon={ArrowCounterClockwise} onClick={() => timer.reset(phaseMs)} disabled={idle}>
          Reset
        </Button>
        <Button
          variant="quiet"
          icon={SkipForward}
          onClick={() => timer.reset(advance())}
        >
          Skip
        </Button>
      </div>

      <Field label="What are you working on?" className={styles.task}>
        <TextInput value={task} onValue={setTask} placeholder="One task for this round" maxLength={200} />
      </Field>

      <details className={styles.settings}>
        <summary>Settings</summary>
        <div className={styles.settingsBody}>
          <Field label="Focus (minutes)">
            <NumberInput value={settings.focus} min={1} max={180} onValue={(focus) => setSettings({ ...settings, focus })} />
          </Field>
          <Field label="Short break">
            <NumberInput value={settings.short} min={1} max={60} onValue={(short) => setSettings({ ...settings, short })} />
          </Field>
          <Field label="Long break">
            <NumberInput value={settings.long} min={1} max={120} onValue={(long) => setSettings({ ...settings, long })} />
          </Field>
          <Field label="Long break after">
            <span className={kit.unit}>
              <NumberInput value={settings.every} min={1} max={12} inputMode="numeric" onValue={(every) => setSettings({ ...settings, every: Math.round(every) })} />
              rounds
            </span>
          </Field>
          <Checkbox label="Chime when a round ends" checked={settings.sound} onChange={(sound) => setSettings({ ...settings, sound })} />
          <Checkbox label="Start the next round by itself" checked={settings.autoStart} onChange={(autoStart) => setSettings({ ...settings, autoStart })} />
        </div>
      </details>
    </div>
  );
}

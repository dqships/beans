"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Coffee, Pause, Play, SkipForward, Stop } from "@phosphor-icons/react";
import { formatStopwatch, timerElapsed } from "@beans/core";
import { useActions, useSettings, useTask, useTicker } from "@/data/hooks";
import { LeafRing } from "@/ui/garden";
import { Icon } from "@/ui/Icon";
import { useUi } from "./ui-state";
import styles from "./timer.module.css";

/** A soft two-note chime made in code, so no audio file ships. */
function chime() {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  } catch {}
}

function notify(text: string) {
  try {
    if ("Notification" in window && Notification.permission === "granted") new Notification("Beans", { body: text });
  } catch {}
}

export function TimerPill(props: { placement?: "topbar" | "floating" }) {
  const settings = useSettings();
  const timer = settings?.activeTimer ?? null;
  if (props.placement === "topbar" || !timer) return null;
  return <Pill />;
}

function Pill() {
  const ui = useUi();
  const actions = useActions();
  const settings = useSettings()!;
  const timer = settings.activeTimer!;
  const task = useTask(timer.taskId);
  const running = timer.runningSince !== null;
  const now = useTicker(running);
  const elapsed = timerElapsed(timer, now);
  const [open, setOpen] = useState(false);
  const pomodoro = timer.mode === "pomodoro";
  const phaseMs = (timer.phase === "focus" ? settings.pomodoroFocus : settings.pomodoroBreak) * 60_000;
  const remaining = phaseMs - elapsed;
  const switched = useRef<number | null>(null);

  // When a Pomodoro phase ends, chime, notify and move to the next phase once.
  useEffect(() => {
    if (!pomodoro || !running || remaining > 0) return;
    const key = timer.runningSince ?? 0;
    if (switched.current === key) return;
    switched.current = key;
    if (settings.pomodoroSound) chime();
    notify(timer.phase === "focus" ? "Focus done. Time for a break." : "Break over. Back to it.");
    actions.switchPhase();
  }, [pomodoro, running, remaining, timer.runningSince, timer.phase, settings.pomodoroSound, actions]);

  useEffect(() => {
    if (pomodoro && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, [pomodoro]);

  const title = task?.title ?? "Task";
  return (
    <div
      className={`${styles.pill} ${open ? styles.open : ""}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
      role="region"
      aria-label="Timer"
    >
      {pomodoro ? (
        <LeafRing progress={elapsed / phaseMs} label={`${timer.phase === "focus" ? "Focus" : "Break"} progress`} />
      ) : (
        <span className={`${styles.dot} ${running ? styles.dotLive : ""}`} aria-hidden="true" />
      )}
      <button type="button" className={styles.summary} onClick={() => ui.openTask(timer.taskId)} title={title}>
        <span className={styles.time}>{pomodoro ? formatStopwatch(Math.max(0, remaining)) : formatStopwatch(elapsed)}</span>
        <span className={styles.caption}>{pomodoro ? (timer.phase === "focus" ? "Focus" : "Break") : running ? title : `Paused · ${title}`}</span>
      </button>
      <div className={styles.controls}>
        <button type="button" className={styles.control} aria-label={running ? "Pause" : "Resume"} title={running ? "Pause" : "Resume"} onClick={() => (running ? actions.pauseTimer() : actions.resumeTimer())}>
          <Icon icon={running ? Pause : Play} />
        </button>
        {pomodoro ? (
          <button
            type="button"
            className={styles.control}
            aria-label={timer.phase === "focus" ? "Start break now" : "Skip break"}
            title={timer.phase === "focus" ? "Start break now" : "Skip break"}
            onClick={() => actions.switchPhase()}
          >
            <Icon icon={timer.phase === "focus" ? Coffee : SkipForward} />
          </button>
        ) : (
          <button
            type="button"
            className={styles.control}
            aria-label="Stop and mark done"
            title="Stop and mark done"
            onClick={() => {
              actions.setDone(timer.taskId, true);
              ui.toast(`Done: ${title}`);
            }}
          >
            <Icon icon={Check} />
          </button>
        )}
        <button type="button" className={styles.control} aria-label="Stop timer" title="Stop timer" onClick={() => actions.stopTimer()}>
          <Icon icon={Stop} />
        </button>
      </div>
    </div>
  );
}

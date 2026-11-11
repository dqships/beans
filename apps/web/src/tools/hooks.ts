import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Shared behavior for the free tools: saved state, a clock, a countdown and a
 * chime. The tools pages render on the server first, so everything here
 * starts from a fixed value and picks up the browser's on the client.
 */

const PREFIX = "beans-tools:";

/** Used when local storage is blocked, so a tool still works for the visit. */
const memory = new Map<string, string>();
const listeners = new Map<string, Set<() => void>>();
const cache = new Map<string, { raw: string | null; value: unknown }>();

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function writeRaw(key: string, raw: string) {
  try {
    window.localStorage.setItem(PREFIX + key, raw);
  } catch {
    memory.set(key, raw);
  }
  listeners.get(key)?.forEach((notify) => notify());
}

function subscribe(key: string, notify: () => void) {
  const set = listeners.get(key) ?? new Set();
  listeners.set(key, set);
  set.add(notify);
  // Another tab changed it.
  const onStorage = (event: StorageEvent) => {
    if (event.key === PREFIX + key) notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    set.delete(notify);
    window.removeEventListener("storage", onStorage);
  };
}

function snapshot<T>(key: string, initial: T, parse: (stored: unknown) => T | null): T {
  const raw = readRaw(key);
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  let value = initial;
  if (raw !== null) {
    try {
      value = parse(JSON.parse(raw)) ?? initial;
    } catch {
      value = initial;
    }
  }
  cache.set(key, { raw, value });
  return value;
}

/**
 * State kept in this browser's local storage, so a tool is as you left it
 * when you come back. Nothing leaves the device.
 *
 * `initial` must be a constant defined outside the component. `parse` checks
 * what was stored and returns null for anything it doesn't recognize.
 */
export function useStored<T>(key: string, initial: T, parse: (stored: unknown) => T | null): [T, (next: T | ((previous: T) => T)) => void] {
  const value = useSyncExternalStore(
    useCallback((notify: () => void) => subscribe(key, notify), [key]),
    () => snapshot(key, initial, parse),
    () => initial,
  );
  const set = useCallback(
    (next: T | ((previous: T) => T)) => {
      const previous = snapshot(key, initial, parse);
      const resolved = typeof next === "function" ? (next as (previous: T) => T)(previous) : next;
      writeRaw(key, JSON.stringify(resolved));
    },
    [key, initial, parse],
  );
  return [value, set];
}

const noop = () => () => {};

/** False on the server and during hydration, true after. For anything that depends on the visitor's clock or time zone. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

/** The current time, refreshed while `active`. Null until the page has mounted. */
export function useNow(active: boolean, everyMs = 1000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, everyMs);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [active, everyMs]);
  return now;
}

/** A soft two-note chime made in code, the same one the planner's timer plays. */
export function chime() {
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

export type CountdownStatus = "idle" | "running" | "paused" | "done";

type CountdownState = { status: CountdownStatus; totalMs: number; leftMs: number; endsAt: number | null };

export type Countdown = {
  status: CountdownStatus;
  totalMs: number;
  leftMs: number;
  /** 0 at the start, 1 when time is up. */
  progress: number;
  start: () => void;
  pause: () => void;
  /** Back to the start, with a new length if one is given. */
  reset: (totalMs?: number) => void;
  /** Resets to a new length and starts at once. */
  restart: (totalMs: number) => void;
};

/**
 * A countdown that keeps time by the clock, so it stays right when the tab is
 * in the background and the browser slows its timers down. `onDone` runs once
 * each time it reaches zero, with `reset` and `restart` to set up what's next.
 */
export function useCountdown(initialMs: number, onDone?: (controls: Pick<Countdown, "reset" | "restart">) => void): Countdown {
  const [state, setState] = useState<CountdownState>({ status: "idle", totalMs: initialMs, leftMs: initialMs, endsAt: null });
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  const reset = useCallback((totalMs?: number) => {
    setState((s) => {
      const total = totalMs ?? s.totalMs;
      return { status: "idle", totalMs: total, leftMs: total, endsAt: null };
    });
  }, []);
  const restart = useCallback((totalMs: number) => {
    setState({ status: "running", totalMs, leftMs: totalMs, endsAt: Date.now() + totalMs });
  }, []);

  const { status, endsAt } = state;
  useEffect(() => {
    if (status !== "running" || endsAt === null) return;
    const tick = () => {
      const left = endsAt - Date.now();
      if (left <= 0) {
        setState((s) => ({ ...s, status: "done", leftMs: 0, endsAt: null }));
        done.current?.({ reset, restart });
      } else {
        setState((s) => (s.status === "running" ? { ...s, leftMs: left } : s));
      }
    };
    const id = setInterval(tick, 200);
    // A hidden tab's timers can stall, so catch up the moment it shows again.
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [status, endsAt, reset, restart]);

  const start = useCallback(() => {
    setState((s) => {
      if (s.status === "running") return s;
      const left = s.status === "done" || s.leftMs <= 0 ? s.totalMs : s.leftMs;
      return { ...s, status: "running", leftMs: left, endsAt: Date.now() + left };
    });
  }, []);
  const pause = useCallback(() => {
    setState((s) => (s.status === "running" && s.endsAt !== null ? { ...s, status: "paused", leftMs: Math.max(0, s.endsAt - Date.now()), endsAt: null } : s));
  }, []);
  const progress = state.totalMs > 0 ? 1 - state.leftMs / state.totalMs : 0;
  return { status: state.status, totalMs: state.totalMs, leftMs: state.leftMs, progress, start, pause, reset, restart };
}

/** Shows `text` in the browser tab while it's set, such as the time left on a timer, and puts the page's title back after. */
export function useTabTitle(text: string | null) {
  const original = useRef<string | null>(null);
  useEffect(() => {
    if (text === null) return;
    if (original.current === null) original.current = document.title;
    document.title = text;
    return () => {
      if (original.current !== null) document.title = original.current;
    };
  }, [text]);
}

/** Asks once for permission to show a notification when a timer ends. Does nothing where notifications don't exist. */
export function askToNotify() {
  try {
    if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission();
  } catch {}
}

/** A notification, shown only when the tab isn't the one being looked at and permission was given. */
export function notify(body: string) {
  try {
    if (document.visibilityState === "hidden" && "Notification" in window && Notification.permission === "granted") {
      new Notification("Beans", { body });
    }
  } catch {}
}

/** A short id for a new row in a list. Call it from an event handler, not while rendering. */
export function newId(): string {
  try {
    return crypto.randomUUID().slice(0, 8);
  } catch {
    return Math.random().toString(36).slice(2, 10);
  }
}

/** Copies text to the clipboard. Resolves to false where the browser won't allow it. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

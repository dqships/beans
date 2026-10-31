/** Formats minutes as `1:30` for chips. */
export function formatClock(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Formats minutes as `1h 30m`, `45m` or `2h`. */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Formats milliseconds as `mm:ss` or `h:mm:ss`. */
export function formatStopwatch(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Parses typed durations: `45`, `45m`, `1h`, `1h 30m`, `1.5h`, `1:30`, `90 min`.
 * Returns minutes, or `null` when the text isn't a duration.
 */
export function parseDuration(input: string): number | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;
  const clock = text.match(/^(\d{1,2}):(\d{2})$/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  if (/^\d+(\.\d+)?$/.test(text)) return Math.round(Number(text));
  const re = /(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)(?![a-z])/g;
  let total = 0;
  let matched = "";
  for (const m of text.matchAll(re)) {
    const value = Number(m[1]);
    total += m[2]!.startsWith("h") ? value * 60 : value;
    matched += m[0];
  }
  if (!matched) return null;
  const leftover = text.replace(re, "").replace(/\s+/g, "");
  if (leftover) return null;
  return Math.round(total);
}

/** Estimate choices offered in pickers, in minutes. */
export const ESTIMATE_PRESETS = [5, 10, 15, 20, 25, 30, 45, 60, 90, 120, 180, 240];

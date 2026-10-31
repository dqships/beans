import * as chrono from "chrono-node";
import { minutesToTime, utcToKey } from "./dates";
import { parseDuration } from "./duration";
import type { DateKey, Label, List, TimeKey } from "./model";

export interface CaptureToken {
  kind: "date" | "label" | "list" | "estimate";
  start: number;
  end: number;
  text: string;
}

export interface CaptureResult {
  title: string;
  date: DateKey | null;
  start: TimeKey | null;
  labelId: string | null;
  listId: string | null;
  estimate: number | null;
  tokens: CaptureToken[];
}

/**
 * Longest-name match after a sigil, so `#side project` finds a label named
 * "Side project" even though it has a space.
 */
function matchName<T extends { id: string; name: string }>(text: string, at: number, items: T[]): { item: T; length: number } | null {
  const rest = text.slice(at).toLowerCase();
  let best: { item: T; length: number } | null = null;
  for (const item of items) {
    const name = item.name.trim().toLowerCase();
    if (!name || !rest.startsWith(name)) continue;
    const next = rest.charAt(name.length);
    if (next && /[\p{L}\p{N}]/u.test(next)) continue;
    if (!best || name.length > best.length) best = { item, length: name.length };
  }
  return best;
}

/**
 * Parses Quick Capture text: natural dates and times ("tomorrow 3pm"),
 * `#label`, `@list` and `=45m` estimates. Whatever is left is the title.
 */
export function parseCapture(input: string, opts: { today: DateKey; labels: Label[]; lists: List[] }): CaptureResult {
  const tokens: CaptureToken[] = [];
  let labelId: string | null = null;
  let listId: string | null = null;
  let estimate: number | null = null;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const boundary = i === 0 || /\s/.test(input[i - 1]!);
    if (!boundary) continue;
    if (ch === "#" && labelId === null) {
      const m = matchName(input, i + 1, opts.labels);
      if (m) {
        labelId = m.item.id;
        tokens.push({ kind: "label", start: i, end: i + 1 + m.length, text: input.slice(i, i + 1 + m.length) });
      }
    } else if (ch === "@" && listId === null) {
      const m = matchName(input, i + 1, opts.lists);
      if (m) {
        listId = m.item.id;
        tokens.push({ kind: "list", start: i, end: i + 1 + m.length, text: input.slice(i, i + 1 + m.length) });
      }
    } else if (ch === "=" && estimate === null) {
      // Longest run of up to three words that reads as a duration: "=45m", "=1h 30m".
      const words = input.slice(i + 1).match(/^\S+(?:\s+\S+){0,2}/)?.[0].split(/\s+/) ?? [];
      for (let n = words.length; n > 0; n--) {
        const text = words.slice(0, n).join(" ");
        const parsed = parseDuration(text);
        if (parsed !== null) {
          estimate = parsed;
          const end = i + 1 + input.slice(i + 1).indexOf(words[n - 1]!) + words[n - 1]!.length;
          tokens.push({ kind: "estimate", start: i, end, text: input.slice(i, end) });
          break;
        }
      }
    }
  }

  // Dates are read from what's left, so a label like "#Monday prep" isn't taken as a date.
  const masked = tokens.reduce((s, t) => s.slice(0, t.start) + " ".repeat(t.end - t.start) + s.slice(t.end), input);
  const [y, mo, d] = opts.today.split("-").map(Number) as [number, number, number];
  const reference = new Date(y, mo - 1, d, 12, 0, 0);
  const results = chrono.parse(masked, { instant: reference, timezone: undefined }, { forwardDate: true });
  let date: DateKey | null = null;
  let start: TimeKey | null = null;
  const found = results[0];
  if (found) {
    const c = found.start;
    const local = new Date(c.get("year")!, c.get("month")! - 1, c.get("day")!);
    date = utcToKey(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));
    if (c.isCertain("hour")) start = minutesToTime((c.get("hour") ?? 0) * 60 + (c.get("minute") ?? 0));
    tokens.push({ kind: "date", start: found.index, end: found.index + found.text.length, text: found.text });
  }

  tokens.sort((a, b) => a.start - b.start);
  let title = "";
  let cursor = 0;
  for (const t of tokens) {
    title += input.slice(cursor, t.start);
    cursor = t.end;
  }
  title += input.slice(cursor);
  title = title.replace(/\s{2,}/g, " ").trim();

  return { title, date, start, labelId, listId, estimate, tokens };
}

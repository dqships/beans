/** The time card calculator's week: seven shifts, their hours, and pay if a rate is set. All pure. */

export type Shift = {
  /** Clock in, as `HH:MM` on a 24-hour clock, or "" when not filled in. */
  start: string;
  /** Clock out, the same way. Earlier than `start` means the shift ran past midnight. */
  end: string;
  /** Unpaid break, in minutes. */
  breakMin: number;
};

export type TimeCard = {
  name: string;
  /** The Monday the week starts on, as `YYYY-MM-DD`, or "". Only shown and printed. */
  week: string;
  /** Monday first. Always seven. */
  days: Shift[];
  /** Pay for one hour. 0 means no pay is worked out. */
  rate: number;
  overtime: boolean;
};

export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export const MAX_BREAK = 600;
export const MAX_RATE = 100_000;
/** Overtime starts after this many hours in the week, and pays this many times the rate. */
export const OVERTIME_AFTER_HOURS = 40;
export const OVERTIME_TIMES = 1.5;

const DAY_MINUTES = 24 * 60;
const EMPTY_SHIFT: Shift = { start: "", end: "", breakMin: 0 };

export const EMPTY_CARD: TimeCard = {
  name: "",
  week: "",
  days: DAY_NAMES.map(() => EMPTY_SHIFT),
  rate: 0,
  overtime: false,
};

/** `HH:MM` as minutes since midnight, or null for anything else. */
export function parseClock(text: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(text.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

const cleanBreak = (minutes: number) => (Number.isFinite(minutes) ? Math.min(MAX_BREAK, Math.max(0, Math.round(minutes))) : 0);

/**
 * Paid minutes in one shift: clock out minus clock in, less the break. Null
 * until both times are filled in. An out time before the in time is the next
 * day; the same time twice is no shift at all.
 */
export function shiftMinutes(shift: Shift): number | null {
  const start = parseClock(shift.start);
  const end = parseClock(shift.end);
  if (start === null || end === null) return null;
  const span = end >= start ? end - start : end + DAY_MINUTES - start;
  return Math.max(0, span - cleanBreak(shift.breakMin));
}

/** True when the shift's out time is on the day after its in time. */
export function isOvernight(shift: Shift): boolean {
  const start = parseClock(shift.start);
  const end = parseClock(shift.end);
  return start !== null && end !== null && end < start;
}

/** True when the break is as long as the shift or longer, so nothing is left to pay. */
export function breakSwallowsShift(shift: Shift): boolean {
  const start = parseClock(shift.start);
  const end = parseClock(shift.end);
  if (start === null || end === null || start === end) return false;
  const span = end > start ? end - start : end + DAY_MINUTES - start;
  return cleanBreak(shift.breakMin) >= span;
}

const toMoney = (amount: number) => Math.round(amount * 100) / 100;

export type WeekTotals = {
  /** One per day; null where the day isn't filled in. */
  dayMinutes: (number | null)[];
  totalMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  regularPay: number;
  overtimePay: number;
  grossPay: number;
};

export function weekTotals(card: TimeCard): WeekTotals {
  const dayMinutes = card.days.map(shiftMinutes);
  const totalMinutes = dayMinutes.reduce<number>((sum, minutes) => sum + (minutes ?? 0), 0);
  const limit = OVERTIME_AFTER_HOURS * 60;
  const overtimeMinutes = card.overtime ? Math.max(0, totalMinutes - limit) : 0;
  const regularMinutes = totalMinutes - overtimeMinutes;
  const rate = Number.isFinite(card.rate) ? Math.min(MAX_RATE, Math.max(0, card.rate)) : 0;
  const regularPay = toMoney((regularMinutes / 60) * rate);
  const overtimePay = toMoney((overtimeMinutes / 60) * rate * OVERTIME_TIMES);
  // The two parts are rounded first, so the lines on the card add up to the total.
  return { dayMinutes, totalMinutes, regularMinutes, overtimeMinutes, regularPay, overtimePay, grossPay: toMoney(regularPay + overtimePay) };
}

/** "8h 05m". Both parts always show, so a column of them lines up. */
export function formatHoursMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, "0")}m`;
}

/** Minutes as decimal hours with two places: 450 is "7.50". */
export function decimalHours(minutes: number): string {
  return (Math.max(0, minutes) / 60).toFixed(2);
}

const money = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** A plain amount with two decimals and no currency: "1,234.50". */
export function formatMoney(amount: number): string {
  return money.format(Number.isFinite(amount) ? amount : 0);
}

export function setShift(card: TimeCard, index: number, change: Partial<Shift>): TimeCard {
  return {
    ...card,
    days: card.days.map((shift, i) => {
      if (i !== index) return shift;
      const next = { ...shift, ...change };
      return { ...next, breakMin: cleanBreak(next.breakMin) };
    }),
  };
}

/** Puts Monday's times and break on Tuesday to Friday. The weekend is left alone. */
export function copyMondayToWeekdays(card: TimeCard): TimeCard {
  const monday = card.days[0];
  if (!monday) return card;
  return { ...card, days: card.days.map((shift, i) => (i >= 1 && i <= 4 ? { ...monday } : shift)) };
}

/** Empties the times and breaks. The name, the rate and the overtime choice stay. */
export function clearShifts(card: TimeCard): TimeCard {
  return { ...card, week: "", days: EMPTY_CARD.days };
}

export function hasAnyTime(card: TimeCard): boolean {
  return card.days.some((shift) => shift.start !== "" || shift.end !== "" || shift.breakMin > 0);
}

const isTimeOrEmpty = (value: unknown): value is string => typeof value === "string" && (value === "" || parseClock(value) !== null);

/** Checks a card read back from local storage. */
export function parseTimeCard(stored: unknown): TimeCard | null {
  if (!stored || typeof stored !== "object") return null;
  const { name, week, days, rate, overtime } = stored as Record<string, unknown>;
  if (typeof name !== "string" || typeof week !== "string" || !Array.isArray(days) || days.length !== DAY_NAMES.length) return null;
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate < 0 || rate > MAX_RATE || typeof overtime !== "boolean") return null;
  if (week !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(week)) return null;
  const parsed: Shift[] = [];
  for (const day of days) {
    if (!day || typeof day !== "object") return null;
    const { start, end, breakMin } = day as Record<string, unknown>;
    if (!isTimeOrEmpty(start) || !isTimeOrEmpty(end)) return null;
    if (typeof breakMin !== "number" || !Number.isFinite(breakMin) || breakMin < 0 || breakMin > MAX_BREAK) return null;
    parsed.push({ start, end, breakMin: Math.round(breakMin) });
  }
  return { name: name.slice(0, 80), week, days: parsed, rate, overtime };
}

import { describe, expect, it } from "vitest";
import { INITIAL_TIME_CALC, MAX_ROWS, addRow, clearRows, countFilled, dayOffsetText, parseTimeCalc, removeRow, rowSeconds, shiftClock, totalSeconds, updateRow, type ClockShift, type TimeCalc, type TimeRow } from "./time-calculator";

const row = (sign: TimeRow["sign"], hours: string, minutes: string, seconds = "", id = `${sign}-${hours}-${minutes}-${seconds}`): TimeRow => ({ id, sign, hours, minutes, seconds });
const shift = (time: string, sign: ClockShift["sign"], hours: string, minutes: string): ClockShift => ({ time, sign, hours, minutes });

describe("adding and subtracting time", () => {
  it("adds rows", () => {
    expect(totalSeconds([row("add", "1", "45"), row("add", "2", "30")])).toBe(4 * 3600 + 15 * 60);
    expect(totalSeconds([row("add", "", "50", "40"), row("add", "", "20", "30")])).toBe(3600 + 11 * 60 + 10);
  });

  it("subtracts rows", () => {
    expect(totalSeconds([row("add", "8", ""), row("subtract", "", "45")])).toBe(7 * 3600 + 15 * 60);
  });

  it("goes negative when more is subtracted than added", () => {
    expect(totalSeconds([row("add", "1", ""), row("subtract", "2", "30")])).toBe(-(3600 + 30 * 60));
    expect(totalSeconds([row("subtract", "", "", "1")])).toBe(-1);
  });

  it("carries minutes and seconds over 59", () => {
    expect(rowSeconds(row("add", "", "90"))).toBe(5400);
    expect(rowSeconds(row("add", "", "", "3600"))).toBe(3600);
  });

  it("reads blank rows as zero, never NaN or minus zero", () => {
    expect(totalSeconds(INITIAL_TIME_CALC.rows)).toBe(0);
    expect(Object.is(rowSeconds(row("subtract", "", "")), 0)).toBe(true);
    expect(totalSeconds([])).toBe(0);
    expect(countFilled([row("add", "", ""), row("add", "0", "0"), row("subtract", "", "5")])).toBe(1);
  });
});

describe("rows", () => {
  it("adds a blank row at the end, up to the limit", () => {
    const next = addRow(INITIAL_TIME_CALC, "third");
    expect(next.rows.map((r) => r.id)).toEqual(["first", "second", "third"]);
    expect(next.rows[2]).toEqual({ id: "third", sign: "add", hours: "", minutes: "", seconds: "" });
    let full: TimeCalc = INITIAL_TIME_CALC;
    for (let i = 0; i < MAX_ROWS + 5; i++) full = addRow(full, `row-${i}`);
    expect(full.rows).toHaveLength(MAX_ROWS);
  });

  it("removes a row but always leaves one", () => {
    const one = removeRow(INITIAL_TIME_CALC, "first");
    expect(one.rows.map((r) => r.id)).toEqual(["second"]);
    const typed = updateRow(one, "second", { hours: "3" });
    expect(removeRow(typed, "second").rows).toEqual([{ id: "second", sign: "add", hours: "", minutes: "", seconds: "" }]);
    expect(removeRow(typed, "missing")).toBe(typed);
  });

  it("changes one row and leaves the rest", () => {
    const next = updateRow(INITIAL_TIME_CALC, "second", { sign: "subtract", minutes: "15" });
    expect(next.rows[0]).toEqual(INITIAL_TIME_CALC.rows[0]);
    expect(next.rows[1]).toEqual({ id: "second", sign: "subtract", hours: "", minutes: "15", seconds: "" });
  });

  it("clears back to two blank rows", () => {
    const typed = updateRow(addRow(INITIAL_TIME_CALC, "third"), "first", { hours: "9" });
    expect(clearRows(typed).rows).toEqual(INITIAL_TIME_CALC.rows);
  });
});

describe("a clock time plus or minus a length", () => {
  it("stays on the same day", () => {
    expect(shiftClock(shift("09:00", "add", "2", "30"))).toEqual({ minutes: 11 * 60 + 30, dayOffset: 0 });
    expect(shiftClock(shift("17:15", "subtract", "8", "15"))).toEqual({ minutes: 9 * 60, dayOffset: 0 });
    expect(shiftClock(shift("09:00", "add", "", ""))).toEqual({ minutes: 540, dayOffset: 0 });
  });

  it("crosses midnight forwards", () => {
    expect(shiftClock(shift("22:00", "add", "3", "15"))).toEqual({ minutes: 75, dayOffset: 1 });
    expect(shiftClock(shift("23:59", "add", "", "1"))).toEqual({ minutes: 0, dayOffset: 1 });
    expect(shiftClock(shift("12:00", "add", "48", ""))).toEqual({ minutes: 720, dayOffset: 2 });
  });

  it("crosses midnight backwards", () => {
    expect(shiftClock(shift("01:00", "subtract", "2", ""))).toEqual({ minutes: 23 * 60, dayOffset: -1 });
    expect(shiftClock(shift("00:00", "subtract", "", "1"))).toEqual({ minutes: 1439, dayOffset: -1 });
    expect(shiftClock(shift("00:00", "subtract", "24", ""))).toEqual({ minutes: 0, dayOffset: -1 });
    expect(shiftClock(shift("06:00", "subtract", "54", ""))).toEqual({ minutes: 0, dayOffset: -2 });
  });

  it("has no answer without a start time", () => {
    expect(shiftClock(shift("", "add", "1", ""))).toBeNull();
    expect(shiftClock(shift("25:00", "add", "1", ""))).toBeNull();
  });

  it("names the day it lands on", () => {
    expect(dayOffsetText(0)).toBe("same day");
    expect(dayOffsetText(1)).toBe("next day");
    expect(dayOffsetText(-1)).toBe("previous day");
    expect(dayOffsetText(3)).toBe("3 days later");
    expect(dayOffsetText(-2)).toBe("2 days earlier");
  });
});

describe("stored time calculator", () => {
  it("accepts what it saved", () => {
    expect(parseTimeCalc(JSON.parse(JSON.stringify(INITIAL_TIME_CALC)))).toEqual(INITIAL_TIME_CALC);
    const typed: TimeCalc = { mode: "clock", rows: [row("subtract", "12", "5", "59", "a")], clock: shift("", "subtract", "1", "30") };
    expect(parseTimeCalc(JSON.parse(JSON.stringify(typed)))).toEqual(typed);
  });

  it("rejects anything else", () => {
    const base = JSON.parse(JSON.stringify(INITIAL_TIME_CALC)) as TimeCalc;
    expect(parseTimeCalc(null)).toBeNull();
    expect(parseTimeCalc({ ...base, mode: "sum" })).toBeNull();
    expect(parseTimeCalc({ ...base, rows: [] })).toBeNull();
    expect(parseTimeCalc({ ...base, rows: "none" })).toBeNull();
    expect(parseTimeCalc({ ...base, rows: [row("add", "1.5", "")] })).toBeNull();
    expect(parseTimeCalc({ ...base, rows: [row("add", "-1", "")] })).toBeNull();
    expect(parseTimeCalc({ ...base, rows: [row("add", "123456", "")] })).toBeNull();
    expect(parseTimeCalc({ ...base, rows: [{ ...row("add", "1", ""), sign: "times" }] })).toBeNull();
    expect(parseTimeCalc({ ...base, rows: [row("add", "1", "", "", "same"), row("add", "2", "", "", "same")] })).toBeNull();
    expect(parseTimeCalc({ ...base, rows: Array.from({ length: MAX_ROWS + 1 }, (_, i) => row("add", "1", "", "", `r${i}`)) })).toBeNull();
    expect(parseTimeCalc({ ...base, clock: { ...base.clock, time: "9am" } })).toBeNull();
    expect(parseTimeCalc({ ...base, clock: null })).toBeNull();
  });
});

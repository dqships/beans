import { describe, expect, it } from "vitest";
import { EMPTY_DAY_PLAN, MAX_LINE, clearPlan, hourLines, isBlank, isDateKey, longDate, parseDayPlan, setDate, setEndHour, setHourText, setStartHour, setTodoText, setTop, toggleTodo } from "./dayplan";

describe("daily planner page", () => {
  it("starts blank, with a line for each hour from 7 AM to 9 PM", () => {
    expect(hourLines(EMPTY_DAY_PLAN)).toEqual([7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
    expect(EMPTY_DAY_PLAN.top).toHaveLength(3);
    expect(EMPTY_DAY_PLAN.todos).toHaveLength(10);
    expect(isBlank(EMPTY_DAY_PLAN)).toBe(true);
  });

  it("keeps at least one hour, and the first hour never after the last", () => {
    expect(hourLines(setStartHour(EMPTY_DAY_PLAN, 22))).toEqual([22]);
    expect(hourLines(setEndHour(EMPTY_DAY_PLAN, 5))).toEqual([5]);
    expect(hourLines(setEndHour(setStartHour(EMPTY_DAY_PLAN, 0), 23))).toHaveLength(24);
    expect(hourLines(setStartHour(EMPTY_DAY_PLAN, -4))[0]).toBe(0);
    expect(hourLines(setEndHour(EMPTY_DAY_PLAN, 99)).at(-1)).toBe(23);
    expect(setStartHour(EMPTY_DAY_PLAN, Number.NaN).startHour).toBe(7);
    expect(hourLines({ startHour: 9, endHour: 3 })).toEqual([9]);
  });

  it("keeps an hour's text when the hours shown change", () => {
    const written = setHourText(EMPTY_DAY_PLAN, 7, "Walk the dog");
    const later = setStartHour(written, 9);
    expect(hourLines(later)[0]).toBe(9);
    expect(setStartHour(later, 7).schedule[7]).toBe("Walk the dog");
  });

  it("writes on the right line and ignores lines that don't exist", () => {
    const plan = toggleTodo(setTodoText(setTop(EMPTY_DAY_PLAN, 1, "Send the invoice"), 9, "Buy stamps"), 9);
    expect(plan.top).toEqual(["", "Send the invoice", ""]);
    expect(plan.todos[9]).toEqual({ text: "Buy stamps", done: true });
    expect(toggleTodo(plan, 9).todos[9]!.done).toBe(false);
    expect(setTop(plan, 3, "x")).toEqual(plan);
    expect(setTodoText(plan, 10, "x")).toBe(plan);
    expect(toggleTodo(plan, -1)).toBe(plan);
    expect(setHourText(plan, 24, "x")).toEqual(plan);
    expect(setTop(EMPTY_DAY_PLAN, 0, "a".repeat(500)).top[0]).toHaveLength(MAX_LINE);
    expect(isBlank(plan)).toBe(false);
  });

  it("accepts only real dates", () => {
    expect(isDateKey("2026-11-11")).toBe(true);
    expect(isDateKey("2024-02-29")).toBe(true);
    expect(isDateKey("2026-02-29")).toBe(false);
    expect(isDateKey("2026-04-31")).toBe(false);
    expect(isDateKey("2026-13-01")).toBe(false);
    expect(isDateKey("20261-01-01")).toBe(false);
    expect(isDateKey("0026-01-01")).toBe(false);
    expect(isDateKey("")).toBe(false);
    expect(setDate(EMPTY_DAY_PLAN, "2026-11-11").date).toBe("2026-11-11");
    expect(setDate(setDate(EMPTY_DAY_PLAN, "2026-11-11"), "").date).toBe("");
    expect(setDate(EMPTY_DAY_PLAN, "nope").date).toBe("");
  });

  it("writes the date out in full", () => {
    expect(longDate("2026-11-11")).toBe("Wednesday, November 11, 2026");
    expect(longDate("2024-02-29")).toBe("Thursday, February 29, 2024");
    expect(longDate("2027-01-01")).toBe("Friday, January 1, 2027");
    expect(longDate("")).toBe("");
    expect(longDate("2026-02-30")).toBe("");
  });

  it("clears what was written and keeps the hours", () => {
    const plan = setEndHour(setStartHour(setDate(setTop(EMPTY_DAY_PLAN, 0, "One"), "2026-11-11"), 5), 12);
    const cleared = clearPlan({ ...plan, notes: "Bring a coat" });
    expect(isBlank(cleared)).toBe(true);
    expect(hourLines(cleared)).toEqual([5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("reads back what it stored and rejects anything else", () => {
    const plan = toggleTodo(setTodoText(setHourText(setDate(EMPTY_DAY_PLAN, "2026-11-11"), 9, "Standup"), 0, "Email Sam"), 0);
    expect(parseDayPlan(JSON.parse(JSON.stringify(plan)))).toEqual(plan);
    expect(parseDayPlan(null)).toBeNull();
    expect(parseDayPlan("nope")).toBeNull();
    expect(parseDayPlan({ ...plan, date: "2026-02-30" })).toBeNull();
    expect(parseDayPlan({ ...plan, startHour: 22, endHour: 3 })).toBeNull();
    expect(parseDayPlan({ ...plan, startHour: 7.5 })).toBeNull();
    expect(parseDayPlan({ ...plan, top: ["a", "b"] })).toBeNull();
    expect(parseDayPlan({ ...plan, schedule: plan.schedule.slice(1) })).toBeNull();
    expect(parseDayPlan({ ...plan, todos: plan.todos.map((todo) => ({ ...todo, done: "yes" })) })).toBeNull();
    expect(parseDayPlan({ ...plan, notes: 4 })).toBeNull();
  });
});

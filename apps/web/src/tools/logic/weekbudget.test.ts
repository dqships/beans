import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROWS,
  HOURS_IN_WEEK,
  MAX_ROWS,
  MINUTES_IN_WEEK,
  ROW_COLORS,
  addRow,
  budget,
  changeRow,
  cleanHours,
  formatHours,
  formatShare,
  hoursText,
  nextColor,
  parseRows,
  removeRow,
  weekHours,
  type BudgetRow,
} from "./weekbudget";

const row = (id: string, hours: number, per: "day" | "week", color = 0): BudgetRow => ({ id, name: id, hours, per, color });

describe("the week", () => {
  it("has 168 hours and 10,080 minutes", () => {
    expect(HOURS_IN_WEEK).toBe(168);
    expect(MINUTES_IN_WEEK).toBe(10_080);
  });
});

describe("one row", () => {
  it("counts hours a day seven times and hours a week once", () => {
    expect(weekHours(row("sleep", 8, "day"))).toBe(56);
    expect(weekHours(row("work", 40, "week"))).toBe(40);
    expect(weekHours(row("meals", 1.5, "day"))).toBe(10.5);
    expect(weekHours(row("nothing", 0, "day"))).toBe(0);
  });

  it("holds hours between 0 and a full day or week", () => {
    expect(cleanHours(30, "day")).toBe(24);
    expect(cleanHours(200, "week")).toBe(168);
    expect(cleanHours(-3, "week")).toBe(0);
    expect(cleanHours(Number.NaN, "day")).toBe(0);
    expect(cleanHours(1.234, "day")).toBe(1.23);
    expect(weekHours(row("too much", 30, "day"))).toBe(168);
  });
});

describe("the budget", () => {
  it("adds up the starting rows", () => {
    const result = budget(DEFAULT_ROWS);
    // 56 sleep, 40 work, 5 commute, 10.5 meals, 7 chores, 3 exercise.
    expect(result.spoken).toBe(121.5);
    expect(result.left).toBe(46.5);
    expect(result.over).toBe(0);
    expect(result.rows.map((item) => item.hours)).toEqual([56, 40, 5, 10.5, 7, 3]);
    expect(result.rows[0]?.share).toBeCloseTo(1 / 3, 10);
  });

  it("fills the bar exactly: the rows and what's left make one whole", () => {
    const result = budget(DEFAULT_ROWS);
    const total = result.rows.reduce((sum, item) => sum + item.width, 0) + result.leftWidth;
    expect(total).toBeCloseTo(1, 10);
  });

  it("says how far over when the rows pass 168 hours", () => {
    const result = budget([row("sleep", 10, "day"), row("work", 80, "week"), row("games", 4, "day")]);
    expect(result.spoken).toBe(178);
    expect(result.left).toBe(0);
    expect(result.over).toBe(10);
    expect(result.leftWidth).toBe(0);
    // The bar still adds up to one whole, with every row squeezed to fit.
    expect(result.rows.reduce((sum, item) => sum + item.width, 0)).toBeCloseTo(1, 10);
    expect(result.rows[1]?.share).toBeCloseTo(80 / 168, 10);
  });

  it("is all free time with no rows, or rows of zero", () => {
    expect(budget([])).toEqual({ rows: [], spoken: 0, left: 168, over: 0, leftWidth: 1 });
    const zeros = budget([row("a", 0, "day"), row("b", 0, "week")]);
    expect(zeros.spoken).toBe(0);
    expect(zeros.rows.every((item) => item.width === 0 && item.share === 0)).toBe(true);
  });

  it("is exactly full at 168", () => {
    const result = budget([row("everything", 24, "day")]);
    expect(result.spoken).toBe(168);
    expect(result.left).toBe(0);
    expect(result.over).toBe(0);
  });

  it("doesn't pick up rounding noise from decimals", () => {
    const result = budget([row("a", 0.1, "day"), row("b", 0.2, "day")]);
    expect(result.spoken).toBe(2.1);
    expect(result.left).toBe(165.9);
  });
});

describe("formats", () => {
  it("writes hours without trailing zeros", () => {
    expect(formatHours(56)).toBe("56");
    expect(formatHours(10.5)).toBe("10.5");
    expect(formatHours(46.25)).toBe("46.25");
    expect(formatHours(Number.NaN)).toBe("0");
    expect(hoursText(1)).toBe("1 hour");
    expect(hoursText(46.5)).toBe("46.5 hours");
    expect(hoursText(0)).toBe("0 hours");
  });

  it("writes a share of the week", () => {
    expect(formatShare(56 / 168)).toBe("33.3%");
    expect(formatShare(0)).toBe("0%");
    expect(formatShare(1)).toBe("100%");
    expect(formatShare(40 / 168)).toBe("23.8%");
  });
});

describe("changing rows", () => {
  it("adds a row with a color no other row has", () => {
    const rows = addRow(DEFAULT_ROWS, "new");
    expect(rows.length).toBe(DEFAULT_ROWS.length + 1);
    expect(rows[rows.length - 1]).toEqual({ id: "new", name: "", hours: 1, per: "week", color: 6 });
    expect(nextColor([])).toBe(0);
  });

  it("reuses the least used color once all eight are taken", () => {
    const eight = ROW_COLORS.map((_, color) => row(`r${color}`, 1, "week", color));
    expect(nextColor(eight)).toBe(0);
    expect(nextColor([...eight, row("extra", 1, "week", 0)])).toBe(1);
  });

  it("stops adding at the limit", () => {
    let rows: BudgetRow[] = [];
    for (let i = 0; i < MAX_ROWS + 5; i += 1) rows = addRow(rows, `r${i}`);
    expect(rows.length).toBe(MAX_ROWS);
  });

  it("removes a row", () => {
    expect(removeRow(DEFAULT_ROWS, "work").map((item) => item.id)).toEqual(["sleep", "commute", "meals", "chores", "exercise"]);
    expect(removeRow(DEFAULT_ROWS, "missing")).toEqual(DEFAULT_ROWS);
  });

  it("changes a row and holds its hours to the limit", () => {
    expect(changeRow(DEFAULT_ROWS, "sleep", { hours: 7.5 })[0]?.hours).toBe(7.5);
    expect(changeRow(DEFAULT_ROWS, "sleep", { hours: 99 })[0]?.hours).toBe(24);
    // 40 hours a week can't be 40 hours a day.
    expect(changeRow(DEFAULT_ROWS, "work", { per: "day" })[1]).toMatchObject({ hours: 24, per: "day" });
    expect(changeRow(DEFAULT_ROWS, "work", { name: "x".repeat(100) })[1]?.name.length).toBe(40);
  });
});

describe("stored rows", () => {
  it("accepts what it saved, including no rows at all", () => {
    expect(parseRows(JSON.parse(JSON.stringify(DEFAULT_ROWS)))).toEqual(DEFAULT_ROWS);
    expect(parseRows([])).toEqual([]);
  });

  it("rejects anything else", () => {
    expect(parseRows(null)).toBeNull();
    expect(parseRows({ rows: [] })).toBeNull();
    expect(parseRows([{ id: "a", name: "A", hours: "8", per: "day", color: 0 }])).toBeNull();
    expect(parseRows([{ id: "a", name: "A", hours: 30, per: "day", color: 0 }])).toBeNull();
    expect(parseRows([{ id: "a", name: "A", hours: 8, per: "month", color: 0 }])).toBeNull();
    expect(parseRows([{ id: "a", name: "A", hours: 8, per: "day", color: 8 }])).toBeNull();
    expect(parseRows([row("a", 1, "day"), row("a", 2, "day")])).toBeNull();
    expect(parseRows(Array.from({ length: MAX_ROWS + 1 }, (_, i) => row(`r${i}`, 1, "week")))).toBeNull();
  });
});

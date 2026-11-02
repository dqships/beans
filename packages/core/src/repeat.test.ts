import { describe, expect, it } from "vitest";
import { applyOps } from "./ops";
import { sampleState } from "./sample";
import {
  describeRule, deleteInstance, ensureInstances, formatRule, makeRepeating, occurrences, parseRule,
  repeatPresets, stopRepeating, updateAllIncomplete, deleteSeries,
} from "./repeat";
import { liveTasks } from "./tasks";

const TODAY = "2026-10-31"; // Saturday
const NOW = Date.UTC(2026, 9, 31, 12);

describe("repeat rules", () => {
  it("round-trips rule text", () => {
    const text = "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;UNTIL=20261231T235959Z";
    expect(formatRule(parseRule(text))).toBe(text);
  });
  it("describes rules in plain words", () => {
    expect(describeRule("FREQ=DAILY")).toBe("Every day");
    expect(describeRule("FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR")).toBe("Every weekday");
    expect(describeRule("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE")).toBe("Every 2 weeks on Mon, Wed");
    expect(describeRule("FREQ=MONTHLY;BYMONTHDAY=31")).toBe("Every month on the 31st");
    expect(describeRule("FREQ=DAILY;COUNT=3")).toBe("Every day, 3 times");
  });
  it("offers presets for the task's day", () => {
    const presets = repeatPresets(TODAY);
    expect(presets.find((p) => p.id === "weekly")!.rule).toBe("FREQ=WEEKLY;BYDAY=SA");
    expect(presets.find((p) => p.id === "monthly")!.label).toBe("Every month on the 31st");
  });
  it("lists occurrences in a range, honoring skips and the end", () => {
    const series = { rule: "FREQ=DAILY", startDate: TODAY, endDate: "2026-11-04", skipped: ["2026-11-02"] };
    expect(occurrences(series, "2026-10-30", "2026-11-10")).toEqual(["2026-10-31", "2026-11-01", "2026-11-03"]);
  });
  it("handles weekdays and month ends", () => {
    expect(occurrences({ rule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR", startDate: TODAY, endDate: null, skipped: [] }, TODAY, "2026-11-04")).toEqual([
      "2026-11-02", "2026-11-03", "2026-11-04",
    ]);
    // Months without a 31st are skipped, as RFC 5545 says.
    expect(occurrences({ rule: "FREQ=MONTHLY;BYMONTHDAY=31", startDate: TODAY, endDate: null, skipped: [] }, TODAY, "2027-01-31")).toEqual([
      "2026-10-31", "2026-12-31", "2027-01-31",
    ]);
  });
});

describe("repeating tasks", () => {
  const setup = () => {
    let s = sampleState(TODAY, "UTC", NOW);
    s = applyOps(s, makeRepeating(s, "task-today-3", "FREQ=DAILY", TODAY, null, NOW), NOW);
    return s;
  };

  it("makes instances once per series and date", () => {
    let s = setup();
    const ops = ensureInstances(s, TODAY, "2026-11-03", NOW);
    expect(ops.filter((o) => o.kind === "put")).toHaveLength(3);
    s = applyOps(s, ops, NOW);
    expect(ensureInstances(s, TODAY, "2026-11-03", NOW)).toHaveLength(0);
    const titles = liveTasks(s).filter((t) => t.title === "Water the seedlings").map((t) => t.date).sort();
    expect(titles).toEqual(["2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03"]);
  });

  it("stops repeating without leaving any sign of the repeat", () => {
    let s = setup();
    s = applyOps(s, ensureInstances(s, TODAY, "2026-11-05", NOW), NOW);
    s = applyOps(s, stopRepeating(s, "task-today-3", NOW), NOW);
    const task = s.tasks["task-today-3"]!;
    expect(task.seriesId).toBeNull();
    expect(liveTasks(s).filter((t) => t.title === "Water the seedlings")).toHaveLength(1);
    expect(ensureInstances(s, TODAY, "2026-11-30", NOW)).toHaveLength(0);
  });

  it("skips a deleted instance for good", () => {
    let s = setup();
    s = applyOps(s, ensureInstances(s, TODAY, "2026-11-02", NOW), NOW);
    const tomorrow = liveTasks(s).find((t) => t.seriesDate === "2026-11-01")!;
    s = applyOps(s, deleteInstance(s, tomorrow.id, NOW), NOW);
    expect(ensureInstances(s, TODAY, "2026-11-02", NOW)).toHaveLength(0);
  });

  it("updates every incomplete instance to match", () => {
    let s = setup();
    s = applyOps(s, ensureInstances(s, TODAY, "2026-11-02", NOW), NOW);
    s = applyOps(s, [{ kind: "patch", table: "tasks", id: "task-today-3", fields: { title: "Water the beans", estimate: 15 } }], NOW);
    s = applyOps(s, updateAllIncomplete(s, "task-today-3"), NOW);
    const inst = liveTasks(s).filter((t) => t.seriesId === s.tasks["task-today-3"]!.seriesId);
    expect(inst.every((t) => t.title === "Water the beans" && t.estimate === 15)).toBe(true);
  });

  it("deletes a whole series", () => {
    let s = setup();
    s = applyOps(s, ensureInstances(s, TODAY, "2026-11-02", NOW), NOW);
    const seriesId = s.tasks["task-today-3"]!.seriesId!;
    s = applyOps(s, deleteSeries(s, seriesId), NOW);
    expect(Object.values(s.tasks).some((t) => t.seriesId === seriesId)).toBe(false);
  });
});

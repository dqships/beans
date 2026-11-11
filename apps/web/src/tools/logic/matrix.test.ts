import { describe, expect, it } from "vitest";
import { EMPTY_MATRIX, MAX_TASKS, QUADRANTS, addTask, clearDone, countDone, isFull, moveTask, parseMatrix, quadrantFor, removeTask, renameTask, tasksIn, toggleTask, type Matrix } from "./matrix";

const matrix: Matrix = [
  ["do", "File the tax return"],
  ["do", "Call the landlord back"],
  ["schedule", "Plan the garden beds"],
  ["delegate", "Book the meeting room"],
  ["drop", "Reorganize old bookmarks"],
].reduce((current, [quadrant, text], i) => addTask(current, quadrant as "do", text!, `t${i}`), EMPTY_MATRIX);

describe("eisenhower matrix", () => {
  it("has the four quadrants in reading order, one for each answer to the two questions", () => {
    expect(QUADRANTS.map((quadrant) => quadrant.id)).toEqual(["do", "schedule", "delegate", "drop"]);
    expect(quadrantFor(true, true)).toBe("do");
    expect(quadrantFor(false, true)).toBe("schedule");
    expect(quadrantFor(true, false)).toBe("delegate");
    expect(quadrantFor(false, false)).toBe("drop");
  });

  it("adds a task to its quadrant, trimmed, and ignores blanks", () => {
    expect(tasksIn(matrix, "do").map((task) => task.text)).toEqual(["File the tax return", "Call the landlord back"]);
    expect(tasksIn(matrix, "drop")).toHaveLength(1);
    expect(addTask(matrix, "do", "   ", "x")).toBe(matrix);
    expect(addTask(EMPTY_MATRIX, "schedule", "  two   spaces ", "x").tasks[0]).toEqual({ id: "x", text: "two spaces", done: false, quadrant: "schedule" });
  });

  it("moves a task to the end of another quadrant", () => {
    const moved = moveTask(matrix, "t0", "schedule");
    expect(tasksIn(moved, "schedule").map((task) => task.id)).toEqual(["t2", "t0"]);
    expect(tasksIn(moved, "do").map((task) => task.id)).toEqual(["t1"]);
    expect(moveTask(matrix, "t0", "do")).toBe(matrix);
    expect(moveTask(matrix, "missing", "drop")).toBe(matrix);
  });

  it("holds 50 tasks in a quadrant and no more", () => {
    const full = Array.from({ length: MAX_TASKS + 3 }, (_, i) => i).reduce((current, i) => addTask(current, "drop", `Task ${i}`, `d${i}`), EMPTY_MATRIX);
    expect(tasksIn(full, "drop")).toHaveLength(MAX_TASKS);
    expect(isFull(full, "drop")).toBe(true);
    expect(isFull(full, "do")).toBe(false);
    const withOne = addTask(full, "do", "Stay put", "x");
    expect(moveTask(withOne, "x", "drop")).toBe(withOne);
    expect(tasksIn(moveTask(withOne, "d0", "do"), "do")).toHaveLength(2);
  });

  it("checks off, counts and clears finished tasks", () => {
    const one = toggleTask(matrix, "t3");
    expect(countDone(one)).toEqual({ done: 1, total: 5 });
    expect(tasksIn(clearDone(one), "delegate")).toHaveLength(0);
    expect(clearDone(one).tasks).toHaveLength(4);
    expect(toggleTask(one, "t3")).toEqual(matrix);
    expect(countDone(EMPTY_MATRIX)).toEqual({ done: 0, total: 0 });
  });

  it("renames, and removes a task whose text is emptied", () => {
    expect(renameTask(matrix, "t2", "Plan the herb beds").tasks[2]!.text).toBe("Plan the herb beds");
    expect(renameTask(matrix, "t2", " ").tasks).toHaveLength(4);
    expect(removeTask(matrix, "t4").tasks).toHaveLength(4);
  });

  it("reads back what it stored and rejects anything else", () => {
    const saved = toggleTask(matrix, "t1");
    expect(parseMatrix(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
    expect(parseMatrix({ tasks: [] })).toEqual(EMPTY_MATRIX);
    expect(parseMatrix(undefined)).toBeNull();
    expect(parseMatrix({ tasks: "none" })).toBeNull();
    expect(parseMatrix({ tasks: [{ id: "a", text: "x", done: false, quadrant: "someday" }] })).toBeNull();
    expect(parseMatrix({ tasks: [{ id: "a", text: "x", done: 0, quadrant: "do" }] })).toBeNull();
    expect(parseMatrix({ tasks: [{ id: "a", text: " ", done: false, quadrant: "do" }] })).toBeNull();
    expect(
      parseMatrix({
        tasks: [
          { id: "a", text: "x", done: false, quadrant: "do" },
          { id: "a", text: "y", done: false, quadrant: "drop" },
        ],
      }),
    ).toBeNull();
  });
});

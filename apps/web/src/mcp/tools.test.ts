import { describe, expect, it } from "vitest";
import { annotations, TOOLS } from "./tools";

describe("MCP tools", () => {
  it("has the 19 tools in the plan", () => {
    expect(TOOLS.map((t) => t.name)).toEqual([
      "get_overview",
      "get_day",
      "get_week",
      "list_tasks",
      "search_tasks",
      "get_task",
      "get_analytics",
      "create_tasks",
      "update_task",
      "update_subtasks",
      "set_done",
      "move_tasks",
      "timebox_task",
      "set_repeat",
      "log_time",
      "create_list",
      "create_label",
      "delete_tasks",
      "restore_tasks",
    ]);
  });

  it("sets a title and all three hints on every tool", () => {
    for (const t of TOOLS) {
      const a = annotations(t);
      expect(t.name.length).toBeLessThan(64);
      expect(a.title).toBeTruthy();
      expect(a).toEqual({ title: t.title, readOnlyHint: t.readOnly, destructiveHint: !t.readOnly, openWorldHint: false });
    }
    expect(TOOLS.filter((t) => t.readOnly).map((t) => t.name)).toEqual(TOOLS.slice(0, 7).map((t) => t.name));
  });

  it("describes what each tool does, without steering the AI to other tools", () => {
    const names = TOOLS.map((t) => t.name);
    for (const t of TOOLS) {
      expect(t.description.length).toBeGreaterThan(30);
      for (const other of names) expect(t.description, `${t.name} mentions ${other}`).not.toContain(other);
      expect(t.description).not.toMatch(/\b(always|must|never|you should|call )\b/i);
    }
  });

  it("maps snake_case inputs to the Convex function's arguments", () => {
    const list = TOOLS.find((t) => t.name === "list_tasks")!;
    expect(list.args(list.input.parse({ brain_dump: true, due_by: "2026-11-05" }))).toEqual({ brainDump: true, dueBy: "2026-11-05" });
    const repeat = TOOLS.find((t) => t.name === "set_repeat")!;
    expect(repeat.args(repeat.input.parse({ id: "t", repeat: { every: "month", day_of_month: 15 } }))).toEqual({ id: "t", repeat: { every: "month", dayOfMonth: 15 } });
    expect(repeat.args(repeat.input.parse({ id: "t", repeat: null }))).toEqual({ id: "t", repeat: null });
  });

  it("rejects bad input before it reaches Beans", () => {
    const create = TOOLS.find((t) => t.name === "create_tasks")!;
    expect(create.input.safeParse({ tasks: [] }).success).toBe(false);
    expect(create.input.safeParse({ tasks: [{ title: "x", date: "Nov 5" }] }).success).toBe(false);
    expect(create.input.safeParse({ tasks: Array.from({ length: 51 }, () => ({ title: "x" })) }).success).toBe(false);
    expect(create.input.safeParse({ tasks: [{ title: "x", start: "09:30", date: "2026-11-05" }] }).success).toBe(true);
  });
});

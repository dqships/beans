import { describe, expect, it } from "vitest";
import { EMPTY_TODO, addItem, clearDone, countDone, listAsText, moveItem, parseTodoList, removeItem, renameItem, toggleItem } from "./todo";

const three = ["Call the dentist", "Pay rent", "Water the seedlings"].reduce((list, text, i) => addItem(list, text, `t${i}`), EMPTY_TODO);

describe("to-do list", () => {
  it("adds tasks at the end, trimmed, and ignores blanks", () => {
    expect(three.items.map((item) => item.text)).toEqual(["Call the dentist", "Pay rent", "Water the seedlings"]);
    expect(addItem(three, "   ", "x")).toBe(three);
    expect(addItem(EMPTY_TODO, "  two   spaces  ", "x").items[0]!.text).toBe("two spaces");
  });

  it("checks off, counts and clears finished tasks", () => {
    const one = toggleItem(three, "t1");
    expect(countDone(one)).toEqual({ done: 1, total: 3 });
    expect(clearDone(one).items.map((item) => item.id)).toEqual(["t0", "t2"]);
    expect(toggleItem(one, "t1")).toEqual(three);
  });

  it("renames, and removes a task whose text is emptied", () => {
    expect(renameItem(three, "t0", "Call the vet").items[0]!.text).toBe("Call the vet");
    expect(renameItem(three, "t0", " ").items).toHaveLength(2);
    expect(removeItem(three, "t2").items).toHaveLength(2);
  });

  it("moves a task one place and stops at the ends", () => {
    expect(moveItem(three, "t2", -1).items.map((item) => item.id)).toEqual(["t0", "t2", "t1"]);
    expect(moveItem(three, "t0", -1)).toBe(three);
    expect(moveItem(three, "t2", 1)).toBe(three);
  });

  it("writes the list as text", () => {
    expect(listAsText({ ...toggleItem(three, "t1"), title: "Tuesday" })).toBe("Tuesday\n[ ] Call the dentist\n[x] Pay rent\n[ ] Water the seedlings");
  });

  it("reads back what it stored and rejects anything else", () => {
    expect(parseTodoList(JSON.parse(JSON.stringify(three)))).toEqual(three);
    expect(parseTodoList({ title: "x", items: [{ id: 1, text: "a", done: false }] })).toBeNull();
    expect(parseTodoList("nope")).toBeNull();
  });
});

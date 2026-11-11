import { describe, expect, it } from "vitest";
import { EMPTY_DUMP, MAX_TEXT, MAX_THOUGHTS, addThoughts, countPlaces, dumpAsText, moveThought, parseDump, placeName, removeThought, renameThought, splitThoughts, thoughtsIn, type Dump } from "./braindump";

const dump = (...lines: string[]): Dump =>
  addThoughts(
    EMPTY_DUMP,
    lines,
    lines.map((_, i) => `t${i}`),
  );

const four = dump("Renew passport", "Call the plumber", "Learn to juggle", "Reply to Dana");

describe("brain dump", () => {
  it("adds a thought to the end of the pile", () => {
    expect(four.items.map((thought) => thought.text)).toEqual(["Renew passport", "Call the plumber", "Learn to juggle", "Reply to Dana"]);
    expect(four.items.every((thought) => thought.place === "pile")).toBe(true);
    expect(addThoughts(four, ["   "], ["x"])).toBe(four);
    expect(addThoughts(four, [], [])).toBe(four);
  });

  it("splits a pasted list into one thought per line", () => {
    expect(splitThoughts("Buy milk\n\n  Book the dentist  \r\nFix   the gate\rPay rent")).toEqual(["Buy milk", "Book the dentist", "Fix the gate", "Pay rent"]);
    expect(splitThoughts("- Buy milk\n* Book the dentist\n• Fix the gate\n1. Pay rent\n2) Water plants\n- [ ] Call Sam\n[x] Send card")).toEqual([
      "Buy milk",
      "Book the dentist",
      "Fix the gate",
      "Pay rent",
      "Water plants",
      "Call Sam",
      "Send card",
    ]);
    expect(splitThoughts("")).toEqual([]);
    expect(splitThoughts(" \n \n")).toEqual([]);
    expect(splitThoughts("-")).toEqual(["-"]);
    expect(splitThoughts("3 eggs")).toEqual(["3 eggs"]);
    expect(splitThoughts("a".repeat(MAX_TEXT + 50))[0]).toHaveLength(MAX_TEXT);
  });

  it("stops adding when the pile is full", () => {
    const lines = Array.from({ length: MAX_THOUGHTS + 20 }, (_, i) => `Thought ${i}`);
    const full = addThoughts(
      EMPTY_DUMP,
      lines,
      lines.map((_, i) => `f${i}`),
    );
    expect(full.items).toHaveLength(MAX_THOUGHTS);
    expect(addThoughts(full, ["One more"], ["x"])).toBe(full);
  });

  it("sorts thoughts into groups, moves them again and sends them back", () => {
    const sorted = moveThought(moveThought(four, "t1", "today"), "t3", "today");
    expect(thoughtsIn(sorted, "today").map((thought) => thought.text)).toEqual(["Call the plumber", "Reply to Dana"]);
    expect(thoughtsIn(sorted, "pile").map((thought) => thought.id)).toEqual(["t0", "t2"]);
    expect(countPlaces(sorted)).toEqual({ pile: 2, today: 2, week: 0, later: 0, letgo: 0 });

    const again = moveThought(sorted, "t1", "letgo");
    expect(countPlaces(again)).toEqual({ pile: 2, today: 1, week: 0, later: 0, letgo: 1 });

    const back = moveThought(again, "t1", "pile");
    expect(thoughtsIn(back, "pile").map((thought) => thought.id)).toEqual(["t0", "t2", "t1"]);
    expect(moveThought(back, "t1", "pile")).toBe(back);
    expect(moveThought(back, "missing", "today")).toBe(back);
  });

  it("renames and deletes", () => {
    expect(renameThought(four, "t0", "  Renew   my passport ").items[0]!.text).toBe("Renew my passport");
    expect(renameThought(four, "t0", "- keeps a dash typed on purpose").items[0]!.text).toBe("- keeps a dash typed on purpose");
    expect(renameThought(four, "t0", "  ").items).toHaveLength(3);
    expect(removeThought(four, "t2").items.map((thought) => thought.id)).toEqual(["t0", "t1", "t3"]);
    expect(removeThought(four, "missing").items).toHaveLength(4);
  });

  it("writes the dump as text, grouped under headings", () => {
    const sorted = moveThought(moveThought(moveThought(four, "t1", "today"), "t0", "week"), "t2", "letgo");
    expect(dumpAsText(sorted)).toBe("Today\n- Call the plumber\n\nThis week\n- Renew passport\n\nLet go\n- Learn to juggle\n\nNot sorted yet\n- Reply to Dana");
    expect(dumpAsText(EMPTY_DUMP)).toBe("");
    expect(placeName("letgo")).toBe("Let go");
    expect(placeName("pile")).toBe("The pile");
  });

  it("reads back what it stored and rejects anything else", () => {
    const sorted = moveThought(four, "t1", "later");
    expect(parseDump(JSON.parse(JSON.stringify(sorted)))).toEqual(sorted);
    expect(parseDump({ items: [] })).toEqual(EMPTY_DUMP);
    expect(parseDump(null)).toBeNull();
    expect(parseDump([])).toBeNull();
    expect(parseDump({ items: [{ id: "a", text: "x", place: "someday" }] })).toBeNull();
    expect(parseDump({ items: [{ id: "a", text: "", place: "pile" }] })).toBeNull();
    expect(parseDump({ items: [{ id: 1, text: "x", place: "pile" }] })).toBeNull();
    expect(
      parseDump({
        items: [
          { id: "a", text: "x", place: "pile" },
          { id: "a", text: "y", place: "pile" },
        ],
      }),
    ).toBeNull();
  });
});

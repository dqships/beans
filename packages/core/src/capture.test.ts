import { describe, expect, it } from "vitest";
import { parseCapture } from "./capture";
import { sampleState } from "./sample";
import { liveLabels } from "./tasks";
import { liveLists } from "./collections";

const TODAY = "2026-10-31"; // Saturday
const s = sampleState(TODAY, "UTC", Date.UTC(2026, 9, 31, 12));
const opts = { today: TODAY, labels: liveLabels(s), lists: liveLists(s) };

describe("quick capture", () => {
  it("reads dates, times, labels, lists and estimates", () => {
    const r = parseCapture("Call mum tomorrow at 3pm #home =30m", opts);
    expect(r).toMatchObject({ title: "Call mum", date: "2026-11-01", start: "15:00", labelId: "label-home", estimate: 30 });
  });
  it("matches multi-word labels", () => {
    const r = parseCapture("Draft the pitch #side project next monday", opts);
    expect(r.labelId).toBe("label-side");
    expect(r.date).toBe("2026-11-02");
    expect(r.title).toBe("Draft the pitch");
  });
  it("puts a task in a list", () => {
    const r = parseCapture("Order compost @garden =1h 30m", opts);
    expect(r).toMatchObject({ title: "Order compost", listId: "list-garden", estimate: 90, date: null });
  });
  it("leaves unknown tags in the title", () => {
    const r = parseCapture("Read about #nothing", opts);
    expect(r.title).toBe("Read about #nothing");
    expect(r.labelId).toBeNull();
  });
  it("prefers the longest label name", () => {
    const labels = [...opts.labels, { ...opts.labels[0]!, id: "label-side-x", name: "Side" }];
    expect(parseCapture("Plan #side project", { ...opts, labels }).labelId).toBe("label-side");
  });
});

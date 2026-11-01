import { describe, expect, it } from "vitest";
import { ONBOARDED, ONBOARDING_STEPS, currentStep, onboardingStart, plannedDay, stepFrom, taskIdeas, timeboxHours } from "./onboarding";
import { sampleState } from "./sample";
import { defaultSettings } from "./settings";
import type { Label } from "./model";

const label = (name: string): Label => ({ id: `id-${name}`, name, color: "rain", order: 0, createdAt: 0, updatedAt: 0, deletedAt: null });

describe("onboarding state", () => {
  it("starts new accounts on the first step", () => {
    expect(defaultSettings("UTC").onboarding).toEqual({ status: "active", step: ONBOARDING_STEPS[0], day: null });
  });

  it("leaves sample data out of it", () => {
    expect(sampleState("2026-11-01").settings.onboarding).toEqual(ONBOARDED);
  });

  it("walks the steps in order and stops at both ends", () => {
    expect(stepFrom("labels", -1)).toBeNull();
    expect(stepFrom("labels", 1)).toBe("dump");
    expect(stepFrom("planted", -1)).toBe("timebox");
    expect(stepFrom("planted", 1)).toBeNull();
  });

  it("restarts from the first step when a saved step no longer exists", () => {
    expect(currentStep({ status: "active", step: "removed", day: null })).toBe("labels");
    expect(currentStep({ status: "active", step: "choose", day: null })).toBe("choose");
  });

  it("plans today until a later day is chosen, and treats a passed day as today", () => {
    const active = onboardingStart();
    expect(plannedDay(active, "2026-11-01")).toBe("2026-11-01");
    expect(plannedDay({ status: "active", step: "choose", day: "2026-11-02" }, "2026-11-01")).toBe("2026-11-02");
    expect(plannedDay({ status: "active", step: "choose", day: "2026-11-02" }, "2026-11-03")).toBe("2026-11-03");
  });
});

describe("taskIdeas", () => {
  it("takes turns between the picked labels and carries their ids", () => {
    const ideas = taskIdeas([label("Home"), label("Health")], [], 4);
    expect(ideas.map((i) => i.labelId)).toEqual(["id-Home", "id-Health", "id-Home", "id-Health"]);
  });

  it("drops ideas already added, ignoring case", () => {
    const ideas = taskIdeas([label("Home")], ["do a LOAD of laundry"]);
    expect(ideas.map((i) => i.title)).toEqual(["Fix the leaky tap", "Clean out the fridge"]);
  });

  it("still offers ideas with no labels picked", () => {
    const ideas = taskIdeas([], [], 3);
    expect(ideas).toHaveLength(3);
    expect(ideas.every((i) => i.labelId === null)).toBe(true);
  });
});

describe("timeboxHours", () => {
  it("offers a full day for tomorrow", () => {
    const hours = timeboxHours("2026-11-02", "2026-11-01", 20 * 60);
    expect(hours[0]).toBe("07:00");
    expect(hours.at(-1)).toBe("22:00");
  });

  it("offers only hours still to come today", () => {
    expect(timeboxHours("2026-11-01", "2026-11-01", 9 * 60 + 30)[0]).toBe("10:00");
    expect(timeboxHours("2026-11-01", "2026-11-01", 3 * 60)[0]).toBe("07:00");
  });

  it("has nothing left late at night", () => {
    expect(timeboxHours("2026-11-01", "2026-11-01", 22 * 60 + 5)).toEqual([]);
  });
});

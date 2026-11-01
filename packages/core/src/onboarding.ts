import { minutesToTime } from "./dates";
import type { DateKey, Label, Onboarding, TimeKey } from "./model";

/** The steps in order. Adding a step means adding its id here and its screen in `Onboarding.tsx`. */
export const ONBOARDING_STEPS = ["labels", "dump", "choose", "timebox", "planted"] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** What a new account starts with. */
export function onboardingStart(): Onboarding {
  return { status: "active", step: ONBOARDING_STEPS[0], day: null };
}

/** Accounts that never need onboarding: sample data, and accounts made before it existed. */
export const ONBOARDED: Onboarding = { status: "finished", at: 0 };

/** The step to show. An id this build doesn't know goes back to the start. */
export function currentStep(onboarding: Onboarding): OnboardingStep {
  if (onboarding.status !== "active") return ONBOARDING_STEPS[0];
  return ONBOARDING_STEPS.find((s) => s === onboarding.step) ?? ONBOARDING_STEPS[0];
}

/** The step `by` places away, or `null` past either end. */
export function stepFrom(step: OnboardingStep, by: 1 | -1): OnboardingStep | null {
  return ONBOARDING_STEPS[ONBOARDING_STEPS.indexOf(step) + by] ?? null;
}

/** The day being planned. A day that has passed counts as today, because its tasks rolled over. */
export function plannedDay(onboarding: Onboarding, today: DateKey): DateKey {
  const day = onboarding.status === "active" ? onboarding.day : null;
  return day && day > today ? day : today;
}

export interface PlanArea {
  name: string;
  /** One of the label color tokens. */
  color: string;
  ideas: string[];
}

/** Parts of life offered on the first step. Each one picked becomes a real label. */
export const PLAN_AREAS: PlanArea[] = [
  { name: "Work", color: "rain", ideas: ["Reply to the emails I've been avoiding", "Prep for my next meeting", "Finish the report"] },
  { name: "Home", color: "pumpkin", ideas: ["Do a load of laundry", "Fix the leaky tap", "Clean out the fridge"] },
  { name: "School", color: "corn", ideas: ["Read the next chapter", "Outline the essay", "Go over my notes"] },
  { name: "Health", color: "sprout", ideas: ["Go for a walk", "Refill my prescription", "Book a checkup"] },
  { name: "Family", color: "beet", ideas: ["Call home", "Plan a family dinner", "Sign the school forms"] },
  { name: "Money", color: "soil", ideas: ["Pay the bills", "Cancel a subscription I don't use", "Set a budget for the month"] },
  { name: "Side project", color: "plum", ideas: ["Write down the next step", "Block out an hour to build", "Share an update"] },
  { name: "Errands", color: "tomato", ideas: ["Buy groceries", "Return the package", "Drop off the dry cleaning"] },
];

export interface TaskIdea {
  title: string;
  labelId: string | null;
}

/**
 * Task ideas for the labels picked so far, taking turns between them so one
 * label doesn't fill the list. With no labels picked, it draws from every area.
 */
export function taskIdeas(labels: Label[], takenTitles: string[], limit = 6): TaskIdea[] {
  const taken = new Set(takenTitles.map((t) => t.trim().toLowerCase()));
  const sources = PLAN_AREAS.map((area) => ({ area, label: labels.find((l) => l.name === area.name) ?? null }));
  const picked = sources.filter((s) => s.label);
  const pool = (picked.length ? picked : sources).map(({ area, label }) => ({
    labelId: label?.id ?? null,
    ideas: area.ideas.filter((idea) => !taken.has(idea.toLowerCase())),
  }));
  const out: TaskIdea[] = [];
  for (let round = 0; out.length < limit && pool.some((p) => p.ideas[round]); round++) {
    for (const { ideas, labelId } of pool) {
      const title = ideas[round];
      if (title && out.length < limit) out.push({ title, labelId });
    }
  }
  return out;
}

/** Earliest and latest start hours offered on the Timebox step. */
const FIRST_HOUR = 7;
const LAST_HOUR = 22;

/** Whole hours to offer on the Timebox step. Today only offers hours still to come. */
export function timeboxHours(day: DateKey, today: DateKey, minutesNow: number): TimeKey[] {
  const nextHour = day > today ? FIRST_HOUR : Math.max(FIRST_HOUR, Math.floor(minutesNow / 60) + 1);
  const hours: TimeKey[] = [];
  for (let h = nextHour; h <= LAST_HOUR; h++) hours.push(minutesToTime(h * 60));
  return hours;
}

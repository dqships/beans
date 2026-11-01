import { addDays } from "./dates";
import { ONBOARDED } from "./onboarding";
import { applyOps, emptyState, put, type Op } from "./ops";
import type { BeansState, DateKey, Label, List } from "./model";
import { defaultSettings } from "./settings";
import { baseTask, newSubtask } from "./tasks";

/**
 * Builds a believable planner around `today` for the sample-data build and
 * tests. Ids are stable so tests can refer to them.
 */
export function sampleState(today: DateKey, timeZone = "UTC", now = Date.now()): BeansState {
  const base = emptyState({ ...defaultSettings(timeZone, now), onboarding: ONBOARDED });
  const ops: Op[] = [];
  const record = { createdAt: now, updatedAt: now, deletedAt: null };

  const labels: Label[] = [
    { ...record, id: "label-work", name: "Work", color: "rain", order: 0 },
    { ...record, id: "label-home", name: "Home", color: "pumpkin", order: 1 },
    { ...record, id: "label-health", name: "Health", color: "sprout", order: 2 },
    { ...record, id: "label-side", name: "Side project", color: "plum", order: 3 },
  ];
  labels.forEach((l) => ops.push(put("labels", l)));

  const lists: List[] = [
    { ...record, id: "list-reading", name: "Reading", icon: "📚", autoLabelId: null, order: 0 },
    { ...record, id: "list-garden", name: "Garden", icon: "🌱", autoLabelId: "label-home", order: 1 },
  ];
  lists.forEach((l) => ops.push(put("lists", l)));

  type Seed = Partial<ReturnType<typeof baseTask>> & { id: string; title: string; subtasks?: [string, boolean][] };
  const seeds: Seed[] = [
    { id: "task-dump-1", title: "Book a dentist appointment", labelId: "label-health", order: 0 },
    { id: "task-dump-2", title: "Find a birthday gift for Sam", order: 1 },
    { id: "task-dump-3", title: "Look into a standing desk", estimate: 20, order: 2 },
    { id: "task-list-1", title: "Finish the essay collection", listId: "list-reading", order: 0 },
    { id: "task-list-2", title: "Order runner bean seeds", listId: "list-garden", labelId: "label-home", estimate: 10, order: 0 },
    { id: "task-today-1", title: "Write the weekly update", date: today, labelId: "label-work", estimate: 30, start: "09:00", order: 0 },
    {
      id: "task-today-2",
      title: "Review launch plan",
      date: today,
      labelId: "label-work",
      estimate: 45,
      priority: "high",
      dueDate: addDays(today, 1),
      notes: "<p>Check the timeline against the design review.</p>",
      order: 1,
      subtasks: [
        ["Read the draft", true],
        ["Leave comments", false],
      ],
    },
    { id: "task-today-3", title: "Water the seedlings", date: today, labelId: "label-home", estimate: 10, order: 2 },
    { id: "task-today-4", title: "Morning walk", date: today, labelId: "label-health", estimate: 30, order: 3, done: true, completedAt: now, actual: 35 },
    { id: "task-tomorrow-1", title: "Call the bank about the card", date: addDays(today, 1), estimate: 15, order: 0 },
    { id: "task-tomorrow-2", title: "Sketch the onboarding flow", date: addDays(today, 1), labelId: "label-side", estimate: 90, order: 1 },
    { id: "task-later-1", title: "Plan the weekend trip", date: addDays(today, 2), labelId: "label-home", estimate: 60, order: 0 },
    { id: "task-past-1", title: "Send the invoice", date: addDays(today, -1), labelId: "label-work", estimate: 15, order: 0, done: true, completedAt: now - 86_400_000, actual: 20 },
  ];
  for (const seed of seeds) {
    const { subtasks, ...fields } = seed;
    ops.push(put("tasks", { ...baseTask(seed.id, now), ...fields }));
    subtasks?.forEach(([title, done], i) => {
      ops.push(put("subtasks", { ...newSubtask(seed.id, title, i, now), id: `${seed.id}-sub-${i}`, done }));
    });
  }
  return applyOps(base, ops, now);
}

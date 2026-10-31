import { newId } from "./ids";
import { orderAtBottom } from "./order";
import { patch, put, remove, type Op } from "./ops";
import type { BeansState, Label, List, Priority, Template } from "./model";
import { createTask, liveTasks, subtasksFor, type NewTaskInput } from "./tasks";

export function liveLists(state: BeansState): List[] {
  return Object.values(state.lists)
    .filter((l) => l.deletedAt === null)
    .sort((a, b) => a.order - b.order);
}

export function liveTemplates(state: BeansState): Template[] {
  return Object.values(state.templates)
    .filter((t) => t.deletedAt === null)
    .sort((a, b) => a.order - b.order);
}

export function createList(state: BeansState, input: { name: string; icon: string; autoLabelId?: string | null }, now = Date.now()): { id: string; ops: Op[] } {
  const list: List = {
    id: newId(now),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    name: input.name.trim() || "Untitled list",
    icon: input.icon,
    autoLabelId: input.autoLabelId ?? null,
    order: orderAtBottom(liveLists(state).map((l) => l.order)),
  };
  return { id: list.id, ops: [put("lists", list)] };
}

/** Moves a list and its tasks to Trash together, so restoring brings both back. */
export function deleteList(state: BeansState, id: string, now = Date.now()): Op[] {
  const ops: Op[] = [patch("lists", id, { deletedAt: now })];
  for (const t of liveTasks(state)) {
    if (t.date === null && t.listId === id) ops.push(patch("tasks", t.id, { deletedAt: now }));
  }
  return ops;
}

export function restoreList(state: BeansState, id: string): Op[] {
  const list = state.lists[id];
  if (!list || list.deletedAt === null) return [];
  const ops: Op[] = [patch("lists", id, { deletedAt: null })];
  for (const t of Object.values(state.tasks)) {
    if (t.listId === id && t.date === null && t.deletedAt === list.deletedAt) {
      ops.push(patch("tasks", t.id, { deletedAt: null }));
    }
  }
  return ops;
}

export function createLabel(state: BeansState, input: { name: string; color: string }, now = Date.now()): { id: string; ops: Op[] } {
  const label: Label = {
    id: newId(now),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    name: input.name.trim(),
    color: input.color,
    order: orderAtBottom(Object.values(state.labels).map((l) => l.order)),
  };
  return { id: label.id, ops: [put("labels", label)] };
}

/** Removes a label and clears it from tasks, lists and templates. */
export function deleteLabel(state: BeansState, id: string, now = Date.now()): Op[] {
  const ops: Op[] = [patch("labels", id, { deletedAt: now })];
  for (const t of Object.values(state.tasks)) if (t.labelId === id) ops.push(patch("tasks", t.id, { labelId: null }));
  for (const l of Object.values(state.lists)) if (l.autoLabelId === id) ops.push(patch("lists", l.id, { autoLabelId: null }));
  for (const t of Object.values(state.templates)) if (t.labelId === id) ops.push(patch("templates", t.id, { labelId: null }));
  return ops;
}

export interface TemplateInput {
  title: string;
  notes?: string;
  estimate?: number | null;
  priority?: Priority | null;
  labelId?: string | null;
  subtasks?: string[];
}

export function createTemplate(state: BeansState, input: TemplateInput, now = Date.now()): { id: string; ops: Op[] } {
  const template: Template = {
    id: newId(now),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    title: input.title.trim(),
    notes: input.notes ?? "",
    estimate: input.estimate ?? null,
    priority: input.priority ?? null,
    labelId: input.labelId ?? null,
    subtasks: input.subtasks ?? [],
    order: orderAtBottom(liveTemplates(state).map((t) => t.order)),
  };
  return { id: template.id, ops: [put("templates", template)] };
}

/** Saves a task as a template. Dates, actual time, completion and repeats are left out. */
export function templateFromTask(state: BeansState, taskId: string, now = Date.now()): { id: string; ops: Op[] } {
  const task = state.tasks[taskId];
  if (!task) return { id: "", ops: [] };
  return createTemplate(
    state,
    {
      title: task.title,
      notes: task.notes,
      estimate: task.estimate,
      priority: task.priority,
      labelId: task.labelId,
      subtasks: subtasksFor(state, taskId).map((s) => s.title),
    },
    now,
  );
}

export function taskFromTemplate(
  state: BeansState,
  templateId: string,
  target: Pick<NewTaskInput, "date" | "listId" | "start" | "position">,
  now = Date.now(),
): { id: string; ops: Op[] } {
  const t = state.templates[templateId];
  if (!t) return { id: "", ops: [] };
  return createTask(
    state,
    {
      ...target,
      title: t.title,
      notes: t.notes,
      estimate: t.estimate,
      priority: t.priority,
      labelId: t.labelId,
      subtasks: t.subtasks,
    },
    now,
  );
}

export function purge(table: "tasks" | "lists", id: string): Op[] {
  return [remove(table, id)];
}

/** The to-do list tool's list, and every change you can make to it. All pure: each returns a new list. */

export type TodoItem = { id: string; text: string; done: boolean };

export type TodoList = { title: string; items: TodoItem[] };

export const EMPTY_TODO: TodoList = { title: "", items: [] };

export const MAX_ITEMS = 200;
const MAX_TEXT = 300;

const clean = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);

/** Adds a task at the end. Blank text and a full list change nothing. */
export function addItem(list: TodoList, text: string, id: string): TodoList {
  const cleaned = clean(text);
  if (!cleaned || list.items.length >= MAX_ITEMS) return list;
  return { ...list, items: [...list.items, { id, text: cleaned, done: false }] };
}

export function toggleItem(list: TodoList, id: string): TodoList {
  return { ...list, items: list.items.map((item) => (item.id === id ? { ...item, done: !item.done } : item)) };
}

/** Renames a task. Emptying its text removes it. */
export function renameItem(list: TodoList, id: string, text: string): TodoList {
  const cleaned = clean(text);
  if (!cleaned) return removeItem(list, id);
  return { ...list, items: list.items.map((item) => (item.id === id ? { ...item, text: cleaned } : item)) };
}

export function removeItem(list: TodoList, id: string): TodoList {
  return { ...list, items: list.items.filter((item) => item.id !== id) };
}

/** Moves a task up (-1) or down (1) one place. */
export function moveItem(list: TodoList, id: string, delta: -1 | 1): TodoList {
  const from = list.items.findIndex((item) => item.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= list.items.length) return list;
  const items = [...list.items];
  [items[from], items[to]] = [items[to]!, items[from]!];
  return { ...list, items };
}

export function clearDone(list: TodoList): TodoList {
  return { ...list, items: list.items.filter((item) => !item.done) };
}

export function countDone(list: TodoList): { done: number; total: number } {
  return { done: list.items.filter((item) => item.done).length, total: list.items.length };
}

/** The list as plain text, for the clipboard: a title line, then one `[ ]` or `[x]` line per task. */
export function listAsText(list: TodoList): string {
  const lines = list.items.map((item) => `[${item.done ? "x" : " "}] ${item.text}`);
  return [list.title.trim(), ...lines].filter(Boolean).join("\n");
}

/** Checks a list read back from local storage. */
export function parseTodoList(stored: unknown): TodoList | null {
  if (!stored || typeof stored !== "object") return null;
  const { title, items } = stored as Record<string, unknown>;
  if (typeof title !== "string" || !Array.isArray(items)) return null;
  const parsed: TodoItem[] = [];
  for (const item of items.slice(0, MAX_ITEMS)) {
    if (!item || typeof item !== "object") return null;
    const { id, text, done } = item as Record<string, unknown>;
    if (typeof id !== "string" || typeof text !== "string" || typeof done !== "boolean") return null;
    parsed.push({ id, text: text.slice(0, MAX_TEXT), done });
  }
  return { title: title.slice(0, 120), items: parsed };
}

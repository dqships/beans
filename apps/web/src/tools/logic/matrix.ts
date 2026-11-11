/** The Eisenhower matrix: tasks in four quadrants, by whether each is urgent and whether it's important. All pure. */

export const QUADRANTS = [
  { id: "do", name: "Do first", about: "Urgent and important", urgent: true, important: true },
  { id: "schedule", name: "Schedule", about: "Important, not urgent", urgent: false, important: true },
  { id: "delegate", name: "Delegate", about: "Urgent, not important", urgent: true, important: false },
  { id: "drop", name: "Drop", about: "Not urgent, not important", urgent: false, important: false },
] as const;

export type QuadrantId = (typeof QUADRANTS)[number]["id"];

export type MatrixTask = { id: string; text: string; done: boolean; quadrant: QuadrantId };

export type Matrix = { tasks: MatrixTask[] };

export const EMPTY_MATRIX: Matrix = { tasks: [] };

/** Per quadrant. */
export const MAX_TASKS = 50;
export const MAX_TEXT = 300;

const IDS: readonly QuadrantId[] = QUADRANTS.map((quadrant) => quadrant.id);

const clean = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);

/** The quadrant a task belongs in, from the two questions the matrix asks. */
export function quadrantFor(urgent: boolean, important: boolean): QuadrantId {
  return QUADRANTS.find((quadrant) => quadrant.urgent === urgent && quadrant.important === important)!.id;
}

export function tasksIn(matrix: Matrix, quadrant: QuadrantId): MatrixTask[] {
  return matrix.tasks.filter((task) => task.quadrant === quadrant);
}

export function isFull(matrix: Matrix, quadrant: QuadrantId): boolean {
  return tasksIn(matrix, quadrant).length >= MAX_TASKS;
}

/** Adds a task at the end of a quadrant. Blank text and a full quadrant change nothing. */
export function addTask(matrix: Matrix, quadrant: QuadrantId, text: string, id: string): Matrix {
  const cleaned = clean(text);
  if (!cleaned || isFull(matrix, quadrant)) return matrix;
  return { tasks: [...matrix.tasks, { id, text: cleaned, done: false, quadrant }] };
}

export function toggleTask(matrix: Matrix, id: string): Matrix {
  return { tasks: matrix.tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task)) };
}

/** Moves a task to the end of another quadrant. A full quadrant takes no more. */
export function moveTask(matrix: Matrix, id: string, quadrant: QuadrantId): Matrix {
  const task = matrix.tasks.find((candidate) => candidate.id === id);
  if (!task || task.quadrant === quadrant || isFull(matrix, quadrant)) return matrix;
  return { tasks: [...matrix.tasks.filter((candidate) => candidate.id !== id), { ...task, quadrant }] };
}

/** Renames a task. Emptying its text removes it. */
export function renameTask(matrix: Matrix, id: string, text: string): Matrix {
  const cleaned = clean(text);
  if (!cleaned) return removeTask(matrix, id);
  return { tasks: matrix.tasks.map((task) => (task.id === id ? { ...task, text: cleaned } : task)) };
}

export function removeTask(matrix: Matrix, id: string): Matrix {
  return { tasks: matrix.tasks.filter((task) => task.id !== id) };
}

export function clearDone(matrix: Matrix): Matrix {
  return { tasks: matrix.tasks.filter((task) => !task.done) };
}

export function countDone(matrix: Matrix): { done: number; total: number } {
  return { done: matrix.tasks.filter((task) => task.done).length, total: matrix.tasks.length };
}

/** Checks a matrix read back from local storage. */
export function parseMatrix(stored: unknown): Matrix | null {
  if (!stored || typeof stored !== "object") return null;
  const { tasks } = stored as Record<string, unknown>;
  if (!Array.isArray(tasks) || tasks.length > MAX_TASKS * QUADRANTS.length) return null;
  const parsed: MatrixTask[] = [];
  const seen = new Set<string>();
  for (const task of tasks) {
    if (!task || typeof task !== "object") return null;
    const { id, text, done, quadrant } = task as Record<string, unknown>;
    if (typeof id !== "string" || typeof text !== "string" || !text.trim() || typeof done !== "boolean" || !IDS.includes(quadrant as QuadrantId) || seen.has(id)) return null;
    seen.add(id);
    parsed.push({ id, text: text.slice(0, MAX_TEXT), done, quadrant: quadrant as QuadrantId });
  }
  return { tasks: parsed };
}

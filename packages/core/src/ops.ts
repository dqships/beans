import type { BeansState, RecordOf, Settings, TableName } from "./model";

/**
 * Every change to Beans data is a list of small ops. The same ops update the
 * local copy instantly and are sent to the server, which keeps optimistic
 * updates, undo and a future offline outbox on one path.
 */
export type Op =
  | { kind: "put"; table: TableName; record: RecordOf<TableName> }
  | { kind: "patch"; table: TableName; id: string; fields: Record<string, unknown> }
  | { kind: "remove"; table: TableName; id: string }
  | { kind: "settings"; fields: Partial<Omit<Settings, "id">> };

export function put<T extends TableName>(table: T, record: RecordOf<T>): Op {
  return { kind: "put", table, record };
}

export function patch<T extends TableName>(
  table: T,
  id: string,
  fields: Partial<Omit<RecordOf<T>, "id" | "createdAt">>,
): Op {
  return { kind: "patch", table, id, fields: fields as Record<string, unknown> };
}

export function remove(table: TableName, id: string): Op {
  return { kind: "remove", table, id };
}

export function settingsOp(fields: Partial<Omit<Settings, "id">>): Op {
  return { kind: "settings", fields };
}

/** Applies ops to a state copy. Unknown ids in patches are ignored. */
export function applyOps(state: BeansState, ops: Op[], now: number = Date.now()): BeansState {
  const next: BeansState = { ...state };
  const touched = new Set<TableName>();
  const table = (name: TableName) => {
    if (!touched.has(name)) {
      touched.add(name);
      (next as unknown as Record<string, unknown>)[name] = { ...state[name] };
    }
    return next[name] as Record<string, RecordOf<TableName>>;
  };
  for (const op of ops) {
    switch (op.kind) {
      case "put":
        table(op.table)[op.record.id] = op.record;
        break;
      case "patch": {
        const rows = table(op.table);
        const current = rows[op.id];
        if (current) rows[op.id] = { ...current, ...op.fields, updatedAt: now } as RecordOf<TableName>;
        break;
      }
      case "remove":
        delete table(op.table)[op.id];
        break;
      case "settings":
        next.settings = { ...next.settings, ...op.fields, updatedAt: now };
        break;
    }
  }
  return next;
}

/** Ops that undo `ops` when applied after them. */
export function invertOps(state: BeansState, ops: Op[]): Op[] {
  const inverse: Op[] = [];
  let working = state;
  for (const op of ops) {
    switch (op.kind) {
      case "put": {
        const prev = working[op.table][op.record.id];
        inverse.unshift(prev ? { kind: "put", table: op.table, record: prev } : remove(op.table, op.record.id));
        break;
      }
      case "patch": {
        const prev = working[op.table][op.id] as unknown as Record<string, unknown> | undefined;
        if (prev) {
          const fields: Record<string, unknown> = {};
          for (const key of Object.keys(op.fields)) fields[key] = prev[key] ?? null;
          inverse.unshift({ kind: "patch", table: op.table, id: op.id, fields });
        }
        break;
      }
      case "remove": {
        const prev = working[op.table][op.id];
        if (prev) inverse.unshift({ kind: "put", table: op.table, record: prev });
        break;
      }
      case "settings": {
        const fields: Record<string, unknown> = {};
        for (const key of Object.keys(op.fields)) {
          fields[key] = (working.settings as unknown as Record<string, unknown>)[key];
        }
        inverse.unshift({ kind: "settings", fields: fields as Partial<Settings> });
        break;
      }
    }
    working = applyOps(working, [op]);
  }
  return inverse;
}

export function emptyState(settings: Settings): BeansState {
  return {
    tasks: {},
    subtasks: {},
    lists: {},
    labels: {},
    templates: {},
    series: {},
    timeEntries: {},
    settings,
  };
}

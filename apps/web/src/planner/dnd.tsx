"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { minutesToTime, snapMinutes, type DateKey, type Task, type TimeKey } from "@beans/core";
import { useActions, useSettings, useTask, useTemplates } from "@/data/hooks";
import { tokenPx } from "@/ui/token";
import { TaskCard } from "./TaskCard";
import { TemplateCard } from "./TemplateCard";
import { useUi } from "./ui-state";
import styles from "./board.module.css";

/** Where something can be dropped. */
export type DropTarget =
  | { kind: "day"; date: DateKey }
  | { kind: "list"; listId: string | null }
  | { kind: "timebox"; date: DateKey; startHour: number; hourPx: number; snap: number };

type DragItem = { kind: "task"; taskId: string; container: string } | { kind: "template"; templateId: string };

interface DragState {
  active: DragItem | null;
  /** Live timebox preview while dragging over a calendar. */
  preview: { date: DateKey; start: TimeKey; minutes: number } | null;
  /** Container and index for the insertion line in other containers. */
  insertion: { container: string; index: number } | null;
}

const DragStateContext = createContext<DragState>({ active: null, preview: null, insertion: null });

export function useDragState() {
  return useContext(DragStateContext);
}

export function containerId(target: DropTarget): string {
  if (target.kind === "day") return `day:${target.date}`;
  if (target.kind === "list") return `list:${target.listId ?? "brain"}`;
  return `timebox:${target.date}`;
}

const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const timebox = hits.find((h) => String(h.id).startsWith("timebox:"));
  if (timebox) return [timebox];
  const month = hits.find((h) => String(h.id).startsWith("month:"));
  if (month) return [month];
  const container = hits.find((h) => /^(day|list):/.test(String(h.id)));
  if (!container) return hits.filter((h) => String(h.id).startsWith("task:")).slice(0, 1);
  const inside = args.droppableContainers.filter((d) => d.data.current?.container === container.id);
  if (!inside.length) return [container];
  const closest = closestCenter({ ...args, droppableContainers: inside });
  return closest.length ? closest : [container];
};

export function PlannerDnd({ children }: { children: ReactNode }) {
  const actions = useActions();
  const ui = useUi();
  const templates = useTemplates();
  const [active, setActive] = useState<DragItem | null>(null);
  const [preview, setPreview] = useState<DragState["preview"]>(null);
  const [insertion, setInsertion] = useState<DragState["insertion"]>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const activeTask = useTask(active?.kind === "task" ? active.taskId : null);
  const activeTemplate = active?.kind === "template" ? templates.find((t) => t.id === active.templateId) : undefined;

  useEffect(() => {
    if (!active) return;
    const onMove = (e: PointerEvent | TouchEvent) => {
      const p = "touches" in e ? e.touches[0] : e;
      if (p) pointer.current = { x: p.clientX, y: p.clientY };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("touchmove", onMove);
    };
  }, [active]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const minutesFor = useCallback(
    (item: DragItem | null) => {
      if (!item) return 30;
      if (item.kind === "template") {
        const t = templates.find((x) => x.id === item.templateId);
        return t?.estimate ?? 30;
      }
      return activeTask?.estimate ?? 30;
    },
    [templates, activeTask],
  );

  /** Time under the pointer for a timebox drop, snapped to the user's step. */
  const timeAt = (rect: { top: number }, data: Extract<DropTarget, { kind: "timebox" }>) => {
    const y = pointer.current.y - rect.top;
    const minutes = data.startHour * 60 + (y / data.hourPx) * 60;
    const snapped = Math.max(0, Math.min(24 * 60 - data.snap, snapMinutes(minutes, data.snap)));
    return minutesToTime(snapped);
  };

  const onStart = (e: DragStartEvent) => {
    const data = e.active.data.current as DragItem | undefined;
    if (!data) return;
    const ev = e.activatorEvent as PointerEvent | TouchEvent;
    const p = "touches" in ev ? ev.touches[0] : ev;
    if (p && "clientX" in p) pointer.current = { x: p.clientX, y: p.clientY };
    setActive(data);
  };

  const onMove = (e: DragMoveEvent) => {
    const over = e.over;
    const target = over?.data.current as (DropTarget & { container?: string; index?: number }) | undefined;
    if (over && target?.kind === "timebox") {
      setPreview({ date: target.date, start: timeAt(over.rect, target), minutes: minutesFor(active) });
      setInsertion(null);
      return;
    }
    setPreview(null);
    if (!over) {
      setInsertion(null);
      return;
    }
    const overId = String(over.id);
    if (overId.startsWith("task:")) {
      const sameContainer = active?.kind === "task" && active.container === target?.container;
      if (sameContainer) {
        setInsertion(null);
      } else {
        const below = pointer.current.y > over.rect.top + over.rect.height / 2;
        setInsertion({ container: target!.container!, index: (target!.index ?? 0) + (below ? 1 : 0) });
      }
    } else {
      const sameContainer = active?.kind === "task" && active.container === overId;
      setInsertion(sameContainer ? null : { container: overId, index: -1 });
    }
  };

  const reset = () => {
    setActive(null);
    setPreview(null);
    setInsertion(null);
  };

  const onEnd = (e: DragEndEvent) => {
    const over = e.over;
    const item = active;
    const lastInsertion = insertion;
    reset();
    if (!over || !item) return;
    const data = over.data.current as (DropTarget & { container?: string; index?: number; taskId?: string }) | undefined;
    if (!data) return;

    // Work out the destination and index.
    let dest: DropTarget;
    let index: number | undefined;
    if (String(over.id).startsWith("task:")) {
      const container = data.container!;
      dest = container.startsWith("day:")
        ? { kind: "day", date: container.slice(4) }
        : { kind: "list", listId: container.slice(5) === "brain" ? null : container.slice(5) };
      if (item.kind === "task" && item.container === container) {
        index = data.index;
      } else {
        index = lastInsertion?.container === container ? lastInsertion.index : data.index;
      }
    } else {
      dest = data;
      index = data.kind === "timebox" ? undefined : lastInsertion && lastInsertion.index >= 0 ? lastInsertion.index : undefined;
    }

    const start = dest.kind === "timebox" ? timeAt(over.rect, dest) : undefined;
    const date = dest.kind === "list" ? null : dest.date;
    const listId = dest.kind === "list" ? dest.listId : null;

    if (item.kind === "template") {
      actions.useTemplate(item.templateId, { date, listId, start: start ?? null });
      ui.toast("Task added from template");
      return;
    }
    const ids = ui.selection.includes(item.taskId) && ui.selection.length > 1 ? ui.selection : [item.taskId];
    if (ids.length > 1) {
      const undo = actions.moveTasks(ids, { date, listId, start: start ?? null });
      ui.toast(`Moved ${ids.length} tasks`, undo);
      ui.setSelection([]);
      return;
    }
    if (index === undefined && dest.kind !== "timebox") {
      // Dropped on empty space in a container: place it after the untimed tasks.
      index = Number.MAX_SAFE_INTEGER;
    }
    actions.moveTask(item.taskId, { date, listId, index, start: start ?? null });
  };

  const state = useMemo(() => ({ active, preview, insertion }), [active, preview, insertion]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onStart}
      onDragMove={onMove}
      onDragOver={onMove}
      onDragEnd={onEnd}
      onDragCancel={reset}
      accessibility={{
        screenReaderInstructions: {
          draggable: "To pick up a task, press Space or Enter. Use the arrow keys to move it, then press Space or Enter to drop it, or Escape to cancel.",
        },
      }}
    >
      <DragStateContext.Provider value={state}>{children}</DragStateContext.Provider>
      <DragOverlay dropAnimation={null} zIndex={tokenPx("--z-drag")}>
        {activeTask ? (
          <div className={styles.overlayWrap}>
            <TaskCard task={activeTask} overlay />
            {ui.selection.length > 1 && ui.selection.includes(activeTask.id) ? (
              <span className={styles.overlayCount}>{ui.selection.length}</span>
            ) : null}
          </div>
        ) : activeTemplate ? (
          <TemplateCard template={activeTemplate} overlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/** A container that takes drops and sorts its tasks. */
export function TaskDropZone({
  target,
  tasks,
  children,
  className,
}: {
  target: Exclude<DropTarget, { kind: "timebox" }>;
  tasks: Task[];
  children: ReactNode;
  className?: string;
}) {
  const id = containerId(target);
  const { setNodeRef, isOver } = useDroppable({ id, data: target });
  const items = useMemo(() => tasks.map((t) => `task:${t.id}` as UniqueIdentifier), [tasks]);
  const { insertion } = useDragState();
  return (
    <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
      <div
        ref={setNodeRef}
        className={`${className ?? ""} ${isOver ? styles.dropActive : ""}`}
        data-drop={id}
      >
        {children}
        {insertion?.container === id && insertion.index < 0 ? <div className={styles.insertLine} /> : null}
      </div>
    </SortableContext>
  );
}

/** A task card that can be dragged and sorted. */
export function SortableTask({ task, container, index }: { task: Task; container: string; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task:${task.id}`,
    data: { kind: "task", taskId: task.id, container, index },
  });
  const { insertion } = useDragState();
  return (
    <>
      {insertion?.container === container && insertion.index === index ? <div className={styles.insertLine} /> : null}
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Translate.toString(transform), transition }}
        className={isDragging ? styles.dragSource : undefined}
        {...attributes}
        {...listeners}
        tabIndex={-1}
        role="listitem"
      >
        <TaskCard task={task} />
      </div>
    </>
  );
}

/** Calendar area that accepts task drops at a time. */
export function useTimeboxDrop(date: DateKey, startHour: number, hourPx: number) {
  const settings = useSettings();
  const snap = settings?.snapMinutes ?? 15;
  return useDroppable({
    id: `timebox:${date}`,
    data: { kind: "timebox", date, startHour, hourPx, snap } satisfies DropTarget,
  });
}

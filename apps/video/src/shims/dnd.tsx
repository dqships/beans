import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import type { DateKey, Task, TimeKey } from "@beans/core";
import { token } from "@beans/tokens";
import { TaskCard } from "@/planner/TaskCard";
import styles from "@/planner/board.module.css";
import { cardExpandedAt, dragStateAt, slotMotion } from "../script";
import { mix } from "../motion";

export type DropTarget =
  | { kind: "day"; date: DateKey }
  | { kind: "list"; listId: string | null }
  | { kind: "timebox"; date: DateKey; startHour: number; hourPx: number; snap: number };

export interface DragState {
  active: null;
  preview: { date: DateKey; start: TimeKey; minutes: number } | null;
  insertion: { container: string; index: number } | null;
}

export function useDragState(): DragState {
  const frame = useCurrentFrame();
  const { preview, insertion } = dragStateAt(frame);
  const start = preview?.start ?? null;
  const index = insertion?.index ?? null;
  const container = insertion?.container ?? null;
  return useMemo(
    () => ({ active: null, preview, insertion }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [start, index, container],
  );
}

export function containerId(target: DropTarget): string {
  if (target.kind === "day") return `day:${target.date}`;
  if (target.kind === "list") return `list:${target.listId ?? "brain"}`;
  return `timebox:${target.date}`;
}

export function PlannerDnd({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function TaskDropZone({
  target,
  children,
  className,
}: {
  target: Exclude<DropTarget, { kind: "timebox" }>;
  tasks: Task[];
  children: ReactNode;
  className?: string;
}) {
  const id = containerId(target);
  const { insertion } = useDragState();
  return (
    <div className={className} data-drop={id}>
      {children}
      {insertion?.container === id && insertion.index < 0 ? <div className={styles.insertLine} /> : null}
    </div>
  );
}

export function SortableTask({ task, container, index }: { task: Task; container: string; index: number }) {
  const frame = useCurrentFrame();
  const { insertion } = useDragState();
  const motion = slotMotion(task.id, container, frame);
  const expanded = cardExpandedAt(task.id, frame);
  const open = motion.rows >= 1;
  return (
    <>
      {insertion?.container === container && insertion.index === index ? <div className={styles.insertLine} /> : null}
      <div
        style={{
          display: "grid",
          gridTemplateRows: `${motion.rows}fr`,
          marginBottom: `calc(${token("--space-2")} * ${mix(-1, 0, motion.rows)})`,
          opacity: motion.opacity,
        }}
        className={motion.ghost ? styles.dragSource : undefined}
        role="listitem"
      >
        <div style={{ minHeight: 0, overflow: open ? "visible" : "hidden" }}>
          <ExpandableCard key={expanded ? "open" : "closed"} task={task} expanded={expanded} />
        </div>
      </div>
    </>
  );
}

/** The time row is the card's own state, so it opens with a click on the real chip. */
function ExpandableCard({ task, expanded }: { task: Task; expanded: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (expanded) ref.current?.querySelector<HTMLButtonElement>("button[aria-expanded]")?.click();
  }, [expanded]);
  return (
    <div ref={ref}>
      <TaskCard task={task} />
    </div>
  );
}

export function useTimeboxDrop(): { setNodeRef: (el: HTMLElement | null) => void; isOver: boolean } {
  const { preview } = useDragState();
  return { setNodeRef: noop, isOver: preview !== null };
}

const noop = () => {};

import { useLayoutEffect, useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { DataStoreContext, type DataStore } from "@/data/store";
import { PlannerApp } from "@/planner/PlannerApp";
import { TaskCard } from "@/planner/TaskCard";
import board from "@/planner/board.module.css";
import shell from "@/planner/shell.module.css";
import timegrid from "@/planner/timegrid.module.css";
import timer from "@/planner/timer.module.css";
import dialogs from "@/planner/dialogs.module.css";
import garden from "@/ui/garden.module.css";
import { addDays, diffDays, todayIn } from "@beans/core";
import { TODAY, ZONE } from "../fixture";
import { useFormat } from "../formats";
import { lin, sp } from "../motion";
import { BOARD_PAD_DAYS, boardScrollAt, clockAt, COLUMN_STEP, layoutAt, overlaysAt, phaseOf, activeToast, stateAt, timeboxScrollAt, typedAt } from "../script";
import { ClockContext } from "../shims/hooks";
import { VideoUiProvider } from "../shims/ui-state";
import { T } from "../timeline";

const noop = () => {};

/** The real planner, fed by the script instead of a backend. */
export function Planner() {
  const frame = useCurrentFrame();
  const state = stateAt(frame);
  const store = useMemo<DataStore>(() => ({ state, apply: noop, requestRange: noop, backend: "sample" }), [state]);
  // The board anchors its first column to today, so it starts over when the day changes.
  const today = todayIn(ZONE, clockAt(frame));
  return (
    <ClockContext.Provider value={clockAt(frame)}>
      <DataStoreContext.Provider value={store}>
        <VideoUiProvider>
          <FrameStyles />
          <PlannerApp key={today} />
          <AirborneCards />
          <Drivers />
        </VideoUiProvider>
      </DataStoreContext.Provider>
    </ClockContext.Provider>
  );
}

function AirborneCards() {
  const frame = useCurrentFrame();
  const format = useFormat();
  return (
    <>
      {overlaysAt(format, frame).map((o) => (
        <div key={o.task.id} className={board.overlayWrap} style={{ position: "absolute", left: 0, top: 0, translate: `${o.x}px ${o.y}px`, zIndex: "var(--z-drag)" }}>
          <TaskCard task={o.task} overlay />
        </div>
      ))}
    </>
  );
}

/** CSS the app animates on its own, set from the frame instead. */
function FrameStyles() {
  const frame = useCurrentFrame();
  const toast = activeToast(frame);
  const toastIn = toast ? sp(frame, toast.from) : 1;
  const pill = sp(frame, T.playClick);
  const pulse = 0.65 + 0.35 * Math.cos((frame / 30) * Math.PI);
  const sprout = sp(frame, T.checkClick, 0.55);
  const format = useFormat();
  const layout = layoutAt(format, phaseOf(frame));
  // Scroll positions as transforms: a scroll offset would live in the DOM, not in the frame.
  const firstDay = addDays(todayIn(ZONE, clockAt(frame)), -BOARD_PAD_DAYS);
  const boardX = diffDays(TODAY, firstDay) * COLUMN_STEP + boardScrollAt(frame);
  return (
    <style>{`
      .${shell.app} { height: 100%; }
      .${shell.toast} { opacity: ${toastIn}; translate: 0 calc(var(--space-3) * ${1 - toastIn}); }
      .${timer.pill} { opacity: ${pill}; scale: ${0.9 + 0.1 * pill}; }
      .${timer.dotLive} { opacity: ${pulse}; }
      [data-task-id="t-report"] .${garden.sprout} { transform: scale(${sprout}); }
      .${shell.main} { overflow: clip; }
      .${board.board} { overflow: visible !important; translate: ${-boardX}px 0; }
      .${timegrid.scroll} { overflow: clip !important; }
      .${timegrid.grid} { translate: 0 ${-timeboxScrollAt(frame, layout)}px; }
    `}</style>
  );
}

/** The Quick Capture field keeps its text in its own state, so the film types into it. */
function Drivers() {
  const frame = useCurrentFrame();
  useLayoutEffect(() => {
    const input = document.querySelector<HTMLInputElement>('input[aria-label="Quick Capture"]');
    if (!input) return;
    const { text, typing } = typedAt(frame);
    if (input.value !== text) {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, text);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    placeCaret(input, text, typing, frame);
  });
  return null;
}

let measure: CanvasRenderingContext2D | null = null;

function placeCaret(input: HTMLInputElement, text: string, typing: boolean, frame: number) {
  const field = input.closest(`.${dialogs.captureField}`);
  if (!field) return;
  let caret = field.querySelector<HTMLElement>("[data-caret]");
  if (!caret) {
    caret = document.createElement("span");
    caret.dataset.caret = "";
    caret.style.cssText = "position:absolute;top:var(--space-2);bottom:var(--space-2);width:var(--focus-ring);background:var(--color-primary);";
    field.append(caret);
  }
  measure ??= document.createElement("canvas").getContext("2d");
  if (!measure) return;
  const style = getComputedStyle(input);
  measure.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  caret.style.left = `${measure.measureText(text).width}px`;
  caret.style.opacity = typing || lin(frame % 30, 0, 15) < 1 ? "1" : "0";
}

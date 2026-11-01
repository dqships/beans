import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Kbd } from "@/ui/controls";
import { FORMATS, FormatContext, useFormat, type FormatId } from "../formats";
import { sp } from "../motion";
import { cameraAt, dipAt, layoutAt, phaseOf } from "../script";
import { T } from "../timeline";
import { Captions } from "./Captions";
import { Intro, Outro } from "./Intro";
import { Night } from "./Night";
import { Planner } from "./Planner";
import { Pointer } from "./Pointer";

function PlannerWindow() {
  const frame = useCurrentFrame();
  const format = useFormat();
  const layout = layoutAt(format, phaseOf(frame));
  const camera = cameraAt(format, frame);
  const enter = 1 - sp(frame, T.windowIn, 0.7);
  const leave = sp(frame, T.outro, 0.7);
  const { view } = format;
  return (
    <div style={{ position: "absolute", left: view.x, top: view.y, width: view.w, height: view.h, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: camera.x - view.x,
          top: camera.y - view.y,
          width: layout.w,
          height: layout.h,
          transformOrigin: "0 0",
          scale: camera.scale,
          translate: `0 ${(enter + leave) * format.height}px`,
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          boxShadow: "var(--shadow-lg)",
          background: "var(--color-bg)",
        }}
      >
        <Planner />
        <Pointer />
      </div>
      <div style={{ position: "absolute", inset: 0, background: "var(--color-surface-2)", opacity: dipAt(format.id, frame), pointerEvents: "none" }} />
    </div>
  );
}

function QuickCaptureKey() {
  const frame = useCurrentFrame();
  const { view } = useFormat();
  if (frame < T.keyQ - 2 || frame > T.captureOpen + 12) return null;
  const p = sp(frame, T.keyQ) * (1 - sp(frame, T.captureOpen));
  return (
    <div
      style={{
        position: "absolute",
        left: view.x + view.w / 2,
        top: view.y + view.h * 0.42,
        translate: "-50% -50%",
        scale: 0.94 + 0.06 * p,
        opacity: p,
        display: "flex",
        alignItems: "center",
        gap: "var(--space-4)",
        padding: "var(--space-4) var(--space-5)",
        borderRadius: "var(--radius-md)",
        background: "var(--color-text)",
        color: "var(--color-bg)",
        boxShadow: "var(--shadow-md)",
        fontSize: "var(--video-caption)",
        lineHeight: 1.2,
        fontWeight: "var(--text-lg-weight)",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ display: "flex", zoom: 2.2, color: "var(--color-text)" }}>
        <Kbd>Q</Kbd>
      </span>
      Quick Capture
    </div>
  );
}

export function Film({ format }: { format: FormatId }) {
  return (
    <FormatContext.Provider value={FORMATS[format]}>
      <AbsoluteFill style={{ background: "var(--color-surface-2)", fontFamily: "var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>
        <Intro />
        <PlannerWindow />
        <QuickCaptureKey />
        <Night />
        <Captions />
        <Outro />
      </AbsoluteFill>
    </FormatContext.Provider>
  );
}

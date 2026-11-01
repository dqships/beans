import { useCurrentFrame } from "remotion";
import { useFormat } from "../formats";
import { mix, sp } from "../motion";
import { cameraAt, pointerAt } from "../script";

/** The viewer's mouse. It stays one size on screen while the camera moves. */
export function Pointer() {
  const frame = useCurrentFrame();
  const format = useFormat();
  const pointer = pointerAt(format, frame);
  if (pointer.visible < 0.01) return null;
  const camera = cameraAt(format, frame);
  const size = (format.id === "wide" ? 40 : 52) / camera.scale;
  const press = pointer.pressed ? 0.86 : 1;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, translate: `${pointer.x}px ${pointer.y}px`, zIndex: "var(--z-drag)", pointerEvents: "none", opacity: pointer.visible }}>
      <svg viewBox="0 0 24 24" style={{ display: "block", width: size, height: size, translate: `${-size * 0.18}px ${-size * 0.1}px`, scale: press, transformOrigin: "20% 12%", overflow: "visible", filter: "drop-shadow(var(--shadow-sm))" }}>
        <path d="M4.5 2.5 L19.5 13.2 L12.4 14 L16 21 L12.8 22.4 L9.3 15.3 L4.5 20 Z" fill="var(--color-text)" stroke="var(--color-surface)" strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function pressRing(frame: number, at: number): { scale: number; opacity: number } {
  const p = sp(frame, at);
  return { scale: mix(0.5, 1.4, p), opacity: 1 - p };
}

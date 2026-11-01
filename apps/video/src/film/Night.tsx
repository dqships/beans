import { useCurrentFrame } from "remotion";
import { formatTime, minutesToTime } from "@beans/core";
import { BrandArt } from "../brand/art";
import { useFormat } from "../formats";
import { sp } from "../motion";
import { clockAt, minutesOfDay } from "../script";
import { T } from "../timeline";

/** The evening runs past, the mascot sleeps through midnight, and the board wakes up. */
export function Night() {
  const frame = useCurrentFrame();
  const format = useFormat();
  if (frame < T.nightIn || frame > T.moonEnd + 20) return null;
  const { view } = format;
  const fall = sp(frame, T.midnight - 30, 0.5);
  const rise = sp(frame, T.moonEnd - 8, 0.7);
  const shown = sp(frame, T.nightIn + 6) * (1 - rise);
  const moon = sp(frame, T.midnight - 8) * (1 - rise);
  const time = formatTime(minutesToTime(minutesOfDay(clockAt(frame))), "12h");
  return (
    <>
      <div style={{ position: "absolute", left: view.x, top: view.y, width: view.w, height: view.h, background: "var(--color-scrim)", opacity: fall * (1 - rise) * 1.6 }} />
      <div
        style={{
          position: "absolute",
          left: view.x,
          top: view.y,
          width: view.w,
          height: view.h,
          display: "grid",
          placeContent: "center",
          justifyItems: "center",
          gap: "var(--space-5)",
        }}
      >
        <div style={{ opacity: moon, scale: 0.9 + 0.1 * moon }}>
          <BrandArt pose="night" width={format.id === "wide" ? 360 : 420} />
        </div>
        <div
          style={{
            padding: "var(--space-3) var(--space-5)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-text)",
            color: "var(--color-bg)",
            boxShadow: "var(--shadow-md)",
            fontSize: "var(--video-caption)",
            lineHeight: 1.2,
            fontWeight: "var(--text-lg-weight)",
            opacity: shown,
          }}
        >
          {time}
        </div>
      </div>
    </>
  );
}

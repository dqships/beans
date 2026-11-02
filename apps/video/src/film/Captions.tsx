import { useCurrentFrame } from "remotion";
import { NowBean } from "@/ui/garden";
import { CAPTIONS } from "../captions";
import { useFormat } from "../formats";
import { sp } from "../motion";
import { DURATION, T } from "../timeline";

export function Captions() {
  const frame = useCurrentFrame();
  const format = useFormat();
  const { caption } = format;
  const cue = CAPTIONS.find((c) => !c.title && frame >= c.from && frame < c.to);
  const band = sp(frame, T.windowIn) * (1 - sp(frame, T.outro));
  const inP = cue ? sp(frame, cue.from) : 0;
  const outP = cue ? sp(frame, cue.to - 5) : 0;
  return (
    <div style={{ position: "absolute", left: caption.x, top: caption.y, width: caption.w, height: caption.h, opacity: band }}>
      <Vine frame={frame} />
      <div style={{ height: "100%", display: "flex", alignItems: format.id === "wide" ? "center" : "flex-start", paddingTop: format.id === "wide" ? 0 : "var(--space-5)" }}>
        {cue ? (
          <p
            style={{
              margin: 0,
              fontSize: "var(--video-caption)",
              lineHeight: 1.2,
              fontWeight: "var(--text-lg-weight)",
              color: "var(--color-text)",
              opacity: inP * (1 - outP),
              translate: `0 calc(var(--space-3) * ${1 - inP})`,
            }}
          >
            {cue.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** The soil line under the planner, with a vine that grows as the film plays. */
function Vine({ frame }: { frame: number }) {
  const progress = Math.min(1, frame / DURATION);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "var(--focus-ring)", borderRadius: "var(--radius-full)", background: "var(--color-border)" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${progress * 100}%`, borderRadius: "var(--radius-full)", background: "var(--mascot-stem)" }}>
        <div style={{ position: "absolute", right: 0, top: "calc(var(--space-2) * -1)", translate: "50% 0", display: "flex" }}>
          <NowBean />
        </div>
      </div>
    </div>
  );
}

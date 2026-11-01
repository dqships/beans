import { random, useCurrentFrame } from "remotion";
import { Button } from "@/ui/Button";
import { BrandArt } from "../brand/art";
import { useFormat, type Format } from "../formats";
import { mix, sp } from "../motion";
import { T } from "../timeline";

const title = {
  margin: 0,
  fontSize: "var(--video-title)",
  lineHeight: 1.05,
  fontWeight: "var(--text-xl-weight)",
  color: "var(--color-text)",
  letterSpacing: "normal",
} as const;

const sub = {
  margin: 0,
  fontSize: "var(--video-caption)",
  lineHeight: 1.2,
  fontWeight: "var(--text-md-weight)",
  color: "var(--color-text-muted)",
} as const;

/** A wide or stacked arrangement of the mascot and its words. */
function scene(format: Format) {
  if (format.id === "wide") return { art: { left: 1120, top: 170, width: 660 }, text: { left: 150, top: 340, width: 900 } };
  if (format.id === "square") return { art: { left: 300, top: 110, width: 480 }, text: { left: 72, top: 640, width: 936 } };
  return { art: { left: 200, top: 300, width: 680 }, text: { left: 72, top: 1090, width: 936 } };
}

const BEANS = Array.from({ length: 16 }, (_, i) => ({
  delay: i * 3 + random(`delay-${i}`) * 4,
  x: random(`x-${i}`),
  y: random(`y-${i}`),
  turn: random(`turn-${i}`) * 180,
  size: 0.8 + random(`size-${i}`) * 0.5,
  tone: i % 3 === 0 ? "var(--mascot-shade)" : "var(--mascot-bean)",
}));

function SpilledBeans({ frame, format }: { frame: number; format: Format }) {
  const { art } = scene(format);
  const floor = art.top + art.width * 0.96;
  const ox = art.left + art.width * 0.78;
  const oy = art.top + art.width * 0.62;
  const reach = format.id === "wide" ? 1000 : 700;
  return (
    <>
      {BEANS.map((b, i) => {
        const p = Math.min(1, sp(frame, b.delay, 0.45));
        const x = mix(ox, ox - 40 - b.x * reach, p);
        const y = mix(oy, floor + b.y * 16, p * p) - Math.sin(p * Math.PI) * 120;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "var(--space-6)",
              height: "var(--space-5)",
              borderRadius: "50%",
              background: b.tone,
              translate: `${x}px ${y}px`,
              scale: b.size,
              rotate: `${b.turn * p}deg`,
              opacity: frame >= b.delay ? 1 : 0,
            }}
          />
        );
      })}
    </>
  );
}

/** The opening: the hook is on screen from the very first frame. */
export function Intro() {
  const frame = useCurrentFrame();
  const format = useFormat();
  if (frame > T.introEnd + 30) return null;
  const { art, text } = scene(format);
  const out = sp(frame, T.introEnd - 8, 0.7);
  const hop = 1 - sp(frame, 0, 0.7);
  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--color-bg)", opacity: 1 - out }}>
      <SpilledBeans frame={frame} format={format} />
      <div style={{ position: "absolute", left: art.left, top: art.top, translate: `0 calc(var(--space-6) * ${-hop})` }}>
        <BrandArt pose="intro" width={art.width} />
      </div>
      <div style={{ position: "absolute", left: text.left, top: text.top, width: text.width, display: "grid", gap: "var(--space-5)" }}>
        <h1 style={title}>Spill the beans.</h1>
        <p style={sub}>Your tasks, your week and your hours in one place.</p>
      </div>
    </div>
  );
}

export function Outro() {
  const frame = useCurrentFrame();
  const format = useFormat();
  if (frame < T.outro) return null;
  const { art, text } = scene(format);
  const paper = sp(frame, T.outro, 0.7);
  const words = sp(frame, T.outro + 6);
  const cta = sp(frame, T.outroCta);
  const hop = Math.abs(Math.sin(((frame - T.outro) / 30) * Math.PI * 1.2)) * sp(frame, T.outro) * Math.exp(-(frame - T.outro) / 60);
  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--color-bg)", opacity: paper }}>
      <div style={{ position: "absolute", left: art.left, top: art.top, translate: `0 calc(var(--space-6) * ${-hop})` }}>
        <BrandArt pose="outro" width={art.width} />
      </div>
      <div style={{ position: "absolute", left: text.left, top: text.top, width: text.width, display: "grid", gap: "var(--space-6)", justifyItems: "start", opacity: words, translate: `0 calc(var(--space-4) * ${1 - words})` }}>
        <h1 style={title}>Spill the beans.</h1>
        <div style={{ opacity: cta, translate: `0 calc(var(--space-3) * ${1 - cta})`, transformOrigin: "0 0", scale: 2.6 }}>
          <Button variant="primary">Start planning</Button>
        </div>
      </div>
    </div>
  );
}

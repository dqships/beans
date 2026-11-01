import { random, useCurrentFrame } from "remotion";
import { Button } from "@/ui/Button";
import { BrandArt, USE_ILLUSTRATIONS } from "../brand/art";
import { CTA, HOOK, NAMED } from "../captions";
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
  if (format.id === "wide") return { art: { left: 1100, top: 160, width: 680 }, text: { left: 110, top: 300, width: 960 } };
  if (format.id === "square") return { art: { left: 300, top: 96, width: 480 }, text: { left: 72, top: 650, width: 936 } };
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

const soilY = (format: Format) => {
  const { art } = scene(format);
  return art.top + art.width * 0.9;
};

/** The soil line both ends of the film stand on, and the beans spilled along it. */
function SpilledBeans({ frame, format }: { frame: number; format: Format }) {
  if (USE_ILLUSTRATIONS) return null;
  const { art } = scene(format);
  const floor = soilY(format) - 18;
  const ox = art.left + art.width * 0.78;
  const oy = art.top + art.width * 0.62;
  const reach = format.id === "wide" ? 1000 : 700;
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: soilY(format), height: "var(--focus-ring)", background: "var(--color-border)" }} />
      {BEANS.map((b, i) => {
        const p = Math.min(1, sp(frame, b.delay, 0.45));
        const x = mix(ox, ox - 40 - b.x * reach, p);
        const y = mix(oy, floor - b.y * 6, p * p) - Math.sin(p * Math.PI) * 120;
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
        <h1 style={title}>{HOOK}</h1>
        <p style={sub}>{NAMED}</p>
      </div>
    </div>
  );
}

export function Outro() {
  const frame = useCurrentFrame();
  const format = useFormat();
  if (frame < T.outro) return null;
  const { art, text } = scene(format);
  const paper = sp(frame, T.outro, 0.6);
  const cta = sp(frame, T.outroCta);
  const age = frame - T.outro;
  const hop = Math.abs(Math.sin((age / 30) * Math.PI * 1.2)) * Math.exp(-age / 45);
  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--color-bg)", translate: `0 ${(1 - paper) * format.height}px` }}>
      <SpilledBeans frame={frame} format={format} />
      <div style={{ position: "absolute", left: art.left, top: art.top, translate: `0 calc(var(--space-6) * ${-hop})` }}>
        <BrandArt pose="outro" width={art.width} />
      </div>
      <div style={{ position: "absolute", left: text.left, top: text.top, width: text.width, display: "grid", gap: "var(--space-6)", justifyItems: "start" }}>
        <h1 style={title}>{HOOK}</h1>
        <div style={{ opacity: cta, translate: `0 calc(var(--space-3) * ${1 - cta})`, transformOrigin: "0 0", scale: 2.6 }}>
          <Button variant="primary">{CTA}</Button>
        </div>
      </div>
    </div>
  );
}

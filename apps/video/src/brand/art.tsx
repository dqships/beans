import { Img, staticFile } from "remotion";
import { Mascot, type MascotScene } from "@/ui/garden";

/**
 * Swapping in the generated poses is this one change: set this to true once
 * apps/web/public/illustrations holds the files named below. Those poses draw
 * their own ground, so the film's soil line and spilled beans step aside.
 */
export const USE_ILLUSTRATIONS = false;

/** `fit` sizes each pose to fill its slot: the files carry wide margins around the mascot. */
const ART = {
  intro: { file: "illustrations/video-intro@2x.webp", scene: "spill", fit: 1.4 },
  outro: { file: "illustrations/video-outro@2x.webp", scene: "cheer", fit: 1.4 },
  night: { file: "illustrations/rollover@2x.webp", scene: "sleep", fit: 1.25 },
} as const satisfies Record<string, { file: string; scene: MascotScene; fit: number }>;

export function BrandArt({ pose, width }: { pose: keyof typeof ART; width: number }) {
  const art = ART[pose];
  if (USE_ILLUSTRATIONS) {
    return (
      <div style={{ width }}>
        <Img src={staticFile(art.file)} style={{ display: "block", width: width * art.fit, maxWidth: "none", marginLeft: (width * (1 - art.fit)) / 2 }} alt="" />
      </div>
    );
  }
  return (
    <div style={{ width }}>
      <Mascot scene={art.scene} />
    </div>
  );
}

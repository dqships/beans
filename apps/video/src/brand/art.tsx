import { Img, staticFile } from "remotion";
import { Mascot, type MascotScene } from "@/ui/garden";

/**
 * Swapping in the generated poses is this one change: set `USE_ILLUSTRATIONS`
 * to true once apps/web/public/illustrations holds the files named below.
 */
const USE_ILLUSTRATIONS = false;

const ART = {
  intro: { file: "illustrations/video-intro@2x.webp", scene: "spill" },
  outro: { file: "illustrations/video-outro@2x.webp", scene: "cheer" },
  night: { file: "illustrations/rollover@2x.webp", scene: "sleep" },
} as const satisfies Record<string, { file: string; scene: MascotScene }>;

export function BrandArt({ pose, width }: { pose: keyof typeof ART; width: number }) {
  const art = ART[pose];
  if (USE_ILLUSTRATIONS) return <Img src={staticFile(art.file)} style={{ width }} alt="" />;
  return (
    <div style={{ width }}>
      <Mascot scene={art.scene} />
    </div>
  );
}

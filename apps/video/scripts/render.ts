/**
 * Renders the demo film and every deliverable from code.
 *
 *   pnpm video:render            everything
 *   pnpm video:render --stage=encode   re-encode from the masters in out/
 *
 * Masters land in apps/video/out/ (git-ignored). Files under 10 MB are copied
 * to apps/web/public/video/. Needs ffmpeg with libx264, libvpx-vp9 and libsvtav1.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { captionsVtt } from "../src/captions";
import { FPS } from "../src/motion";
import { DURATION, T } from "../src/timeline";

const root = process.cwd();
const out = path.join(root, "out");
const publicDir = path.join(root, "../web/public/video");
const port = process.env.VIDEO_PORT ?? "3104";

const MB = 1024 * 1024;
/** Web copies stay under this, which keeps them under the 6 MB budget. */
const WEB_LIMIT = 5.8 * MB;
/** Anything larger stays out of git. */
const GIT_LIMIT = 10 * MB;
/** The wide shot of the running timer: blocks on the beanstalk, the day's tasks and the pill. */
const POSTER_FRAME = T.lapseStart + 52;

const run = (cmd: string, args: string[]) => execFileSync(cmd, args, { stdio: "inherit" });
const ffmpeg = (args: string[]) => run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args]);
const size = (file: string) => statSync(file).size;
const mb = (bytes: number) => `${(bytes / MB).toFixed(2)} MB`;

function master(composition: string) {
  run("pnpm", ["exec", "remotion", "render", "src/index.ts", composition, path.join(out, `${composition}.mp4`), "--codec=h264", "--crf=14", "--color-space=bt709", `--port=${port}`]);
}

/** Tries each quality in turn until the file fits. */
function underLimit(limit: number, qualities: number[], encode: (quality: number) => string) {
  for (const quality of qualities) {
    const file = encode(quality);
    if (size(file) <= limit) {
      console.log(`${path.basename(file)}: quality ${quality}, ${mb(size(file))}`);
      return file;
    }
  }
  throw new Error(`No quality met the ${mb(limit)} limit.`);
}

function encode() {
  const wide = path.join(out, "beans-demo-1920.mp4");
  const h264 = ["-c:v", "libx264", "-preset", "veryslow", "-tune", "animation", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an"];
  const vp9 = ["-c:v", "libvpx-vp9", "-b:v", "0", "-row-mt", "1", "-quality", "good", "-cpu-used", "2", "-pix_fmt", "yuv420p", "-an"];

  // Flat UI compresses well, so the web copies keep the full 1080p and stay under budget.
  underLimit(WEB_LIMIT, [22, 24, 26, 28, 30, 32], (crf) => {
    const file = path.join(publicDir, "beans-demo-web.mp4");
    ffmpeg(["-i", wide, ...h264, "-crf", String(crf), file]);
    return file;
  });
  underLimit(WEB_LIMIT, [32, 36, 40, 44, 48], (crf) => {
    const file = path.join(publicDir, "beans-demo-web.webm");
    ffmpeg(["-i", wide, ...vp9, "-crf", String(crf), file]);
    return file;
  });

  const social = (name: string) => {
    const file = path.join(out, `${name}.mp4`);
    const final = path.join(out, `${name}-social.mp4`);
    ffmpeg(["-i", file, ...h264, "-crf", "20", final]);
    return final;
  };
  const place = (file: string, name: string) => {
    const bytes = size(file);
    const target = bytes < GIT_LIMIT ? path.join(publicDir, name) : path.join(out, name);
    copyFileSync(file, target);
    console.log(`${name}: ${mb(bytes)} -> ${target}`);
  };
  place(social("beans-demo-1920"), "beans-demo-1920.mp4");
  place(social("beans-demo-square"), "beans-demo-square.mp4");
  place(social("beans-demo-vertical"), "beans-demo-vertical.mp4");
  const webm = path.join(out, "beans-demo-1920-social.webm");
  ffmpeg(["-i", wide, ...vp9, "-crf", "34", webm]);
  place(webm, "beans-demo-1920.webm");
}

function poster() {
  const png = path.join(publicDir, "beans-demo-poster.png");
  run("pnpm", ["exec", "remotion", "still", "src/index.ts", "beans-demo-1920", png, `--frame=${POSTER_FRAME}`, `--port=${port}`]);
  const avif = path.join(publicDir, "beans-demo-poster.avif");
  ffmpeg(["-i", png, "-vf", "scale=1280:720:flags=lanczos,format=yuv420p", "-frames:v", "1", "-c:v", "libsvtav1", "-crf", "32", "-preset", "4", "-still-picture", "1", avif]);
}

const stage = process.argv.find((a) => a.startsWith("--stage="))?.slice("--stage=".length) ?? "all";
mkdirSync(out, { recursive: true });
mkdirSync(publicDir, { recursive: true });
writeFileSync(path.join(publicDir, "beans-demo.vtt"), captionsVtt());

if (spawnSync("ffmpeg", ["-version"]).status !== 0) throw new Error("ffmpeg is required.");
if (stage === "all") ["beans-demo-1920", "beans-demo-square", "beans-demo-vertical"].forEach(master);
if (stage === "all" || stage === "encode") encode();
if (stage === "all" || stage === "poster") poster();
console.log(`Film: ${(DURATION / FPS).toFixed(1)} s at ${FPS} fps.`);

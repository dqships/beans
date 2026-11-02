// Lays the voiceover and music under the demo video, from the raw files in
// assets/audio. Each voice line starts just after its caption appears, or after
// the line before it ends. Run with `pnpm video:mix`. Needs ffmpeg.
// To hear another track, run `pnpm video:mix --music=minimax-take-1`. That builds
// trial cuts in apps/video/out and leaves the chosen files alone.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const voiceDir = join(root, "assets/audio/voice");
const musicDir = join(root, "assets/audio/music");
const chosen = "minimax-take-2-no-vocals";
const pick = process.argv.find((arg) => arg.startsWith("--music="))?.slice("--music=".length) ?? chosen;
const trial = pick !== chosen;
const outDir = trial ? join(root, "apps/video/out", pick) : join(root, "assets/video");

const publicVideo = join(root, "apps/web/public/video");
// The silent film. Every cut with sound starts from these files.
const video = join(publicVideo, "beans-demo-1920.mp4");
const captions = join(publicVideo, "beans-demo.vtt");
const music = join(musicDir, `${pick}.mp3`);

const leadIn = 0.18; // Seconds between a caption appearing and its line starting.
const gap = 0.22; // Seconds of air between two lines.
const fadeIn = 0.1;
const fadeOut = 2.5;
const target = -22; // LUFS, for the music.
const voiceTarget = -23; // LUFS. One dB under the music's level, so the voice sits in the mix instead of on top of it.
// Seconds of the track's quiet opening notes to skip, so the music starts on its first full beat.
const musicStart = 2.45;
const webLimit = 6_000_000; // Bytes, the landing page's budget for each video file.
const musicUnderVoice = -5; // dB, the music's level under the voice before ducking.

const ffmpeg = (args) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
const probe = (file) =>
  Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString());

/** How far a file's loudness is from the target, in dB. */
function gainTo(file, lufs) {
  const log = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128", "-f", "null", "-"]).stderr.toString();
  const integrated = [...log.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].at(-1);
  if (!integrated) throw new Error(`No loudness reading for ${file}`);
  return lufs - Number(integrated[1]);
}

function cueStarts() {
  return [...readFileSync(captions, "utf8").matchAll(/(\d\d):(\d\d):(\d\d\.\d+) -->/g)].map(
    ([, h, m, s]) => Number(h) * 3600 + Number(m) * 60 + Number(s),
  );
}

const lines = readdirSync(voiceDir)
  .filter((name) => /^line-\d+\.mp3$/.test(name))
  .sort()
  .map((name) => join(voiceDir, name));
const cues = cueStarts();
if (lines.length !== cues.length) throw new Error(`${lines.length} voice lines for ${cues.length} captions`);

const length = probe(video);
let clock = 0;
const placed = lines.map((file, i) => {
  const start = Math.max(cues[i] + leadIn, clock);
  clock = start + probe(file) + gap;
  return { file, start };
});
if (clock - gap > length) throw new Error(`The voiceover runs ${(clock - gap - length).toFixed(2)} s past the video`);

mkdirSync(outDir, { recursive: true });

// The timed voiceover on its own.
const voiceStem = join(voiceDir, "voiceover-full.mp3");
const rawStem = join(outDir, "voiceover-full.wav");
const delays = placed.map(({ start }, i) => {
  const ms = Math.round(start * 1000);
  return `[${i}:a]aresample=44100,aformat=channel_layouts=stereo,adelay=${ms}|${ms}[l${i}]`;
});
const inputs = placed.map((_, i) => `[l${i}]`).join("");
if (!trial) ffmpeg([
  ...placed.flatMap(({ file }) => ["-i", file]),
  "-filter_complex",
  `${delays.join(";")};${inputs}amix=inputs=${placed.length}:normalize=0:duration=longest,apad,atrim=0:${length}`,
  rawStem,
]);
if (!trial) {
  const voiceGain = gainTo(rawStem, voiceTarget);
  ffmpeg(["-i", rawStem, "-af", `volume=${voiceGain.toFixed(2)}dB,alimiter=limit=0.84:level=false`, "-c:a", "libmp3lame", "-b:a", "192k", voiceStem]);
  execFileSync("rm", [rawStem]);
}

// The music, cut to the film's length and leveled.
const musicStem = join(trial ? outDir : musicDir, "music-bed.mp3");
const rawMusic = join(outDir, "music-bed.wav");
ffmpeg(["-i", music, "-af", `atrim=${musicStart}:${musicStart + length},asetpts=PTS-STARTPTS,afade=in:d=${fadeIn},afade=out:st=${length - fadeOut}:d=${fadeOut}`, rawMusic]);
const musicGain = gainTo(rawMusic, target);
ffmpeg(["-i", rawMusic, "-af", `volume=${musicGain.toFixed(2)}dB,alimiter=limit=0.84:level=false`, "-c:a", "libmp3lame", "-b:a", "192k", musicStem]);

const finish = ["-map", "0:v", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-t", String(length)];

// Video with music only.
ffmpeg(["-i", video, "-i", musicStem, ...finish.slice(0, 2), "-map", "1:a", ...finish.slice(2), join(outDir, "beans-demo-music.mp4")]);

// Voice and music together. The music dips further while the voice speaks.
const mix = join(outDir, "voice-music-mix.wav");
ffmpeg([
  "-i",
  voiceStem,
  "-i",
  musicStem,
  "-filter_complex",
  `[0:a]asplit=2[voice][key];[1:a]volume=${musicUnderVoice}dB[bed];[bed][key]sidechaincompress=threshold=0.06:ratio=2:attack=30:release=500[ducked];[voice][ducked]amix=inputs=2:normalize=0,alimiter=limit=0.89:level=false[mix]`,
  "-map",
  "[mix]",
  mix,
]);
ffmpeg(["-i", video, "-i", mix, ...finish.slice(0, 2), "-map", "1:a", ...finish.slice(2), join(outDir, "beans-demo-voice-music.mp4")]);

/** Puts the mix on a landing page file, keeping its picture. */
function addSound(name, audio) {
  const file = join(publicVideo, name);
  const next = join(outDir, `sound-${name}`);
  ffmpeg(["-i", file, "-i", mix, "-map", "0:v", "-map", "1:a", "-c:v", "copy", ...audio, "-movflags", "+faststart", "-t", String(length), next]);
  renameSync(next, file);
  if (statSync(file).size >= webLimit) throw new Error(`${name} is over the web budget`);
}

// The landing page's files. The MP4 is encoded again with room for its audio.
if (!trial) {
  const mp4 = join(publicVideo, "beans-demo-web.mp4");
  const fits = [23, 24, 25, 26, 27, 28].some((crf) => {
    const h264 = ["-c:v", "libx264", "-preset", "veryslow", "-tune", "animation", "-crf", String(crf), "-pix_fmt", "yuv420p"];
    ffmpeg(["-i", video, "-i", mix, "-map", "0:v", "-map", "1:a", ...h264, "-c:a", "aac", "-b:a", "80k", "-movflags", "+faststart", "-t", String(length), mp4]);
    return statSync(mp4).size < webLimit;
  });
  if (!fits) throw new Error("beans-demo-web.mp4 is over the web budget");
  addSound("beans-demo-web.webm", ["-c:a", "libopus", "-b:a", "72k"]);
  addSound("beans-demo-square.mp4", ["-c:a", "aac", "-b:a", "96k"]);
}

execFileSync("rm", [rawMusic, mix]);
if (!trial) {
  writeFileSync(
    join(voiceDir, "timing.json"),
    `${JSON.stringify(placed.map(({ file, start }, i) => ({ line: i + 1, file: file.split("/").pop(), caption: cues[i], start: Number(start.toFixed(2)) })), null, 2)}\n`,
  );
}
console.log(`Mixed ${placed.length} lines over ${length.toFixed(1)} s. Voice ends at ${(clock - gap).toFixed(2)} s.`);

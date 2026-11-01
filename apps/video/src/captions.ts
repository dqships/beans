import { FPS, seconds } from "./motion";
import { CAPTURE_LINES, DRAGS, DURATION, T } from "./timeline";

export interface Caption {
  from: number;
  to: number;
  text: string;
  /** Shown large in the intro or outro, not in the caption band. */
  title?: boolean;
}

const beforeNext = seconds(0.15);

/** On-screen text, in order. Every claim here comes from docs/launch/voice.md. */
export const CAPTIONS: Caption[] = [
  { from: 0, to: T.introEnd, text: "Spill the beans. Your tasks, your week and your hours in one place.", title: true },
  { from: T.spillCaption, to: CAPTURE_LINES[0]!.typeFrom + seconds(0.4), text: "Spill it all out. Sort it later." },
  { from: CAPTURE_LINES[0]!.typeFrom + seconds(0.5), to: T.dragsIn - beforeNext, text: "Quick Capture reads labels, dates and times as you type." },
  { from: T.dragsIn, to: DRAGS.dragLogo.drop + seconds(0.2), text: "Drag tasks onto the days you'll do them." },
  { from: DRAGS.dragLogo.drop + seconds(0.3), to: T.timeboxIn - beforeNext, text: "Your whole week on one board." },
  { from: T.timeboxIn, to: T.resizeIn - beforeNext, text: "Drag a task onto the Timebox to give it a time." },
  { from: T.resizeIn, to: T.timerIn - beforeNext, text: "Pull a block down to give it more time." },
  { from: T.timerIn, to: T.lapseStart + seconds(0.6), text: "Start the timer when you start the task." },
  { from: T.lapseStart + seconds(0.7), to: T.checkIn - beforeNext, text: "The timer keeps count while you work." },
  { from: T.checkIn, to: T.checkClick + seconds(1.4), text: "Check it off and watch it sprout." },
  // Actual time lands when the timer stops, so this caption waits for the chip to show it.
  { from: T.checkClick + seconds(1.5), to: T.nightIn - beforeNext, text: "Actual time fills in from the timer." },
  { from: T.nightIn, to: T.midnight + seconds(0.5), text: "Some tasks won't get done today." },
  { from: T.midnight + seconds(0.6), to: T.roll[2]! + seconds(0.5), text: "Unfinished tasks move to today at midnight." },
  { from: T.roll[2]! + seconds(0.6), to: T.outro - beforeNext, text: "No guilt, no copying things over." },
  { from: T.outro, to: DURATION, text: "Spill the beans. Start planning.", title: true },
];

function stamp(frame: number): string {
  const ms = Math.round((frame / FPS) * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor(ms / 60_000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms % 1000, 3)}`;
}

export function captionsVtt(): string {
  const cues = CAPTIONS.map((c, i) => `${i + 1}\n${stamp(c.from)} --> ${stamp(c.to)}\n${c.text}`);
  return `WEBVTT\n\n${cues.join("\n\n")}\n`;
}

import { FPS, seconds } from "./motion";

/**
 * Every beat of the film, in frames. Each beat is a gap after the one before,
 * so changing one length moves everything after it, and the film's length
 * comes from the last beat. This file has no dependencies, so the caption
 * file can be written from it outside the browser.
 */
let cursor = 0;
const at = (gap: number) => (cursor += gap);

export interface CaptureLine {
  id: string;
  text: string;
  /** Characters typed per second. */
  rate: number;
  /** Frames the finished line stays before it is added. */
  hold: number;
  typeFrom: number;
  typeTo: number;
  submit: number;
}

const LINES: Pick<CaptureLine, "id" | "text" | "rate" | "hold">[] = [
  { id: "t-plumber", text: "Call the plumber tomorrow #home =30m", rate: 15, hold: seconds(1.5) },
  { id: "t-report", text: "Write the Q4 report #work =1h", rate: 26, hold: seconds(0.4) },
  { id: "t-car", text: "Book the car service #home =45m", rate: 32, hold: seconds(0.3) },
  { id: "t-run", text: "Go for a run #health =30m", rate: 36, hold: seconds(0.3) },
  { id: "t-logo", text: "Sketch logo ideas #side project =45m", rate: 36, hold: seconds(0.3) },
  { id: "t-water", text: "Pay the water bill today #home =15m", rate: 36, hold: seconds(0.4) },
];

/** The intro holds long enough to read, then the planner rises over it. */
const introEnd = at(seconds(3.4));
const windowIn = at(0);
const spillCaption = at(seconds(0.5));
const keyQ = at(seconds(1.3));
const captureOpen = at(seconds(0.5));

const lines: CaptureLine[] = [];
at(seconds(0.5));
for (const line of LINES) {
  const typeFrom = cursor;
  const typeTo = at(Math.round((line.text.length / line.rate) * FPS));
  const submit = at(line.hold);
  lines.push({ ...line, typeFrom, typeTo, submit });
  at(seconds(0.2));
}
const captureClose = at(seconds(0.3));

const dragsIn = at(seconds(0.9));

export interface DragBeat {
  id: string;
  /** Pointer sets off for the card. */
  reach: number;
  pickup: number;
  drop: number;
}

function drag(id: string, reach: number, carry: number, rest: number): DragBeat {
  const start = cursor;
  const pickup = at(reach);
  const drop = at(carry);
  at(rest);
  return { id, reach: start, pickup, drop };
}

const dragReport = drag("t-report", seconds(0.9), seconds(1.1), seconds(0.4));
const dragCar = drag("t-car", seconds(0.7), seconds(0.9), seconds(0.3));
const dragRun = drag("t-run", seconds(0.7), seconds(0.9), seconds(0.3));
const dragLogo = drag("t-logo", seconds(0.7), seconds(1), seconds(0.5));

const weekScroll = at(seconds(0.2));
const weekBack = at(seconds(2.4));

const timeboxIn = at(seconds(1.1));
const boxReport = drag("t-report", seconds(1.2), seconds(1.3), seconds(0.5));
const boxRun = drag("t-run", seconds(0.9), seconds(1.2), seconds(0.7));

const resizeIn = at(seconds(0.3));
const resizeGrab = at(seconds(1));
const resizeStep1 = at(seconds(0.45));
const resizeStep2 = at(seconds(0.45));
const resizeDone = at(seconds(0.4));

const timerIn = at(seconds(1));
const chipClick = at(seconds(1.1));
const playClick = at(seconds(1.2));
const lapseStart = at(seconds(0.9));
const lapseEnd = at(seconds(4.4));

const checkIn = at(seconds(0.5));
const checkClick = at(seconds(1.3));
const checkDone = at(seconds(2.6));

const nightIn = at(seconds(0.5));
const midnight = at(seconds(3.4));
const moonEnd = at(seconds(1.7));
const roll: number[] = [at(seconds(0.3)), at(seconds(0.5)), at(seconds(0.5))];
const rolledHold = at(seconds(3.2));

const outro = at(seconds(0.3));
const outroCta = at(seconds(0.7));
const end = at(seconds(3.6));

export const T = {
  introEnd,
  windowIn,
  spillCaption,
  keyQ,
  captureOpen,
  captureClose,
  dragsIn,
  weekScroll,
  weekBack,
  timeboxIn,
  resizeIn,
  resizeGrab,
  resizeStep1,
  resizeStep2,
  resizeDone,
  timerIn,
  chipClick,
  playClick,
  lapseStart,
  lapseEnd,
  checkIn,
  checkClick,
  checkDone,
  nightIn,
  midnight,
  moonEnd,
  roll,
  rolledHold,
  outro,
  outroCta,
  end,
};

export const CAPTURE_LINES = lines;
export const DRAGS = { dragReport, dragCar, dragRun, dragLogo, boxReport, boxRun };
export const DURATION = end;

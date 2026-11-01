import {
  applyOps,
  createTask,
  liveLabels,
  moveTask,
  moveUnfinished,
  parseCapture,
  patch,
  relativeDay,
  setDone,
  startTimerOps,
  tasksForDay,
  tasksForList,
  timeToMinutes,
  type BeansState,
  type DateKey,
  type Op,
  type Task,
  type TimeKey,
} from "@beans/core";
import { initialState, moment, START_TIME, TODAY, TOMORROW } from "./fixture";
import { FORMATS, type Format, type FormatId, type Layout, type Phase } from "./formats";
import { clamp, lin, mix, sp } from "./motion";
import { CAPTURE_LINES, DRAGS, T, type DragBeat } from "./timeline";

// ---------- Clock ----------

const clockKeys: [number, number][] = [
  [0, START_TIME],
  [T.timerIn, START_TIME],
  [T.playClick, moment(TODAY, "09:00")],
  [T.lapseStart, moment(TODAY, "09:00") + 30_000],
  [T.lapseEnd, moment(TODAY, "10:12") + 34_000],
  [T.nightIn, moment(TODAY, "10:12") + 40_000],
  [T.midnight, moment(TOMORROW, "00:00")],
  [T.moonEnd, moment(TOMORROW, "00:00")],
];

/** The film's wall clock. Time-lapses are stretches where it runs fast. */
export function clockAt(frame: number): number {
  let i = 0;
  while (i < clockKeys.length - 1 && clockKeys[i + 1]![0] <= frame) i++;
  const a = clockKeys[i]!;
  const b = clockKeys[i + 1];
  if (!b) return a[1];
  return mix(a[1], b[1], lin(frame, a[0], b[0] - a[0]));
}

export function minutesOfDay(ms: number): number {
  return ((ms % 86_400_000) + 86_400_000) % 86_400_000 / 60_000;
}

// ---------- State, replayed from real operations ----------

interface Move {
  id: string;
  from: string;
  fromIndex: number;
  to: string;
  pickup: number;
  drop: number;
  /** Frame the card has landed and the overlay is gone. */
  settle: number;
  /** The drag ends on the Timebox, not on a list slot. */
  timebox: boolean;
  /** Before the task's data has moved, for measuring where it was. */
  task: Task;
  start: TimeKey | null;
}

const events: { frame: number; state: BeansState }[] = [];
const moves: Move[] = [];
const created: { id: string; frame: number }[] = [];
let state: BeansState = initialState();
events.push({ frame: 0, state });

function apply(frame: number, ops: Op[]) {
  state = applyOps(state, ops, clockAt(frame));
  events.push({ frame, state });
}

const containerOf = (t: Task): string => (t.date ? `day:${t.date}` : `list:${t.listId ?? "brain"}`);

function listIn(s: BeansState, container: string): Task[] {
  if (container.startsWith("day:")) return tasksForDay(s, container.slice(4));
  return tasksForList(s, null);
}

for (const line of CAPTURE_LINES) {
  const parsed = parseCapture(line.text, { today: TODAY, labels: liveLabels(state), lists: [] });
  const { ops } = createTask(
    state,
    { id: line.id, title: parsed.title, date: parsed.date, start: parsed.start, labelId: parsed.labelId, estimate: parsed.estimate ?? undefined },
    clockAt(line.submit),
  );
  apply(line.submit, ops);
  created.push({ id: line.id, frame: line.submit });
}

function dragToDay(beat: DragBeat, date: DateKey) {
  const task = state.tasks[beat.id]!;
  const from = containerOf(task);
  const to = `day:${date}`;
  const index = listIn(state, to).length;
  moves.push({ id: beat.id, from, fromIndex: listIn(state, from).findIndex((t) => t.id === beat.id), to, pickup: beat.pickup, drop: beat.drop, settle: beat.drop + 7, timebox: false, task, start: null });
  apply(beat.drop, moveTask(state, beat.id, { date, listId: null, index }));
}

function dragToTimebox(beat: DragBeat, start: TimeKey) {
  const task = state.tasks[beat.id]!;
  const from = containerOf(task);
  moves.push({ id: beat.id, from, fromIndex: listIn(state, from).findIndex((t) => t.id === beat.id), to: from, pickup: beat.pickup, drop: beat.drop, settle: beat.drop, timebox: true, task, start });
  apply(beat.drop, moveTask(state, beat.id, { date: task.date, listId: null, start }));
}

dragToDay(DRAGS.dragReport, TODAY);
dragToDay(DRAGS.dragCar, TODAY);
dragToDay(DRAGS.dragRun, TODAY);
dragToDay(DRAGS.dragLogo, TOMORROW);
dragToTimebox(DRAGS.boxReport, "09:00");
dragToTimebox(DRAGS.boxRun, "10:30");

apply(T.resizeStep1, [patch("tasks", "t-report", { estimate: 75 })]);
apply(T.resizeStep2, [patch("tasks", "t-report", { estimate: 90 })]);

apply(T.playClick, startTimerOps(state, "t-report", "stopwatch", clockAt(T.playClick)));
const undoDone = setDone(state, "t-report", false, clockAt(T.checkClick));
apply(T.checkClick, setDone(state, "t-report", true, clockAt(T.checkClick)));

// Midnight: the rollover the app runs, one task at a time so each can be seen landing.
const unfinished = tasksForDay(state, TODAY).filter((t) => !t.done);
export const FLIGHTS = unfinished.map((task, i) => {
  const land = T.roll[i] ?? T.roll[T.roll.length - 1]!;
  const fromIndex = listIn(state, `day:${TODAY}`).findIndex((t) => t.id === task.id);
  const pickup = land - 16;
  moves.push({ id: task.id, from: `day:${TODAY}`, fromIndex, to: `day:${TOMORROW}`, pickup, drop: land, settle: land, timebox: false, task, start: null });
  apply(land, moveUnfinished(state, [state.tasks[task.id]!], TOMORROW));
  return { id: task.id, pickup, land };
});
apply(T.moonEnd, [{ kind: "settings", fields: { lastRollover: TOMORROW } }]);
events.sort((a, b) => a.frame - b.frame);

export function stateAt(frame: number): BeansState {
  let lo = 0;
  let hi = events.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (events[mid]!.frame <= frame) lo = mid;
    else hi = mid - 1;
  }
  return events[lo]!.state;
}

// ---------- Quick Capture ----------

export function captureOpenness(frame: number): number {
  const open = sp(frame, T.captureOpen);
  const close = sp(frame, T.captureClose);
  const p = open * (1 - close);
  return p < 0.002 ? 0 : p;
}

export function typedAt(frame: number): { text: string; typing: boolean } {
  for (const line of CAPTURE_LINES) {
    if (frame < line.typeFrom) return { text: "", typing: false };
    if (frame < line.submit) {
      const n = Math.floor(lin(frame, line.typeFrom, line.typeTo - line.typeFrom) * line.text.length);
      return { text: line.text.slice(0, n), typing: frame < line.typeTo };
    }
  }
  return { text: "", typing: false };
}

// ---------- Toasts ----------

interface ScriptToast {
  id: number;
  message: string;
  undo?: Op[];
  from: number;
  to: number;
}

const added = CAPTURE_LINES.map((line, i): ScriptToast => {
  const task = stateAt(line.submit).tasks[line.id]!;
  const next = CAPTURE_LINES[i + 1]?.submit ?? line.submit + 45;
  return { id: i + 1, message: `Added to ${task.date ? relativeDay(task.date, TODAY) : "Brain Dump"}`, from: line.submit, to: next };
});
const doneToast: ScriptToast = {
  id: 100,
  message: `Done: ${stateAt(T.checkClick).tasks["t-report"]!.title}`,
  undo: undoDone,
  from: T.checkClick + 4,
  to: T.checkDone,
};
const toasts = [...added, doneToast];

export function activeToast(frame: number): ScriptToast | null {
  return toasts.find((t) => frame >= t.from && frame < t.to) ?? null;
}

// ---------- Card motion ----------

export interface SlotMotion {
  rows: number;
  opacity: number;
  ghost: boolean;
}

const PHANTOM = "~left";

/** Tasks that have just left a list, kept for a moment so the gap closes on the spring. */
export function phantomsAt(frame: number): { container: string; index: number; task: Task }[] {
  return moves
    .filter((m) => frame >= m.drop && frame < m.drop + 14)
    .map((m) => ({ container: m.from, index: m.fromIndex, task: { ...m.task, id: `${m.id}${PHANTOM}`, start: null } }));
}

export function slotMotion(id: string, container: string, frame: number): SlotMotion {
  if (id.endsWith(PHANTOM)) {
    const realId = id.slice(0, -PHANTOM.length);
    const move = moves.find((m) => m.id === realId && frame >= m.drop && frame < m.drop + 14);
    const p = move ? sp(frame, move.drop, 1.3) : 1;
    return { rows: Math.max(0, 1 - p), opacity: 0.4 * (1 - p), ghost: false };
  }
  const move = [...moves].reverse().find((m) => m.id === id && frame >= m.pickup);
  if (move && frame < move.drop) return { rows: 1, opacity: 1, ghost: container === move.from };
  if (move && frame < move.drop + 16) {
    const rows = Math.min(1, sp(frame, move.drop, 1.3));
    return { rows, opacity: frame < move.settle ? 0 : move.timebox ? rows : 1, ghost: false };
  }
  const made = created.find((c) => c.id === id && frame < c.frame + 16);
  if (made) {
    const rows = Math.min(1, sp(frame, made.frame, 1.2));
    return { rows, opacity: rows, ghost: false };
  }
  return { rows: 1, opacity: 1, ghost: false };
}

export function cardExpandedAt(id: string, frame: number): boolean {
  return id === "t-report" && frame >= T.chipClick && frame < T.checkIn;
}

export function dragStateAt(frame: number): {
  preview: { date: DateKey; start: TimeKey; minutes: number } | null;
  insertion: { container: string; index: number } | null;
} {
  const move = moves.find((m) => frame >= m.drop - 11 && frame < m.drop && m.pickup !== m.drop - 16);
  if (!move) return { preview: null, insertion: null };
  if (move.timebox) return { preview: { date: TODAY, start: move.start!, minutes: move.task.estimate ?? 30 }, insertion: null };
  return { preview: null, insertion: { container: move.to, index: -1 } };
}

// ---------- Layout phases ----------

export function phaseOf(frame: number): Phase {
  if (frame >= T.nightIn) return "night";
  if (frame >= T.timeboxIn) return "timebox";
  return "plan";
}

export function layoutAt(format: Format, phase: Phase): Layout {
  return format.layouts[phase];
}

// ---------- Geometry of the real layout ----------

/** Measured from the rendered planner. Column and panel sizes are DESIGN.md tokens. */
const G = {
  topbar: 52,
  sidebar: 272,
  column: 272,
  gap: 16,
  timebox: 280,
  headerRow: 56,
  listPad: 12,
  composer: 36,
  listGap: 8,
  card: 68,
  chipFromRight: 34,
  beanX: 22,
  timeboxTop: 137,
  gutter: 56,
  hour: 80,
};

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export const columnX = (l: Layout, k: number): number => (l.sidebar ? G.sidebar : 0) + G.gap + k * (G.column + G.gap);
const listLeft = (l: Layout, container: string): number =>
  container.startsWith("day:") ? columnX(l, dayIndex(container.slice(4))) : G.listPad;
const listWidth = (container: string): number => (container.startsWith("day:") ? G.column : G.sidebar - G.listPad * 2 - 1);
const listTop = G.topbar + G.headerRow + G.listPad + G.composer + G.listGap;

function dayIndex(date: DateKey): number {
  return Math.round((moment(date, "00:00") - moment(TODAY, "00:00")) / 86_400_000);
}

function slotTop(s: BeansState, container: string, index: number): number {
  return listTop + index * (G.card + G.listGap) + (listIn(s, container).length && index < 0 ? 0 : 0);
}

function cardRect(s: BeansState, l: Layout, id: string): { x: number; y: number; w: number } {
  const task = s.tasks[id]!;
  const container = containerOf(task);
  const index = listIn(s, container).findIndex((t) => t.id === id);
  return { x: listLeft(l, container), y: slotTop(s, container, Math.max(index, 0)), w: listWidth(container) };
}

const timeboxX = (l: Layout): number => l.w - G.timebox + G.gutter + 1;

export function timeboxScrollAt(frame: number, l: Layout): number {
  const view = l.h - G.timeboxTop;
  const mins = Math.max(minutesOfDay(clockAt(Math.min(frame, T.midnight - 1))), 8 * 60 + 41);
  return clamp((mins / 60 - 1) * G.hour, 0, 24 * G.hour - view);
}

function timeboxY(l: Layout, time: TimeKey, frame: number): number {
  return G.timeboxTop + (timeToMinutes(time) / 60) * G.hour - timeboxScrollAt(frame, l);
}

export const COLUMN_STEP = G.column + G.gap;
/** How many days the real Board keeps to the left of today. */
export const BOARD_PAD_DAYS = 14;

export function boardScrollAt(frame: number): number {
  const out = sp(frame, T.weekScroll, 0.7);
  const back = sp(frame, T.weekBack, 0.7);
  return COLUMN_STEP * 3 * (out - back);
}

// ---------- Pointer ----------

type Target =
  | { kind: "card"; id: string }
  | { kind: "slot"; container: string }
  | { kind: "timebox"; time: TimeKey }
  | { kind: "edge"; id: string }
  | { kind: "edgeBy"; id: string; minutes: number }
  | { kind: "chip"; id: string }
  | { kind: "play"; id: string }
  | { kind: "bean"; id: string }
  | { kind: "rest"; x: number; y: number };

interface Leg {
  at: number;
  to: Target;
  speed: number;
}

interface Press {
  at: number;
  up: number;
}

const legs: Leg[] = [];
const presses: Press[] = [];

function pushDrag(beat: DragBeat, to: Target) {
  legs.push({ at: beat.reach, to: { kind: "card", id: beat.id }, speed: 0.75 });
  legs.push({ at: beat.pickup, to, speed: 0.6 });
  presses.push({ at: beat.pickup, up: beat.drop });
}

pushDrag(DRAGS.dragReport, { kind: "slot", container: `day:${TODAY}` });
pushDrag(DRAGS.dragCar, { kind: "slot", container: `day:${TODAY}` });
pushDrag(DRAGS.dragRun, { kind: "slot", container: `day:${TODAY}` });
pushDrag(DRAGS.dragLogo, { kind: "slot", container: `day:${TOMORROW}` });
pushDrag(DRAGS.boxReport, { kind: "timebox", time: "09:15" });
pushDrag(DRAGS.boxRun, { kind: "timebox", time: "10:45" });
legs.push({ at: T.resizeIn, to: { kind: "edge", id: "t-report" }, speed: 0.7 });
legs.push({ at: T.resizeGrab, to: { kind: "edgeBy", id: "t-report", minutes: 30 }, speed: 0.4 });
presses.push({ at: T.resizeGrab, up: T.resizeDone });
legs.push({ at: T.timerIn, to: { kind: "chip", id: "t-report" }, speed: 0.7 });
presses.push({ at: T.chipClick - 4, up: T.chipClick + 1 });
legs.push({ at: T.chipClick + 4, to: { kind: "play", id: "t-report" }, speed: 0.8 });
presses.push({ at: T.playClick - 4, up: T.playClick + 1 });
legs.push({ at: T.lapseEnd, to: { kind: "bean", id: "t-report" }, speed: 0.6 });
presses.push({ at: T.checkClick - 4, up: T.checkClick + 1 });
legs.sort((a, b) => a.at - b.at);

const POINTER_FROM = T.dragsIn - 14;
const POINTER_TO = T.checkDone - 10;

function resolve(target: Target, frame: number, l: Layout): Point {
  const s = stateAt(frame);
  switch (target.kind) {
    case "rest":
      return { x: target.x, y: target.y };
    case "card": {
      const c = cardRect(s, l, target.id);
      return { x: c.x + c.w * 0.45, y: c.y + G.card / 2 };
    }
    case "slot": {
      const list = listIn(s, target.container);
      return { x: listLeft(l, target.container) + G.column * 0.45, y: slotTop(s, target.container, list.length) + G.card / 2 };
    }
    case "timebox":
      return { x: timeboxX(l) + (G.timebox - G.gutter) * 0.5, y: timeboxY(l, target.time, frame) };
    case "edge":
    case "edgeBy": {
      const t = s.tasks[target.id]!;
      const end = timeToMinutes(t.start ?? "09:00") + (t.estimate ?? 30) + (target.kind === "edgeBy" ? target.minutes : 0);
      const time = `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
      return { x: timeboxX(l) + (G.timebox - G.gutter) * 0.5, y: timeboxY(l, time, frame) - 3 };
    }
    case "chip": {
      const c = cardRect(s, l, target.id);
      return { x: c.x + c.w - G.chipFromRight, y: c.y + 24 };
    }
    case "play": {
      const c = cardRect(s, l, target.id);
      return { x: c.x + 26, y: c.y + G.card + 24 };
    }
    case "bean": {
      const c = cardRect(s, l, target.id);
      return { x: c.x + G.beanX, y: c.y + 24 };
    }
  }
}

export interface PointerState {
  x: number;
  y: number;
  visible: number;
  pressed: boolean;
}

const pointerCache = new Map<string, Point[]>();

function legEnds(format: Format): Point[] {
  const key = format.id;
  const hit = pointerCache.get(key);
  if (hit) return hit;
  const out = legs.map((leg) => resolve(leg.to, leg.at, layoutAt(format, phaseOf(leg.at))));
  pointerCache.set(key, out);
  return out;
}

export function pointerAt(format: Format, frame: number): PointerState {
  const ends = legEnds(format);
  let i = -1;
  while (i < legs.length - 1 && legs[i + 1]!.at <= frame) i++;
  const end = i < 0 ? { x: 960, y: 520 } : ends[i]!;
  const start = i <= 0 ? { x: end.x + 80, y: end.y + 160 } : ends[i - 1]!;
  const leg = legs[Math.max(i, 0)]!;
  const p = i < 0 ? 0 : sp(frame, leg.at, leg.speed);
  const arc = Math.sin(Math.PI * clamp(p, 0, 1)) * Math.min(24, Math.hypot(end.x - start.x, end.y - start.y) * 0.06);
  const visible = sp(frame, POINTER_FROM) * (1 - sp(frame, POINTER_TO));
  return {
    x: mix(start.x, end.x, p),
    y: mix(start.y, end.y, p) - arc,
    visible,
    pressed: presses.some((press) => frame >= press.at && frame < press.up),
  };
}

// ---------- The card in the air ----------

export interface Overlay {
  task: Task;
  x: number;
  y: number;
  /** 1 while it hangs from the pointer or flies, 0 once it has landed. */
  lift: number;
}

export function overlaysAt(format: Format, frame: number): Overlay[] {
  const l = layoutAt(format, phaseOf(frame));
  const out: Overlay[] = [];
  for (const m of moves) {
    if (frame < m.pickup || frame >= m.settle + (m.timebox ? 0 : 1)) continue;
    const task = stateAt(m.pickup).tasks[m.id]!;
    const before = stateAt(m.pickup - 1);
    const from = cardRect(before, l, m.id);
    const flight = FLIGHTS.find((f) => f.id === m.id);
    if (flight) {
      const toX = columnX(l, 1);
      const toY = slotTop(stateAt(flight.land), m.to, listIn(stateAt(flight.land), m.to).length - 1);
      const p = sp(frame, flight.pickup, 0.7);
      out.push({ task, x: mix(from.x, toX, p), y: mix(from.y, toY, p), lift: 1 - sp(frame, flight.land - 4) });
      continue;
    }
    const pointer = pointerAt(format, frame);
    const grab = { x: from.w * 0.45, y: G.card / 2 };
    const air = sp(frame, m.pickup);
    const held = { x: mix(from.x, pointer.x - grab.x, air), y: mix(from.y, pointer.y - grab.y, air) };
    if (frame < m.drop || m.timebox) {
      out.push({ task, ...held, lift: 1 });
    } else {
      const landed = cardRect(stateAt(m.drop), l, m.id);
      const p = lin(frame, m.drop, m.settle - m.drop);
      out.push({ task, x: mix(held.x, landed.x, p), y: mix(held.y, landed.y, p), lift: 1 - p });
    }
  }
  return out;
}

// ---------- Camera ----------

export interface Shot {
  at: number;
  region: (l: Layout) => Box;
  speed?: number;
}

const full = (l: Layout): Box => ({ x0: 0, y0: 0, x1: l.w, y1: l.h });

function capturedBox(l: Layout): Box {
  const cx = l.w / 2;
  return { x0: cx - 320, y0: 86, x1: cx + 320, y1: 300 };
}

function cardFocus(id: string, frame: number, padX: number, padY: number) {
  return (l: Layout): Box => {
    const c = cardRect(stateAt(frame), l, id);
    return { x0: c.x - padX, y0: c.y - padY, x1: c.x + padX, y1: c.y + padY };
  };
}

function blockBox(l: Layout): Box {
  const x = l.w - G.timebox;
  return { x0: x, y0: 100, x1: l.w, y1: 470 };
}

const SHOTS: Shot[] = [
  { at: T.windowIn, region: full },
  { at: T.captureOpen, region: capturedBox, speed: 0.6 },
  { at: CAPTURE_LINES[1]!.typeFrom, region: (l) => ({ x0: 0, y0: 52, x1: Math.min(l.w, 1060), y1: 620 }), speed: 0.55 },
  { at: T.dragsIn - 24, region: (l) => ({ x0: 0, y0: 52, x1: columnX(l, 2), y1: 560 }), speed: 0.55 },
  { at: T.weekScroll - 6, region: full, speed: 0.55 },
  { at: T.timeboxIn - 2, region: (l) => ({ x0: l.sidebar ? 272 : 0, y0: 52, x1: l.w, y1: Math.min(l.h, 640) }), speed: 0.55 },
  { at: T.resizeIn - 2, region: blockBox, speed: 0.55 },
  { at: T.timerIn, region: (l) => ({ x0: columnX(l, 0) - 12, y0: 104, x1: columnX(l, 0) + 412, y1: 420 }), speed: 0.55 },
  { at: T.lapseStart, region: (l) => ({ x0: columnX(l, 0) - 16, y0: 52, x1: l.w, y1: l.h }), speed: 0.45 },
  { at: T.checkIn, region: cardFocus("t-report", T.checkIn, 110, 62), speed: 0.55 },
  { at: T.nightIn, region: full, speed: 0.55 },
  { at: T.moonEnd - 10, region: (l) => ({ x0: columnX(l, 0) - 16, y0: 52, x1: columnX(l, 2) - 8, y1: 620 }), speed: 0.55 },
];

export interface Camera {
  /** Output pixels per planner pixel. */
  scale: number;
  /** Top-left of the planner, in output pixels. */
  x: number;
  y: number;
}

function frameBox(format: Format, l: Layout, box: Box): Camera {
  const { view, margin } = format;
  const fit = Math.min((view.w - margin * 2) / l.w, (view.h - margin * 2) / l.h);
  const fill = Math.min((view.w - margin * 2) / (box.x1 - box.x0), (view.h - margin * 2) / (box.y1 - box.y0));
  const scale = Math.max(fit, Math.min(fill, format.id === "wide" ? 2.6 : 3));
  const place = (size: number, stage: number, lo: number, hi: number, offset: number) => {
    const span = stage * scale;
    if (span <= size - margin * 2 + 1) return offset + (size - span) / 2;
    const want = offset + size / 2 - ((lo + hi) / 2) * scale;
    return clamp(want, offset + size - margin - span, offset + margin);
  };
  return { scale, x: place(view.w, l.w, box.x0, box.x1, view.x), y: place(view.h, l.h, box.y0, box.y1, view.y) };
}

export function cameraAt(format: Format, frame: number): Camera {
  const phase = phaseOf(frame);
  const l = layoutAt(format, phase);
  let i = 0;
  while (i < SHOTS.length - 1 && SHOTS[i + 1]!.at <= frame) i++;
  const shot = SHOTS[i]!;
  const prev = SHOTS[Math.max(0, i - 1)]!;
  const a = frameBox(format, l, prev.region(l));
  const b = frameBox(format, l, shot.region(l));
  const p = sp(frame, shot.at, shot.speed ?? 0.6);
  // Zooms run on a log scale, so they feel even.
  const scale = Math.exp(mix(Math.log(a.scale), Math.log(b.scale), p));
  const t = (scale - a.scale) / (b.scale - a.scale || 1);
  const blend = Math.abs(b.scale - a.scale) < 0.001 ? p : t;
  return { scale, x: mix(a.x, b.x, blend), y: mix(a.y, b.y, blend) };
}

/** Square and vertical cuts rearrange the planner between chapters. This dips over the change. */
export function dipAt(format: FormatId, frame: number): number {
  if (format === "wide") return 0;
  const near = Math.min(Math.abs(frame - T.timeboxIn), Math.abs(frame - T.nightIn));
  return clamp(1 - near / 6, 0, 1);
}

export const allFormats = Object.values(FORMATS);

import { createContext, useContext } from "react";

export type FormatId = "wide" | "square" | "vertical";
export type Phase = "plan" | "timebox" | "night";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Which panels the planner shows, and its size in CSS pixels. */
export interface Layout {
  sidebar: boolean;
  timebox: boolean;
  w: number;
  h: number;
}

export interface Format {
  id: FormatId;
  composition: string;
  width: number;
  height: number;
  /** Where the planner shows, in output pixels. */
  view: Rect;
  /** Space kept clear around the planner when it fits the view. */
  margin: number;
  /** Where captions sit, in output pixels. */
  caption: Rect;
  layouts: Record<Phase, Layout>;
}

const wideLayout: Layout = { sidebar: true, timebox: true, w: 1440, h: 690 };

export const FORMATS: Record<FormatId, Format> = {
  wide: {
    id: "wide",
    composition: "beans-demo-1920",
    width: 1920,
    height: 1080,
    view: { x: 0, y: 0, w: 1920, h: 952 },
    margin: 40,
    caption: { x: 64, y: 952, w: 1792, h: 128 },
    layouts: { plan: wideLayout, timebox: wideLayout, night: wideLayout },
  },
  square: {
    id: "square",
    composition: "beans-demo-square",
    width: 1080,
    height: 1080,
    view: { x: 0, y: 0, w: 1080, h: 864 },
    margin: 24,
    caption: { x: 48, y: 864, w: 984, h: 216 },
    layouts: {
      plan: { sidebar: true, timebox: false, w: 864, h: 680 },
      timebox: { sidebar: false, timebox: true, w: 688, h: 541 },
      night: { sidebar: false, timebox: false, w: 688, h: 541 },
    },
  },
  vertical: {
    id: "vertical",
    composition: "beans-demo-vertical",
    width: 1080,
    height: 1920,
    view: { x: 0, y: 96, w: 1080, h: 1320 },
    margin: 24,
    caption: { x: 48, y: 1416, w: 984, h: 288 },
    layouts: {
      plan: { sidebar: true, timebox: false, w: 864, h: 1065 },
      timebox: { sidebar: false, timebox: true, w: 584, h: 720 },
      night: { sidebar: false, timebox: false, w: 592, h: 730 },
    },
  },
};

export const FormatContext = createContext<Format>(FORMATS.wide);

export function useFormat(): Format {
  return useContext(FormatContext);
}

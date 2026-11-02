"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { DateKey, Op, TimeKey } from "@beans/core";

export type View = "tasks" | "calendar";
export type CalendarRange = "day" | "week" | "month" | 3;
export type SidebarTab = "lists" | "due" | "templates";
export type PhoneTab = "dump" | "today" | "timebox";
export type SettingsSection =
  | "general"
  | "calendar"
  | "timer"
  | "labels"
  | "features"
  | "shortcuts"
  | "account";

export interface BoardApi {
  scrollTo(date: DateKey): void;
  step(direction: 1 | -1): void;
}

export interface Toast {
  id: number;
  message: string;
  undo?: Op[];
}

export interface Filter {
  labelIds: string[];
  showCompleted: boolean;
  showTimeboxed: boolean;
}

export interface Draft {
  date: DateKey;
  start: TimeKey | null;
  estimate: number | null;
}

interface UiState {
  view: View;
  setView: (v: View) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  timeboxOpen: boolean;
  setTimeboxOpen: (v: boolean) => void;
  sidebarTab: SidebarTab;
  setSidebarTab: (t: SidebarTab) => void;
  /** Visible list in the sidebar; `null` is the Brain Dump, `"all"` shows every list. */
  activeList: string | null | "all";
  setActiveList: (id: string | null | "all") => void;
  focusMode: boolean;
  setFocusMode: (v: boolean) => void;
  /** The board registers how to scroll itself; the top bar calls it. */
  registerBoard: (api: BoardApi | null) => void;
  board: () => BoardApi | null;
  calendarRange: CalendarRange;
  setCalendarRange: (r: CalendarRange) => void;
  calendarDate: DateKey | null;
  setCalendarDate: (d: DateKey | null) => void;
  timeboxDate: DateKey | null;
  setTimeboxDate: (d: DateKey | null) => void;
  openTaskId: string | null;
  openTask: (id: string | null) => void;
  draft: Draft | null;
  setDraft: (d: Draft | null) => void;
  filter: Filter;
  setFilter: (f: Filter) => void;
  selection: string[];
  setSelection: (ids: string[]) => void;
  toggleSelected: (id: string) => void;
  focusedTaskId: string | null;
  setFocusedTaskId: (id: string | null) => void;
  dialog: null | "capture" | "search" | "shortcuts" | "trash" | "analytics" | "planning" | "shutdown";
  setDialog: (d: UiState["dialog"]) => void;
  settingsSection: SettingsSection | null;
  openSettings: (s: SettingsSection | null) => void;
  phoneTab: PhoneTab;
  setPhoneTab: (t: PhoneTab) => void;
  toasts: Toast[];
  toast: (message: string, undo?: Op[]) => void;
  dismissToast: (id: number) => void;
}

const UiContext = createContext<UiState | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [view, changeView] = useState<View>("tasks");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [timeboxOpen, setTimeboxOpen] = useState(true);
  // The calendar needs the room, so it opens with the right panel shut. Tasks gets back whatever it had.
  const tasksPanelOpen = useRef(true);
  const setView = useCallback(
    (next: View) => {
      if (next === view) return;
      if (next === "calendar") {
        tasksPanelOpen.current = timeboxOpen;
        setTimeboxOpen(false);
      } else {
        setTimeboxOpen(tasksPanelOpen.current);
      }
      changeView(next);
    },
    [view, timeboxOpen],
  );
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("lists");
  const [activeList, setActiveList] = useState<string | null | "all">(null);
  const [focusMode, setFocusMode] = useState(false);
  const boardApi = useRef<BoardApi | null>(null);
  const registerBoard = useCallback((api: BoardApi | null) => {
    boardApi.current = api;
  }, []);
  const board = useCallback(() => boardApi.current, []);
  const [calendarRange, setCalendarRange] = useState<CalendarRange>("week");
  const [calendarDate, setCalendarDate] = useState<DateKey | null>(null);
  const [timeboxDate, setTimeboxDate] = useState<DateKey | null>(null);
  const [openTaskId, openTask] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [filter, setFilter] = useState<Filter>({ labelIds: [], showCompleted: true, showTimeboxed: true });
  const [selection, setSelection] = useState<string[]>([]);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<UiState["dialog"]>(null);
  const [settingsSection, openSettings] = useState<SettingsSection | null>(null);
  const [phoneTab, setPhoneTab] = useState<PhoneTab>("today");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextToast = useRef(1);

  const toggleSelected = useCallback(
    (id: string) => setSelection((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])),
    [],
  );
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    (message: string, undo?: Op[]) => {
      const id = nextToast.current++;
      setToasts((t) => [...t.slice(-2), { id, message, undo }]);
      setTimeout(() => dismissToast(id), 5000);
    },
    [dismissToast],
  );

  const value = useMemo<UiState>(
    () => ({
      view, setView, sidebarOpen, setSidebarOpen, timeboxOpen, setTimeboxOpen, sidebarTab, setSidebarTab,
      activeList, setActiveList, focusMode, setFocusMode, registerBoard, board, calendarRange,
      setCalendarRange, calendarDate, setCalendarDate, timeboxDate, setTimeboxDate, openTaskId, openTask,
      draft, setDraft, filter, setFilter, selection, setSelection, toggleSelected, focusedTaskId,
      setFocusedTaskId, dialog, setDialog, settingsSection, openSettings, phoneTab, setPhoneTab, toasts,
      toast, dismissToast,
    }),
    [
      view, setView, sidebarOpen, timeboxOpen, sidebarTab, activeList, focusMode, registerBoard, board,
      calendarRange, calendarDate, timeboxDate, openTaskId, draft, filter, selection, toggleSelected,
      focusedTaskId, dialog, settingsSection, phoneTab, toasts, toast, dismissToast,
    ],
  );
  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi(): UiState {
  const ui = useContext(UiContext);
  if (!ui) throw new Error("useUi must be used inside UiProvider");
  return ui;
}

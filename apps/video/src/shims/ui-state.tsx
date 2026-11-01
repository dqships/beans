import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import type { useUi as useRealUi } from "../../../web/src/planner/ui-state";
import { activeToast, captureOpenness, layoutAt, phaseOf } from "../script";
import { useFormat } from "../formats";

type UiState = ReturnType<typeof useRealUi>;

const UiContext = createContext<UiState | null>(null);
const noop = () => {};

const base: Omit<UiState, "dialog" | "toasts" | "sidebarOpen" | "timeboxOpen"> = {
  view: "tasks",
  setView: noop,
  setSidebarOpen: noop,
  setTimeboxOpen: noop,
  sidebarTab: "lists",
  setSidebarTab: noop,
  activeList: null,
  setActiveList: noop,
  focusMode: false,
  setFocusMode: noop,
  registerBoard: noop,
  board: () => null,
  calendarRange: "week",
  setCalendarRange: noop,
  calendarDate: null,
  setCalendarDate: noop,
  timeboxDate: null,
  setTimeboxDate: noop,
  openTaskId: null,
  openTask: noop,
  draft: null,
  setDraft: noop,
  filter: { labelIds: [], showCompleted: true, showTimeboxed: true },
  setFilter: noop,
  selection: [],
  setSelection: noop,
  toggleSelected: noop,
  focusedTaskId: null,
  setFocusedTaskId: noop,
  setDialog: noop,
  settingsSection: null,
  openSettings: noop,
  phoneTab: "today",
  setPhoneTab: noop,
  toast: noop,
  dismissToast: noop,
};

/** Frame-driven stand-in for the planner's UI state. */
export function VideoUiProvider({ children }: { children: ReactNode }) {
  const frame = useCurrentFrame();
  const format = useFormat();
  const dialog = captureOpenness(frame) > 0 ? "capture" : null;
  const toast = activeToast(frame);
  const toastId = toast?.id ?? 0;
  const layout = layoutAt(format, phaseOf(frame));
  const value = useMemo<UiState>(
    () => ({
      ...base,
      dialog,
      toasts: toast ? [toast] : [],
      sidebarOpen: layout.sidebar,
      timeboxOpen: layout.timebox,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dialog, toastId, layout.sidebar, layout.timebox],
  );
  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

/** The real tree wraps itself in this; the film already provides the state above it. */
export function UiProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useUi(): UiState {
  const ui = useContext(UiContext);
  if (!ui) throw new Error("useUi must be used inside VideoUiProvider");
  return ui;
}

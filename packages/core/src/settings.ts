import type { Settings } from "./model";
import { onboardingStart } from "./onboarding";

/** Defaults for a new account. */
export function defaultSettings(timeZone: string, now: number = Date.now()): Settings {
  return {
    id: "settings",
    updatedAt: now,
    theme: "system",
    timeZone,
    sidebar: "one",
    newTaskPosition: "top",
    defaultEstimate: null,
    detectLabels: true,
    rollover: true,
    rolloverPosition: "bottom",
    rolloverRepeating: false,
    completedToBottom: true,
    completeWithSubtasks: true,
    fillActual: true,
    autoStartNext: false,
    weekStart: 0,
    dayStartHour: 0,
    showWeekends: true,
    timeFormat: "12h",
    snapMinutes: 15,
    workloadLimit: 8 * 60,
    pomodoroFocus: 25,
    pomodoroBreak: 5,
    pomodoroSound: true,
    dueSoonDays: 7,
    calendarZoom: 1,
    features: {
      dueDates: false,
      priority: false,
      templates: false,
      pomodoro: false,
      dailyPlanning: true,
      analytics: true,
    },
    lastRollover: null,
    activeTimer: null,
    plannedDays: [],
    shutdownDays: [],
    onboarding: onboardingStart(),
  };
}

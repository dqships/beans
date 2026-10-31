"use client";

import { useEffect } from "react";
import { useActions, useSettings, useToday } from "@/data/hooks";
import { anyLayerOpen } from "@/ui/layers";
import { useUi } from "./ui-state";

function typing(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

function cards(scope: ParentNode = document): HTMLElement[] {
  return Array.from(scope.querySelectorAll<HTMLElement>("[data-task-id]")).filter((el) => el.offsetParent !== null);
}

function focusCard(el: HTMLElement | undefined, setFocused: (id: string) => void) {
  if (!el) return;
  el.focus();
  el.scrollIntoView({ block: "nearest", inline: "nearest" });
  setFocused(el.dataset.taskId!);
}

/** Global keyboard shortcuts. Single keys only fire when no field has focus. */
export function useShortcuts() {
  const ui = useUi();
  const actions = useActions();
  const today = useToday();
  const settings = useSettings();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (mod && key === "k") {
        e.preventDefault();
        ui.setDialog("search");
        return;
      }
      if (mod && e.key === ",") {
        e.preventDefault();
        ui.openSettings("general");
        return;
      }
      if (mod && e.shiftKey && key === "p" && settings?.features.dailyPlanning) {
        e.preventDefault();
        ui.setDialog("planning");
        return;
      }
      if (typing(e.target) || anyLayerOpen() || e.altKey) return;

      const focusedEl = ui.focusedTaskId
        ? document.querySelector<HTMLElement>(`[data-task-id="${ui.focusedTaskId}"]`)
        : null;

      if (focusedEl && ui.focusedTaskId) {
        const id = ui.focusedTaskId;
        if (mod && (e.key === "Backspace" || e.key === "Delete")) {
          e.preventDefault();
          ui.toast("Moved to Trash", actions.deleteTask(id));
          ui.setFocusedTaskId(null);
          return;
        }
        if (!mod && key === "c") {
          e.preventDefault();
          const card = focusedEl.querySelector<HTMLButtonElement>("[role=checkbox]");
          card?.click();
          return;
        }
        if (!mod && (key === "e" || e.key === "Enter")) {
          e.preventDefault();
          ui.openTask(id);
          return;
        }
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const scope = focusedEl.closest("[data-drop]") ?? document;
          const list = cards(scope);
          const i = list.indexOf(focusedEl);
          focusCard(list[e.key === "ArrowDown" ? i + 1 : i - 1], ui.setFocusedTaskId);
          return;
        }
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          const zones = Array.from(document.querySelectorAll<HTMLElement>("[data-drop]")).filter((z) => z.offsetParent !== null);
          const current = focusedEl.closest<HTMLElement>("[data-drop]");
          let i = current ? zones.indexOf(current) : -1;
          const dir = e.key === "ArrowRight" ? 1 : -1;
          for (i += dir; i >= 0 && i < zones.length; i += dir) {
            const first = cards(zones[i]!)[0];
            if (first) {
              focusCard(first, ui.setFocusedTaskId);
              break;
            }
          }
          return;
        }
      }
      if (e.key === "Escape") {
        if (ui.selection.length) ui.setSelection([]);
        if (ui.focusedTaskId) {
          ui.setFocusedTaskId(null);
          (document.activeElement as HTMLElement | null)?.blur();
        }
        return;
      }
      if (mod) return;

      if (e.key === "?" ) {
        e.preventDefault();
        ui.setDialog("shortcuts");
      } else if (e.shiftKey && key === "f") {
        e.preventDefault();
        if (ui.view === "calendar") ui.setView("tasks");
        ui.setFocusMode(!ui.focusMode);
      } else if (e.shiftKey && key === "t") {
        e.preventDefault();
        if (ui.view === "calendar") ui.setCalendarDate(today);
        else ui.board()?.scrollTo(today);
      } else if (e.shiftKey && key === "b") {
        e.preventDefault();
        ui.setSidebarOpen(true);
        requestAnimationFrame(() => {
          const zone = document.querySelector<HTMLElement>('[data-drop^="list:"]');
          focusCard(zone ? cards(zone)[0] : undefined, ui.setFocusedTaskId);
        });
      } else if (e.shiftKey) {
        return;
      } else if (key === "q") {
        e.preventDefault();
        ui.setDialog("capture");
      } else if (key === "t") {
        e.preventDefault();
        ui.setDraft({ date: today, start: null, estimate: settings?.defaultEstimate ?? null });
      } else if (e.key === "Tab" && document.activeElement === document.body) {
        e.preventDefault();
        ui.setView(ui.view === "calendar" ? "tasks" : "calendar");
      } else if (ui.view === "calendar" && (key === "d" || key === "w" || key === "m")) {
        e.preventDefault();
        ui.setCalendarRange(key === "d" ? "day" : key === "w" ? "week" : "month");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ui, actions, today, settings]);
}

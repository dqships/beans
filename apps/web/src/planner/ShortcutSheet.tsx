"use client";

import { X } from "@phosphor-icons/react";
import { IconButton } from "@/ui/Button";
import { Kbd } from "@/ui/controls";
import { Modal } from "@/ui/Modal";
import { useUi } from "./ui-state";
import styles from "./dialogs.module.css";

export const SHORTCUTS: { group: string; items: [string[], string][] }[] = [
  {
    group: "Anywhere",
    items: [
      [["Q"], "Quick Capture"],
      [["T"], "New task today"],
      [["Ctrl", "K"], "Search"],
      [["Shift", "F"], "Focus on today"],
      [["Tab"], "Switch Calendar and Tasks"],
      [["Shift", "T"], "Go to today"],
      [["Shift", "B"], "First Brain Dump task"],
      [["Ctrl", ","], "Settings"],
      [["Ctrl", "Shift", "P"], "Plan your day"],
      [["?"], "This list"],
    ],
  },
  {
    group: "Selected task",
    items: [
      [["Enter"], "Open"],
      [["C"], "Mark done"],
      [["E"], "Set estimate"],
      [["Ctrl", "⌫"], "Delete"],
      [["↑", "↓"], "Previous or next task"],
      [["←", "→"], "First task on the previous or next day"],
      [["Esc"], "Deselect"],
    ],
  },
  {
    group: "Calendar",
    items: [
      [["D"], "Day"],
      [["W"], "Week"],
      [["M"], "Month"],
    ],
  },
  {
    group: "Quick Capture",
    items: [
      [["Enter"], "Add task"],
      [["Ctrl", "Enter"], "Add and keep typing"],
    ],
  },
];

export function ShortcutSheet() {
  const ui = useUi();
  return (
    <Modal open={ui.dialog === "shortcuts"} onClose={() => ui.setDialog(null)} label="Keyboard shortcuts" width="wide">
      <div className={styles.sheet}>
        <div className={styles.sheetHead}>
          <h2 className={styles.dialogTitle}>Keyboard shortcuts</h2>
          <IconButton icon={X} label="Close" onClick={() => ui.setDialog(null)} />
        </div>
        <p className={styles.hint}>Single-key shortcuts work when you aren&apos;t typing in a field. On a Mac, use Cmd for Ctrl.</p>
        <div className={styles.sheetGrid}>
          {SHORTCUTS.map((g) => (
            <section key={g.group}>
              <h3 className={styles.sheetGroup}>{g.group}</h3>
              <dl className={styles.sheetList}>
                {g.items.map(([keys, label]) => (
                  <div key={label} className={styles.sheetRow}>
                    <dt>{label}</dt>
                    <dd>
                      {keys.map((k) => (
                        <Kbd key={k}>{k}</Kbd>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </Modal>
  );
}

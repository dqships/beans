"use client";

import { X } from "@phosphor-icons/react";
import { useActions } from "@/data/hooks";
import { IconButton } from "@/ui/Button";
import { useUi } from "./ui-state";
import styles from "./shell.module.css";

export function Toasts() {
  const ui = useUi();
  const actions = useActions();
  return (
    <div className={styles.toasts} role="status" aria-live="polite">
      {ui.toasts.map((t) => (
        <div key={t.id} className={styles.toast}>
          <span className={styles.toastText}>{t.message}</span>
          {t.undo?.length ? (
            <button
              type="button"
              className={styles.toastUndo}
              onClick={() => {
                actions.apply(t.undo!);
                ui.dismissToast(t.id);
              }}
            >
              Undo
            </button>
          ) : null}
          <IconButton icon={X} label="Dismiss" iconSize="sm" onClick={() => ui.dismissToast(t.id)} className={styles.toastClose} />
        </div>
      ))}
    </div>
  );
}

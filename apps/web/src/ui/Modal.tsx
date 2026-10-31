"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLayer } from "./layers";
import styles from "./ui.module.css";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  width?: "modal" | "capture" | "wide" | "full";
  placement?: "center" | "top";
  className?: string;
}

/** Centered dialog over a scrim. Escape and scrim clicks close it. */
export function Modal({ open, onClose, label, children, width = "modal", placement = "center", className }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  useLayer(open, onClose);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const id = requestAnimationFrame(() => {
      const target =
        panel.current?.querySelector<HTMLElement>("[data-autofocus]") ??
        panel.current?.querySelector<HTMLElement>("input, textarea, button, [tabindex='0']");
      (target ?? panel.current)?.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(id);
      previous?.focus?.({ preventScroll: true });
    };
  }, [open]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className={`${styles.scrim} ${placement === "top" ? styles.scrimTop : ""}`} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`${styles.modal} ${styles[`w-${width}`]} ${className ?? ""}`}
        onKeyDown={(e) => {
          if (e.key !== "Tab" || !panel.current) return;
          const focusable = Array.from(
            panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input, textarea, select, [tabindex='0'], [contenteditable='true']"),
          );
          if (!focusable.length) return;
          const first = focusable[0]!;
          const last = focusable[focusable.length - 1]!;
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Panel that slides in from the right edge. */
export function Drawer({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  useLayer(open, onClose);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className={styles.scrim} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside role="dialog" aria-modal="true" aria-label={label} className={styles.drawer}>
        {children}
      </aside>
    </div>,
    document.body,
  );
}

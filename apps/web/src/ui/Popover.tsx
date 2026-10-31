"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useLayer } from "./layers";
import { tokenPx } from "./token";
import styles from "./ui.module.css";

interface PopoverProps {
  open: boolean;
  onClose: () => void;
  anchor: RefObject<HTMLElement | null> | { x: number; y: number } | null;
  placement?: "bottom-start" | "bottom-end" | "top-start" | "right-start";
  children: ReactNode;
  className?: string;
  label?: string;
}

/** Floating panel placed next to an anchor, kept inside the viewport. */
export function Popover({ open, onClose, anchor, placement = "bottom-start", children, className, label }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const { isTop } = useLayer(open, onClose);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const el = ref.current;
      if (!el || !anchor) return;
      const gap = tokenPx("--space-1");
      const margin = tokenPx("--space-2");
      let rect: { left: number; right: number; top: number; bottom: number };
      if ("current" in anchor) {
        const a = anchor.current;
        if (!a) return;
        rect = a.getBoundingClientRect();
      } else {
        rect = { left: anchor.x, right: anchor.x, top: anchor.y, bottom: anchor.y };
      }
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      let left = placement === "bottom-end" ? rect.right - w : placement === "right-start" ? rect.right + gap : rect.left;
      let top = placement.startsWith("top") ? rect.top - h - gap : placement === "right-start" ? rect.top : rect.bottom + gap;
      if (top + h > window.innerHeight - margin) top = Math.max(margin, rect.top - h - gap);
      if (top < margin) top = margin;
      left = Math.min(Math.max(margin, left), window.innerWidth - w - margin);
      setPos({ left, top });
    };
    place();
    const observer = new ResizeObserver(place);
    if (ref.current) observer.observe(ref.current);
    window.addEventListener("resize", place);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
    };
  }, [open, anchor, placement]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (anchor && "current" in anchor && anchor.current?.contains(target)) return;
      if (isTop()) onClose();
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open, onClose, anchor, isTop]);

  useEffect(() => {
    if (open && pos) {
      const first = ref.current?.querySelector<HTMLElement>("[data-autofocus], input, [role=menuitem], button");
      first?.focus({ preventScroll: true });
    }
  }, [open, pos]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      className={`${styles.popover} ${className ?? ""}`}
      style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? "visible" : "hidden" }}
    >
      {children}
    </div>,
    document.body,
  );
}

import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { captureOpenness } from "../script";
import { mix } from "../motion";
import { token } from "@beans/tokens";
import styles from "@/ui/ui.module.css";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  width?: "modal" | "capture" | "wide" | "full";
  placement?: "center" | "top";
  className?: string;
}

/** The real Modal's markup, without the portal, opened by the frame. */
export function Modal({ open, label, children, width = "modal", placement = "center", className }: ModalProps) {
  const frame = useCurrentFrame();
  if (!open) return null;
  const p = captureOpenness(frame);
  return (
    <div
      className={`${styles.scrim} ${placement === "top" ? styles.scrimTop : ""}`}
      style={{ opacity: p, paddingTop: token("--layout-section") }}
    >
      <div
        role="dialog"
        aria-label={label}
        className={`${styles.modal} ${styles[`w-${width}`]} ${className ?? ""}`}
        style={{ translate: `0 ${mix(12, 0, p)}px`, scale: mix(0.98, 1, p), opacity: p }} // token-ok: the panel's "rise" keyframe
      >
        {children}
      </div>
    </div>
  );
}

export function Drawer(): null {
  return null;
}

"use client";

import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import styles from "./ui.module.css";

/** Phosphor Regular icon at a token size. */
export function Icon({ icon: Glyph, size = "sm", label }: { icon: PhosphorIcon; size?: "sm" | "md"; label?: string }) {
  return (
    <Glyph
      className={size === "sm" ? styles.iconSm : styles.iconMd}
      weight="regular"
      aria-hidden={label ? undefined : true}
      aria-label={label}
    />
  );
}

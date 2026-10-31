"use client";

import type { KeyboardEvent, ReactNode } from "react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { Icon } from "./Icon";
import styles from "./ui.module.css";

/** Keyboard-navigable list of actions, used inside a Popover. */
export function Menu({ children, label }: { children: ReactNode; label: string }) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[role=menuitem],[role=menuitemradio],[role=menuitemcheckbox]"));
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items[next]?.focus();
  };
  return (
    <div role="menu" aria-label={label} className={styles.menu} onKeyDown={onKeyDown}>
      {children}
    </div>
  );
}

export function MenuItem({
  icon,
  children,
  onSelect,
  danger,
  checked,
  hint,
  trailing,
  disabled,
}: {
  icon?: PhosphorIcon;
  children: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  checked?: boolean;
  hint?: string;
  trailing?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role={checked === undefined ? "menuitem" : "menuitemradio"}
      aria-checked={checked}
      className={`${styles.menuItem} ${danger ? styles.menuDanger : ""} ${checked ? styles.menuChecked : ""}`}
      onClick={onSelect}
      disabled={disabled}
    >
      {icon ? <Icon icon={icon} /> : null}
      <span className={styles.menuLabel}>{children}</span>
      {hint ? <kbd className={styles.kbd}>{hint}</kbd> : null}
      {trailing}
    </button>
  );
}

export function MenuDivider() {
  return <div role="separator" className={styles.menuDivider} />;
}

export function MenuHeading({ children }: { children: ReactNode }) {
  return <div className={styles.menuHeading}>{children}</div>;
}

"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { Icon } from "./Icon";
import styles from "./ui.module.css";

export function Switcher<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; icon?: PhosphorIcon }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={styles.switcher}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`${styles.segment} ${value === o.value ? styles.segmentActive : ""}`}
          onClick={() => onChange(o.value)}
        >
          {o.icon ? <Icon icon={o.icon} /> : null}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`${styles.toggle} ${checked ? styles.toggleOn : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.toggleKnob} />
    </button>
  );
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={`${styles.input} ${className ?? ""}`} {...rest} />;
});

export function Chip({
  children,
  icon,
  tone = "plain",
  onClick,
  title,
  className,
}: {
  children?: ReactNode;
  icon?: PhosphorIcon;
  tone?: "plain" | "danger" | "warning" | "primary" | "quiet";
  onClick?: () => void;
  title?: string;
  className?: string;
}) {
  const cls = `${styles.chip} ${styles[`chip-${tone}`]} ${className ?? ""}`;
  const content = (
    <>
      {icon ? <Icon icon={icon} /> : null}
      {children}
    </>
  );
  return onClick ? (
    <button type="button" className={`${cls} ${styles.chipButton}`} onClick={onClick} title={title}>
      {content}
    </button>
  ) : (
    <span className={cls} title={title}>
      {content}
    </span>
  );
}

export function LabelDot({ color }: { color: string | null | undefined }) {
  return <span className={styles.labelDot} style={{ background: color ? `var(--label-${color})` : "var(--color-border)" }} />;
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className={styles.kbd}>{children}</kbd>;
}

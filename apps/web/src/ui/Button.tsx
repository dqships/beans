"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { Icon } from "./Icon";
import styles from "./ui.module.css";

type Variant = "primary" | "secondary" | "quiet" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "sm";
  icon?: PhosphorIcon;
  iconSize?: "sm" | "md";
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", icon, iconSize = "sm", children, className, type = "button", ...rest },
  ref,
) {
  const classes = [styles.button, styles[variant], size === "sm" ? styles.small : "", !children ? styles.iconOnly : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
  return (
    <button ref={ref} type={type} className={classes} {...rest}>
      {icon ? <Icon icon={icon} size={iconSize} /> : null}
      {children}
    </button>
  );
});

/** Icon-only quiet button. `label` is required for screen readers. */
export const IconButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, "children"> & { label: string; icon: PhosphorIcon }>(
  function IconButton({ label, variant = "quiet", size = "sm", iconSize = "md", ...rest }, ref) {
    return <Button ref={ref} variant={variant} size={size} iconSize={iconSize} aria-label={label} title={label} {...rest} />;
  },
);

import { useEffect, useState, type ReactNode } from "react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { BeanMark } from "@/ui/garden";
import { Button, IconButton } from "../kit";
import lists from "./lists.module.css";
import styles from "./paper.module.css";

/** Class names shared by the tools that print: `paper` on the tool's root (ink on white, whatever the theme), then `noPrint`, `printOnly` and `checked` (a finished row) inside it, and `blank`. */
export const paper = styles;

/** How long a button stays armed before it goes back to asking. */
const ARMED_MS = 4000;

function useArmed(): [boolean, (armed: boolean) => void] {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), ARMED_MS);
    return () => clearTimeout(id);
  }, [armed]);
  return [armed, setArmed];
}

/**
 * A button for something that can't be undone. The first click turns it red
 * and asks; a second click within a few seconds does it. It never prints.
 */
export function ConfirmButton({ children, confirm, onConfirm, disabled, icon }: { children: ReactNode; confirm: string; onConfirm: () => void; disabled?: boolean; icon?: PhosphorIcon }) {
  const [armed, setArmed] = useArmed();
  return (
    <Button
      variant={armed ? "danger" : "quiet"}
      icon={icon}
      className={styles.noPrint}
      disabled={disabled}
      onBlur={() => setArmed(false)}
      onClick={() => {
        if (!armed) return setArmed(true);
        setArmed(false);
        onConfirm();
      }}
    >
      <span className={styles.swap}>
        <span className={armed ? styles.swapOff : undefined}>{children}</span>
        <span className={armed ? undefined : styles.swapOff}>{confirm}</span>
      </span>
    </Button>
  );
}

/** The same two-click promise for an icon button, such as deleting a habit and all its days. */
export function ConfirmIconButton({ icon, label, confirm, onConfirm }: { icon: PhosphorIcon; label: string; confirm: string; onConfirm: () => void }) {
  const [armed, setArmed] = useArmed();
  return (
    <IconButton
      icon={icon}
      iconSize="sm"
      variant={armed ? "danger" : "quiet"}
      label={armed ? confirm : label}
      className={styles.noPrint}
      onBlur={() => setArmed(false)}
      onClick={() => {
        if (!armed) return setArmed(true);
        setArmed(false);
        onConfirm();
      }}
    />
  );
}

/** Text you edit in place. It is saved when you leave the field or press Enter; Escape puts it back. */
export function EditableText({ value, label, onCommit, maxLength = 300, className }: { value: string; label: string; onCommit: (text: string) => void; maxLength?: number; className?: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft !== null && draft !== value) onCommit(draft);
    setDraft(null);
  };
  return (
    <input
      className={`${lists.text} ${className ?? ""}`}
      value={draft ?? value}
      aria-label={label}
      maxLength={maxLength}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setDraft(null);
      }}
    />
  );
}

/** Empty lines that show on paper only, so an unused list prints as one you can fill in by hand. */
export function BlankLines({ count, bean }: { count: number; bean?: boolean }) {
  return (
    <div className={styles.printOnly} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.blank}>
          {bean ? <BeanMark done={false} /> : null}
        </div>
      ))}
    </div>
  );
}

/** Moves keyboard focus to the row after (or before) the one a control is in, before that row goes away. Returns false when there is no other row. */
export function focusNextRow(control: HTMLElement, selector: string): boolean {
  const row = control.closest("li");
  const other = row?.nextElementSibling ?? row?.previousElementSibling;
  const target = other?.querySelector<HTMLElement>(selector);
  if (!target) return false;
  target.focus();
  return true;
}

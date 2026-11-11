import { useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Printer } from "@phosphor-icons/react/dist/ssr/Printer";
import { Button } from "@/ui/Button";
import styles from "./kit.module.css";

export { Button, IconButton } from "@/ui/Button";
export { Icon } from "@/ui/Icon";

/** Class names for layout inside a tool: `stack`, `stackTight`, `bar`, `barEnd`, `barCenter`, `columns`, `digits`, `muted`, `noPrint`, `unit`. */
export const kit = styles;

const join = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(" ");

/** A labelled control. The label wraps it, so no ids are needed. */
export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={join(styles.field, className)}>
      <span className={styles.label}>{label}</span>
      {children}
      {hint ? <span className={styles.hint}>{hint}</span> : null}
    </label>
  );
}

type TextProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & { value: string; onValue: (value: string) => void; narrow?: boolean };

/** A text, time or date input. `type` picks which. */
export function TextInput({ value, onValue, narrow, className, type = "text", ...rest }: TextProps) {
  return <input {...rest} type={type} value={value} onChange={(e) => onValue(e.target.value)} className={join(styles.input, narrow && styles.narrow, className)} />;
}

type NumberProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type" | "min" | "max"> & {
  value: number;
  onValue: (value: number) => void;
  min?: number;
  max?: number;
  narrow?: boolean;
};

/**
 * A number input that can be emptied while typing. It reports each valid
 * number, held between `min` and `max`, and shows the real value again on blur.
 */
export function NumberInput({ value, onValue, min, max, narrow = true, className, ...rest }: NumberProps) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      {...rest}
      type="number"
      inputMode={rest.inputMode ?? "decimal"}
      min={min}
      max={max}
      value={draft ?? String(value)}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        const parsed = Number(raw);
        if (raw.trim() === "" || !Number.isFinite(parsed)) return;
        onValue(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, parsed)));
      }}
      onBlur={() => setDraft(null)}
      className={join(styles.input, narrow && styles.narrow, className)}
    />
  );
}

export function TextArea({ value, onValue, className, ...rest }: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> & { value: string; onValue: (value: string) => void }) {
  return <textarea {...rest} value={value} onChange={(e) => onValue(e.target.value)} className={join(styles.input, styles.area, className)} />;
}

export function Select<T extends string>({
  value,
  onValue,
  options,
  className,
  ...rest
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value"> & { value: T; onValue: (value: T) => void; options: readonly { value: T; label: string }[] }) {
  return (
    <select {...rest} value={value} onChange={(e) => onValue(e.target.value as T)} className={join(styles.input, className)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** The switcher from DESIGN.md: pick one of a few. Real radio buttons, so arrow keys work. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  /** Read to screen readers; not shown. */
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  const name = useId();
  return (
    <fieldset className={join(styles.segmented, className)}>
      <legend className="visually-hidden">{label}</legend>
      {options.map((option) => (
        <label key={option.value} className={styles.segment}>
          <input type="radio" name={name} value={option.value} checked={option.value === value} onChange={() => onChange(option.value)} />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}

/** An answer. Screen readers hear it change. */
export function Readout({ label, value, note, small, className }: { label: string; value: ReactNode; note?: ReactNode; small?: boolean; className?: string }) {
  return (
    <div className={join(styles.readout, small && styles.readoutSmall, className)}>
      <span className={styles.label}>{label}</span>
      <output className={styles.readoutValue} aria-live="polite">
        {value}
      </output>
      {note ? <span className={styles.readoutNote}>{note}</span> : null}
    </div>
  );
}

export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className={styles.check}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/** Prints the page. The tools' print styles leave only the tool on the paper. */
export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <Button icon={Printer} className={styles.noPrint} onClick={() => window.print()}>
      {label}
    </Button>
  );
}

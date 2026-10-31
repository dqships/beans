"use client";

import { useRef, useState } from "react";
import { Clock, PlusCircle, Tag } from "@phosphor-icons/react";
import { formatDuration, type DateKey, type Priority } from "@beans/core";
import { useActions, useLabel, useSettings } from "@/data/hooks";
import { LabelDot } from "@/ui/controls";
import { Icon } from "@/ui/Icon";
import { Popover } from "@/ui/Popover";
import { EstimatePicker, LabelPicker, PriorityFlag, PriorityPicker } from "./pickers";
import { useUi } from "./ui-state";
import cardStyles from "./card.module.css";

interface ComposerProps {
  date?: DateKey | null;
  listId?: string | null;
  /** Shown on the right of the closed "Add a task" row. */
  trailing?: React.ReactNode;
  placeholder?: string;
}

/** "Add a task" row that opens an inline composer. Enter saves and keeps it open. */
export function Composer({ date = null, listId = null, trailing, placeholder = "Add a task" }: ComposerProps) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" className={cardStyles.addButton} onClick={() => setOpen(true)} data-composer-for={date ?? listId ?? "brain-dump"}>
        <Icon icon={PlusCircle} />
        <span>{placeholder}</span>
        {trailing}
      </button>
    );
  }
  return <ComposerForm date={date} listId={listId} onClose={() => setOpen(false)} />;
}

function ComposerForm({ date, listId, onClose }: { date: DateKey | null; listId: string | null; onClose: () => void }) {
  const actions = useActions();
  const ui = useUi();
  const settings = useSettings();
  const [title, setTitle] = useState("");
  const [labelId, setLabelId] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<number | null>(settings?.defaultEstimate ?? null);
  const [priority, setPriority] = useState<Priority | null>(null);
  const [picker, setPicker] = useState<null | "label" | "estimate" | "priority">(null);
  const label = useLabel(labelId);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const labelRef = useRef<HTMLButtonElement>(null);
  const estimateRef = useRef<HTMLButtonElement>(null);
  const priorityRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const save = () => {
    if (!title.trim()) return;
    actions.createTask({ title, date, listId, labelId, estimate, priority });
    setTitle("");
    setLabelId(null);
    setPriority(null);
    setEstimate(settings?.defaultEstimate ?? null);
    inputRef.current?.focus();
  };

  return (
    <form
      ref={formRef}
      className={cardStyles.composer}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      onBlur={(e) => {
        const next = e.relatedTarget as Node | null;
        if (picker || (next && formRef.current?.contains(next))) return;
        if (!title.trim()) onClose();
      }}
    >
      <textarea
        ref={inputRef}
        autoFocus
        rows={1}
        className={cardStyles.composerInput}
        placeholder="What needs doing?"
        aria-label="Task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            save();
          } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            if (title.trim()) save();
            onClose();
            ui.setFocusedTaskId(null);
          }
        }}
      />
      <div className={cardStyles.composerControls}>
        <button ref={labelRef} type="button" className={cardStyles.hoverButton} onClick={() => setPicker("label")}>
          {label ? <LabelDot color={label.color} /> : <Icon icon={Tag} />} {label ? label.name : "Label"}
        </button>
        <button ref={estimateRef} type="button" className={cardStyles.hoverButton} onClick={() => setPicker("estimate")}>
          <Icon icon={Clock} /> {estimate ? formatDuration(estimate) : "Estimate"}
        </button>
        {settings?.features.priority ? (
          <button ref={priorityRef} type="button" className={cardStyles.hoverButton} aria-label="Priority" onClick={() => setPicker("priority")}>
            <PriorityFlag priority={priority} />
          </button>
        ) : null}
        <span className={cardStyles.composerHint}>Enter to add</span>
      </div>
      <Popover open={picker === "label"} onClose={() => setPicker(null)} anchor={labelRef} label="Label">
        <LabelPicker
          value={labelId}
          onChange={(id) => {
            setLabelId(id);
            setPicker(null);
            inputRef.current?.focus();
          }}
        />
      </Popover>
      <Popover open={picker === "estimate"} onClose={() => setPicker(null)} anchor={estimateRef} label="Estimate">
        <EstimatePicker
          value={estimate}
          onChange={(m) => {
            setEstimate(m);
            setPicker(null);
            inputRef.current?.focus();
          }}
        />
      </Popover>
      <Popover open={picker === "priority"} onClose={() => setPicker(null)} anchor={priorityRef} label="Priority">
        <PriorityPicker
          value={priority}
          onChange={(p) => {
            setPriority(p);
            setPicker(null);
            inputRef.current?.focus();
          }}
        />
      </Popover>
    </form>
  );
}

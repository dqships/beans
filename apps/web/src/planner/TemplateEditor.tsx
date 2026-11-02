"use client";

import { useState } from "react";
import { Plus, X } from "@phosphor-icons/react";
import { formatDuration, type Priority } from "@beans/core";
import { useActions, useLabel, useSettings, useTemplates } from "@/data/hooks";
import { Button, IconButton } from "@/ui/Button";
import { LabelDot, TextInput } from "@/ui/controls";
import { Modal } from "@/ui/Modal";
import { Popover } from "@/ui/Popover";
import { EstimatePicker, LabelPicker, PriorityFlag, PriorityPicker } from "./pickers";
import styles from "./modal.module.css";
import { useRef } from "react";

/** Create or edit a template. Changes only affect tasks made later. */
export function TemplateEditor({ id, onClose }: { id: string | "new" | null; onClose: () => void }) {
  const templates = useTemplates();
  const existing = id && id !== "new" ? templates.find((t) => t.id === id) : undefined;
  if (!id) return null;
  return (
    <Modal open onClose={onClose} label={existing ? "Edit template" : "New template"}>
      <TemplateForm key={id} initial={existing} onClose={onClose} />
    </Modal>
  );
}

function TemplateForm({ initial, onClose }: { initial?: ReturnType<typeof useTemplates>[number]; onClose: () => void }) {
  const actions = useActions();
  const settings = useSettings();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [estimate, setEstimate] = useState<number | null>(initial?.estimate ?? null);
  const [labelId, setLabelId] = useState<string | null>(initial?.labelId ?? null);
  const [priority, setPriority] = useState<Priority | null>(initial?.priority ?? null);
  const [notes, setNotes] = useState(initial?.notes.replace(/<[^>]+>/g, "") ?? "");
  const [subtasks, setSubtasks] = useState<string[]>(initial?.subtasks ?? []);
  const [picker, setPicker] = useState<null | "estimate" | "label" | "priority">(null);
  const label = useLabel(labelId);
  const estimateRef = useRef<HTMLButtonElement>(null);
  const labelRef = useRef<HTMLButtonElement>(null);
  const priorityRef = useRef<HTMLButtonElement>(null);

  const save = () => {
    if (!title.trim()) return;
    const fields = {
      title: title.trim(),
      estimate,
      labelId,
      priority,
      notes: notes.trim() ? `<p>${notes.trim().replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>` : "",
      subtasks: subtasks.map((s) => s.trim()).filter(Boolean),
    };
    if (initial) actions.updateTemplate(initial.id, fields);
    else actions.createTemplate(fields);
    onClose();
  };

  return (
    <form
      className={styles.body}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className={styles.titleRow}>
        <input data-autofocus className={styles.titleInput} placeholder="Template name" aria-label="Template name" value={title} onChange={(e) => setTitle(e.target.value)} />
        <IconButton icon={X} label="Close" onClick={onClose} />
      </div>
      <div className={styles.fields}>
        <span className={styles.fieldName}>Estimate</span>
        <button ref={estimateRef} type="button" className={styles.fieldValue} onClick={() => setPicker("estimate")}>
          {estimate ? formatDuration(estimate) : <span className={styles.empty}>Click to add</span>}
        </button>
        <span className={styles.fieldName}>Label</span>
        <button ref={labelRef} type="button" className={styles.fieldValue} onClick={() => setPicker("label")}>
          {label ? (
            <>
              <LabelDot color={label.color} /> {label.name}
            </>
          ) : (
            <span className={styles.empty}>Click to add</span>
          )}
        </button>
        {settings?.features.priority ? (
          <>
            <span className={styles.fieldName}>Priority</span>
            <button ref={priorityRef} type="button" className={styles.fieldValue} onClick={() => setPicker("priority")}>
              {priority ? (
                <>
                  <PriorityFlag priority={priority} /> {priority[0]!.toUpperCase() + priority.slice(1)}
                </>
              ) : (
                <span className={styles.empty}>Click to add</span>
              )}
            </button>
          </>
        ) : null}
      </div>
      <h3 className={styles.sectionTitle}>Notes</h3>
      <textarea className={styles.plainNotes} rows={3} placeholder="Add notes" aria-label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <h3 className={styles.sectionTitle}>Subtasks</h3>
      <div className={styles.templateSubtasks}>
        {subtasks.map((s, i) => (
          <div key={i} className={styles.templateSubtask}>
            <TextInput aria-label={`Subtask ${i + 1}`} value={s} onChange={(e) => setSubtasks(subtasks.map((x, j) => (j === i ? e.target.value : x)))} />
            <IconButton icon={X} label="Remove subtask" onClick={() => setSubtasks(subtasks.filter((_, j) => j !== i))} />
          </div>
        ))}
        <Button size="sm" variant="quiet" icon={Plus} onClick={() => setSubtasks([...subtasks, ""])}>
          Add subtask
        </Button>
      </div>
      <div className={styles.footer}>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={!title.trim()}>
          {initial ? "Save template" : "Create template"}
        </Button>
      </div>
      <Popover open={picker === "estimate"} onClose={() => setPicker(null)} anchor={estimateRef} label="Estimate">
        <EstimatePicker value={estimate} onChange={(m) => { setEstimate(m); setPicker(null); }} />
      </Popover>
      <Popover open={picker === "label"} onClose={() => setPicker(null)} anchor={labelRef} label="Label">
        <LabelPicker value={labelId} onChange={(l) => { setLabelId(l); setPicker(null); }} />
      </Popover>
      <Popover open={picker === "priority"} onClose={() => setPicker(null)} anchor={priorityRef} label="Priority">
        <PriorityPicker value={priority} onChange={(p) => { setPriority(p); setPicker(null); }} />
      </Popover>
    </form>
  );
}

"use client";

import { useMemo, useState } from "react";
import { CalendarBlank, Clock, Hourglass, Tray } from "@phosphor-icons/react";
import { formatDuration, formatTime, parseCapture, relativeDay } from "@beans/core";
import { useActions, useLabels, useLists, useSettings, useToday } from "@/data/hooks";
import { Button } from "@/ui/Button";
import { Chip, Kbd, LabelDot } from "@/ui/controls";
import { Modal } from "@/ui/Modal";
import { useUi } from "./ui-state";
import styles from "./dialogs.module.css";

export function QuickCapture() {
  const ui = useUi();
  return (
    <Modal open={ui.dialog === "capture"} onClose={() => ui.setDialog(null)} label="Quick Capture" width="capture" placement="top">
      <CaptureBody />
    </Modal>
  );
}

function CaptureBody() {
  const ui = useUi();
  const actions = useActions();
  const today = useToday();
  const labels = useLabels();
  const lists = useLists();
  const settings = useSettings();
  const [text, setText] = useState("");
  const parsed = useMemo(() => parseCapture(text, { today, labels, lists }), [text, today, labels, lists]);
  const label = labels.find((l) => l.id === parsed.labelId);
  const list = lists.find((l) => l.id === parsed.listId);
  const format = settings?.timeFormat ?? "12h";

  const save = (keepOpen: boolean) => {
    if (!parsed.title) return;
    actions.createTask({
      title: parsed.title,
      date: parsed.date,
      listId: parsed.date ? null : parsed.listId,
      start: parsed.start,
      labelId: parsed.labelId,
      estimate: parsed.estimate ?? undefined,
    });
    ui.toast(`Added to ${parsed.date ? relativeDay(parsed.date, today) : list ? list.name : "Brain Dump"}`);
    setText("");
    if (!keepOpen) ui.setDialog(null);
  };

  // Highlight the parts that were understood.
  const pieces: { text: string; kind?: string }[] = [];
  let cursor = 0;
  for (const t of parsed.tokens) {
    if (t.start > cursor) pieces.push({ text: text.slice(cursor, t.start) });
    pieces.push({ text: text.slice(t.start, t.end), kind: t.kind });
    cursor = t.end;
  }
  pieces.push({ text: text.slice(cursor) });

  return (
    <form
      className={styles.capture}
      onSubmit={(e) => {
        e.preventDefault();
        save(false);
      }}
    >
      <div className={styles.captureField}>
        <div className={styles.captureMirror} aria-hidden="true">
          {pieces.map((p, i) => (
            <span key={i} className={p.kind ? styles[`tok-${p.kind}`] : undefined}>
              {p.text}
            </span>
          ))}
        </div>
        <input
          data-autofocus
          className={`${styles.bigInput} ${styles.captureInput}`}
          placeholder="Call the vet tomorrow 3pm #home =15m"
          aria-label="Quick Capture"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              save(true);
            }
          }}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div className={styles.preview} aria-live="polite">
        {parsed.title ? <strong className={styles.previewTitle}>{parsed.title}</strong> : <span className={styles.hint}>Type a task. Add a day, #label, @list or =time.</span>}
        <div className={styles.previewChips}>
          <Chip icon={parsed.date ? CalendarBlank : Tray}>{parsed.date ? relativeDay(parsed.date, today) : list ? `${list.icon} ${list.name}` : "Brain Dump"}</Chip>
          {parsed.start ? <Chip icon={Clock}>{formatTime(parsed.start, format)}</Chip> : null}
          {label ? (
            <Chip>
              <LabelDot color={label.color} /> {label.name}
            </Chip>
          ) : null}
          {parsed.estimate ? <Chip icon={Hourglass}>{formatDuration(parsed.estimate)}</Chip> : null}
        </div>
      </div>
      <div className={styles.captureFooter}>
        <span className={styles.hint}>
          <Kbd>Enter</Kbd> add · <Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> add another
        </span>
        <Button type="submit" variant="primary" disabled={!parsed.title}>
          Add task
        </Button>
      </div>
    </form>
  );
}

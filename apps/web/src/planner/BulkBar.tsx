"use client";

import { useRef, useState } from "react";
import { CalendarBlank, Check, Tag, Trash, X } from "@phosphor-icons/react";
import { useActions } from "@/data/hooks";
import { Button, IconButton } from "@/ui/Button";
import { Popover } from "@/ui/Popover";
import { DatePicker, LabelPicker } from "./pickers";
import { useUi } from "./ui-state";
import styles from "./shell.module.css";

/** Actions for several selected tasks. Shift-click cards to select. */
export function BulkBar() {
  const ui = useUi();
  const actions = useActions();
  const [picker, setPicker] = useState<null | "label" | "date">(null);
  const labelRef = useRef<HTMLButtonElement>(null);
  const dateRef = useRef<HTMLButtonElement>(null);
  const ids = ui.selection;
  if (!ids.length) return null;
  const done = () => ui.setSelection([]);
  return (
    <div className={styles.bulkBar} role="toolbar" aria-label="Selected tasks">
      <IconButton icon={X} label="Clear selection" onClick={done} />
      <span className={styles.bulkCount}>{ids.length} selected</span>
      <Button size="sm" icon={Check} onClick={() => { ui.toast(`Completed ${ids.length} tasks`, actions.completeTasks(ids)); done(); }}>
        Done
      </Button>
      <Button ref={dateRef} size="sm" icon={CalendarBlank} onClick={() => setPicker("date")}>
        Move
      </Button>
      <Button ref={labelRef} size="sm" icon={Tag} onClick={() => setPicker("label")}>
        Label
      </Button>
      <Button size="sm" icon={Trash} onClick={() => { ui.toast(`Moved ${ids.length} tasks to Trash`, actions.deleteTasks(ids)); done(); }}>
        Delete
      </Button>
      <Popover open={picker === "label"} onClose={() => setPicker(null)} anchor={labelRef} placement="top-start" label="Label">
        <LabelPicker
          value={null}
          onChange={(labelId) => {
            const undo = actions.apply(ids.map((id) => ({ kind: "patch" as const, table: "tasks" as const, id, fields: { labelId } })));
            ui.toast("Label changed", undo);
            setPicker(null);
            done();
          }}
        />
      </Popover>
      <Popover open={picker === "date"} onClose={() => setPicker(null)} anchor={dateRef} placement="top-start" label="Move to day">
        <DatePicker
          value={null}
          allowNone
          noneLabel="Move to Brain Dump"
          onChange={(date) => {
            const undo = actions.moveTasks(ids, { date, listId: null, start: null });
            ui.toast(`Moved ${ids.length} tasks`, undo);
            setPicker(null);
            done();
          }}
        />
      </Popover>
    </div>
  );
}

"use client";

import { useState } from "react";
import { ArrowCounterClockwise, X } from "@phosphor-icons/react";
import { useActions, useClock, useTrash } from "@/data/hooks";
import { Button, IconButton } from "@/ui/Button";
import { TextInput } from "@/ui/controls";
import { EmptyState } from "@/ui/garden";
import { Drawer } from "@/ui/Modal";
import { useUi } from "./ui-state";
import styles from "./drawer.module.css";

const DAY_MS = 86_400_000;
export const TRASH_DAYS = 30;

export function TrashDrawer() {
  const ui = useUi();
  return (
    <Drawer open={ui.dialog === "trash"} onClose={() => ui.setDialog(null)} label="Trash">
      <TrashBody />
    </Drawer>
  );
}

function TrashBody() {
  const ui = useUi();
  const items = useTrash();
  const actions = useActions();
  const now = useClock();
  const [query, setQuery] = useState("");
  const shown = items.filter((i) => i.title.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <div className={styles.drawer}>
      <div className={styles.head}>
        <h2 className={styles.title}>Trash</h2>
        <IconButton icon={X} label="Close Trash" onClick={() => ui.setDialog(null)} />
      </div>
      <p className={styles.hint}>Deleted tasks and lists stay here for {TRASH_DAYS} days, then they&apos;re gone for good.</p>
      <TextInput placeholder="Search Trash" aria-label="Search Trash" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul className={styles.list}>
        {shown.map((item) => {
          const left = Math.max(0, TRASH_DAYS - Math.floor((now - item.deletedAt) / DAY_MS));
          return (
            <li key={`${item.kind}-${item.id}`} className={styles.item}>
              <div className={styles.itemText}>
                <span className={styles.itemTitle}>{item.title || "Untitled task"}</span>
                <span className={styles.hint}>
                  {item.kind === "list" ? "List · " : ""}
                  {left === 1 ? "1 day left" : `${left} days left`}
                </span>
              </div>
              <Button
                size="sm"
                icon={ArrowCounterClockwise}
                onClick={() => {
                  if (item.kind === "task") actions.restoreTask(item.id);
                  else actions.restoreList(item.id);
                  ui.toast(item.kind === "task" ? "Restored to today" : "List restored");
                }}
              >
                {item.kind === "task" ? "Restore to today" : "Restore"}
              </Button>
            </li>
          );
        })}
      </ul>
      {items.length === 0 ? <EmptyState scene="rest" title="Trash is empty">Nothing to dig up here.</EmptyState> : null}
      {items.length > 0 ? (
        <div className={styles.footer}>
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm(`Delete ${items.length} item${items.length === 1 ? "" : "s"} for good? This can't be undone.`)) {
                actions.emptyTrash();
                ui.toast("Trash emptied");
              }
            }}
          >
            Empty Trash
          </Button>
        </div>
      ) : null}
    </div>
  );
}

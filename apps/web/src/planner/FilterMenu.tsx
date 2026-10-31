"use client";

import { useState } from "react";
import { Check, PencilSimple } from "@phosphor-icons/react";
import { useLabels } from "@/data/hooks";
import { LabelDot, TextInput, Toggle } from "@/ui/controls";
import { MenuDivider, MenuHeading, MenuItem } from "@/ui/Menu";
import { Icon } from "@/ui/Icon";
import { useUi } from "./ui-state";
import styles from "./shell.module.css";

export function FilterMenu() {
  const ui = useUi();
  const labels = useLabels();
  const [query, setQuery] = useState("");
  const { filter, setFilter } = ui;
  const shown = labels.filter((l) => l.name.toLowerCase().includes(query.trim().toLowerCase()));
  const toggleLabel = (id: string) =>
    setFilter({
      ...filter,
      labelIds: filter.labelIds.includes(id) ? filter.labelIds.filter((x) => x !== id) : [...filter.labelIds, id],
    });
  return (
    <div className={styles.filterMenu}>
      <TextInput placeholder="Search labels" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search labels" />
      <MenuHeading>Labels</MenuHeading>
      <div role="group" aria-label="Labels">
        {shown.length === 0 ? <p className={styles.muted}>No labels match.</p> : null}
        {shown.map((l) => (
          <button
            key={l.id}
            type="button"
            role="menuitemcheckbox"
            aria-checked={filter.labelIds.includes(l.id)}
            className={styles.filterRow}
            onClick={() => toggleLabel(l.id)}
          >
            <LabelDot color={l.color} />
            <span>{l.name}</span>
            {filter.labelIds.includes(l.id) ? <Icon icon={Check} /> : null}
          </button>
        ))}
        <button
          type="button"
          role="menuitemcheckbox"
          aria-checked={filter.labelIds.includes("none")}
          className={styles.filterRow}
          onClick={() => toggleLabel("none")}
        >
          <LabelDot color={null} />
          <span>No label</span>
          {filter.labelIds.includes("none") ? <Icon icon={Check} /> : null}
        </button>
      </div>
      <MenuItem icon={PencilSimple} onSelect={() => ui.openSettings("labels")}>
        Edit labels
      </MenuItem>
      <MenuDivider />
      <label className={styles.filterToggle}>
        <span>Show completed</span>
        <Toggle label="Show completed" checked={filter.showCompleted} onChange={(v) => setFilter({ ...filter, showCompleted: v })} />
      </label>
      <label className={styles.filterToggle}>
        <span>Show timeboxed</span>
        <Toggle label="Show timeboxed" checked={filter.showTimeboxed} onChange={(v) => setFilter({ ...filter, showTimeboxed: v })} />
      </label>
      {filter.labelIds.length ? (
        <MenuItem onSelect={() => setFilter({ ...filter, labelIds: [] })}>Clear label filter</MenuItem>
      ) : null}
    </div>
  );
}

/** Applies the board filter to a list of tasks. */
export function useFilteredTasks<T extends { labelId: string | null; done: boolean; start: string | null }>(tasks: T[]): T[] {
  const { filter } = useUi();
  return tasks.filter((t) => {
    if (!filter.showCompleted && t.done) return false;
    if (!filter.showTimeboxed && t.start) return false;
    if (filter.labelIds.length) {
      const key = t.labelId ?? "none";
      if (!filter.labelIds.includes(key)) return false;
    }
    return true;
  });
}

"use client";

import { useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { relativeDay } from "@beans/core";
import { useLists, useSearch, useToday } from "@/data/hooks";
import { EmptyState } from "@/ui/garden";
import { Icon } from "@/ui/Icon";
import { Modal } from "@/ui/Modal";
import { useUi } from "./ui-state";
import styles from "./dialogs.module.css";

export function SearchDialog() {
  const ui = useUi();
  return (
    <Modal open={ui.dialog === "search"} onClose={() => ui.setDialog(null)} label="Search" width="capture" placement="top">
      <SearchBody />
    </Modal>
  );
}

function SearchBody() {
  const ui = useUi();
  const today = useToday();
  const lists = useLists();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const results = useSearch(query);
  const open = (id: string) => {
    ui.setDialog(null);
    ui.openTask(id);
  };
  const where = (t: (typeof results)[number]) =>
    t.date ? relativeDay(t.date, today) : t.listId ? (lists.find((l) => l.id === t.listId)?.name ?? "List") : "Brain Dump";
  return (
    <div className={styles.search}>
      <div className={styles.searchField}>
        <Icon icon={MagnifyingGlass} size="md" />
        <input
          data-autofocus
          className={styles.bigInput}
          placeholder="Search tasks and notes"
          aria-label="Search tasks and notes"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && results[index]) {
              e.preventDefault();
              open(results[index].id);
            }
          }}
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls="search-results"
          aria-activedescendant={results[index] ? `result-${results[index].id}` : undefined}
        />
      </div>
      {query.trim() ? (
        results.length ? (
          <ul id="search-results" role="listbox" className={styles.results}>
            {results.map((t, i) => (
              <li
                key={t.id}
                id={`result-${t.id}`}
                role="option"
                aria-selected={i === index}
                className={`${styles.result} ${i === index ? styles.resultActive : ""}`}
                onMouseEnter={() => setIndex(i)}
                onClick={() => open(t.id)}
              >
                <span className={`${styles.resultTitle} ${t.done ? styles.resultDone : ""}`}>{t.title || "Untitled task"}</span>
                <span className={styles.resultWhere}>{where(t)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState compact scene="search" title="No tasks match">
            Repeating tasks only show up here once their day has been opened.
          </EmptyState>
        )
      ) : (
        <p className={styles.hint}>Use the arrow keys to move and Enter to open.</p>
      )}
    </div>
  );
}

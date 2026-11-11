import { useState } from "react";
import { ArrowDown } from "@phosphor-icons/react/dist/ssr/ArrowDown";
import { ArrowUp } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { Copy } from "@phosphor-icons/react/dist/ssr/Copy";
import { Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { Trash } from "@phosphor-icons/react/dist/ssr/Trash";
import { BeanCheckbox, Mascot } from "@/ui/garden";
import { copyText, newId, useStored } from "../hooks";
import { Button, IconButton, PrintButton, TextInput, kit } from "../kit";
import { EMPTY_TODO, MAX_ITEMS, addItem, clearDone, countDone, listAsText, moveItem, parseTodoList, removeItem, renameItem, toggleItem, type TodoItem } from "../logic/todo";
import styles from "./lists.module.css";

/** One task. Its text is edited in place and saved when you leave the field or press Enter. */
function Row({ item, first, last, onToggle, onRename, onMove, onRemove }: { item: TodoItem; first: boolean; last: boolean; onToggle: () => void; onRename: (text: string) => void; onMove: (delta: -1 | 1) => void; onRemove: () => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft !== null && draft !== item.text) onRename(draft);
    setDraft(null);
  };
  return (
    <li className={`${styles.row} ${item.done ? styles.done : ""}`}>
      <BeanCheckbox checked={item.done} onChange={onToggle} label={`${item.text} done`} />
      <input
        className={styles.text}
        value={draft ?? item.text}
        aria-label="Task"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setDraft(null);
        }}
      />
      <span className={`${styles.rowActions} ${kit.noPrint}`}>
        <IconButton icon={ArrowUp} label={`Move ${item.text} up`} iconSize="sm" disabled={first} onClick={() => onMove(-1)} />
        <IconButton icon={ArrowDown} label={`Move ${item.text} down`} iconSize="sm" disabled={last} onClick={() => onMove(1)} />
        <IconButton icon={Trash} label={`Delete ${item.text}`} iconSize="sm" onClick={onRemove} />
      </span>
    </li>
  );
}

export function ToDoList() {
  const [list, setList] = useStored("to-do-list", EMPTY_TODO, parseTodoList);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const { done, total } = countDone(list);
  const full = total >= MAX_ITEMS;

  const add = () => {
    if (!text.trim()) return;
    setList((current) => addItem(current, text, newId()));
    setText("");
  };

  return (
    <div className={styles.sheet}>
      <input className={styles.title} value={list.title} onChange={(e) => setList({ ...list, title: e.target.value.slice(0, 120) })} placeholder="To-do list" aria-label="List name" />

      <form
        className={`${styles.add} ${kit.noPrint}`}
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <TextInput value={text} onValue={setText} placeholder={full ? "This list is full" : "Add a task and press Enter"} aria-label="New task" maxLength={300} disabled={full} />
        <Button type="submit" variant="primary" icon={Plus} disabled={full || !text.trim()}>
          Add
        </Button>
      </form>

      {total === 0 ? (
        <div className={`${styles.rows} ${styles.empty}`}>
          <Mascot scene="idle" className={styles.emptyMascot} />
          <p className={styles.emptyTitle}>Nothing on the list yet.</p>
          <p>Add the first thing you need to do. Check it off and its bean sprouts.</p>
        </div>
      ) : (
        <ul className={styles.rows}>
          {list.items.map((item, i) => (
            <Row
              key={item.id}
              item={item}
              first={i === 0}
              last={i === total - 1}
              onToggle={() => setList((current) => toggleItem(current, item.id))}
              onRename={(next) => setList((current) => renameItem(current, item.id, next))}
              onMove={(delta) => setList((current) => moveItem(current, item.id, delta))}
              onRemove={() => setList((current) => removeItem(current, item.id))}
            />
          ))}
        </ul>
      )}

      <div className={styles.foot}>
        <span className={styles.count} role="status">
          {total === 0 ? "0 tasks" : `${done} of ${total} done`}
        </span>
        <span className={`${kit.bar} ${kit.noPrint}`}>
          <Button variant="quiet" disabled={done === 0} onClick={() => setList((current) => clearDone(current))}>
            Clear finished
          </Button>
          <Button
            icon={Copy}
            disabled={total === 0}
            onClick={async () => {
              setCopied(await copyText(listAsText(list)));
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
          <PrintButton />
        </span>
      </div>
    </div>
  );
}

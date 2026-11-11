import { useState } from "react";
import { Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { Trash } from "@phosphor-icons/react/dist/ssr/Trash";
import { BeanCheckbox } from "@/ui/garden";
import { newId, useStored } from "../hooks";
import { Button, IconButton, PrintButton, Select, TextInput, kit } from "../kit";
import { EMPTY_MATRIX, MAX_TEXT, QUADRANTS, addTask, clearDone, countDone, isFull, moveTask, parseMatrix, removeTask, renameTask, tasksIn, toggleTask, type Matrix, type MatrixTask, type QuadrantId } from "../logic/matrix";
import lists from "./lists.module.css";
import styles from "./matrix.module.css";
import { BlankLines, ConfirmButton, EditableText, focusNextRow, paper } from "./paper";

type Quadrant = (typeof QUADRANTS)[number];

/** What belongs in each quadrant, shown while it's empty. */
const HINTS: Record<QuadrantId, string> = {
  do: "Due today, or a real emergency.",
  schedule: "Matters, but isn't due yet. Give it a day.",
  delegate: "Has to happen soon, but not by you.",
  drop: "Not pressing and not worth it. Let it go.",
};

const MOVE_OPTIONS = QUADRANTS.map((quadrant) => ({ value: quadrant.id, label: quadrant.name }));

/** One quadrant: a garden bed with its own add field and its tasks. */
function Bed({ quadrant, tasks, full, setMatrix }: { quadrant: Quadrant; tasks: MatrixTask[]; full: boolean; setMatrix: (next: (current: Matrix) => Matrix) => void }) {
  const [text, setText] = useState("");

  /** Keeps the keyboard in the bed when the focused row is about to leave it: the next row's same control, or the bed itself. */
  const leaveRow = (control: Element | null, selector: string) => {
    if (!(control instanceof HTMLElement) || document.activeElement !== control) return;
    if (!focusNextRow(control, selector)) control.closest("section")?.focus();
  };

  return (
    <section className={`${styles.bed} ${styles[quadrant.id]}`} aria-label={`${quadrant.name}: ${quadrant.about}`} tabIndex={-1}>
      <div className={styles.bedHead}>
        <span className={styles.marker} aria-hidden="true" />
        <p className={styles.bedName}>{quadrant.name}</p>
        <p className={styles.bedAbout}>{quadrant.about}</p>
      </div>

      <form
        className={`${lists.add} ${paper.noPrint}`}
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          const id = newId();
          setMatrix((current) => addTask(current, quadrant.id, text, id));
          setText("");
        }}
      >
        <TextInput value={text} onValue={setText} placeholder={full ? "This quadrant is full" : "Add a task"} aria-label={`New task for ${quadrant.name}`} maxLength={MAX_TEXT} disabled={full} autoComplete="off" />
        <IconButton type="submit" icon={Plus} variant="secondary" size="md" label={`Add to ${quadrant.name}`} disabled={full || !text.trim()} />
      </form>

      {tasks.length === 0 ? (
        <div className={styles.tasks}>
          <p className={`${styles.hint} ${paper.noPrint}`}>{HINTS[quadrant.id]}</p>
          <BlankLines count={8} bean />
        </div>
      ) : (
        <ul className={styles.tasks}>
          {tasks.map((task) => (
            <li key={task.id} className={`${styles.task} ${task.done ? paper.checked : ""}`}>
              <BeanCheckbox checked={task.done} onChange={() => setMatrix((current) => toggleTask(current, task.id))} label={`${task.text} done`} />
              <EditableText className={styles.taskText} value={task.text} label="Task" maxLength={MAX_TEXT} onCommit={(next) => setMatrix((current) => renameTask(current, task.id, next))} />
              <Select
                className={`${styles.movePick} ${paper.noPrint}`}
                value={task.quadrant}
                options={MOVE_OPTIONS}
                aria-label={`Move ${task.text} to another quadrant`}
                data-pick
                onValue={(next) => {
                  leaveRow(document.activeElement, "[data-pick]");
                  setMatrix((current) => moveTask(current, task.id, next));
                }}
              />
              <IconButton
                icon={Trash}
                iconSize="sm"
                label={`Delete ${task.text}`}
                className={paper.noPrint}
                data-delete
                onClick={(e) => {
                  leaveRow(e.currentTarget, "[data-delete]");
                  setMatrix((current) => removeTask(current, task.id));
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function EisenhowerMatrix() {
  const [matrix, setMatrix] = useStored("eisenhower-matrix", EMPTY_MATRIX, parseMatrix);
  const { done, total } = countDone(matrix);

  return (
    <div className={`${lists.sheet} ${paper.paper}`}>
      <div className={styles.board}>
        {/* The axes. Each bed also says what it is in words, so these are for the eye only. */}
        <span className={`${styles.axis} ${styles.urgent}`} aria-hidden="true">
          Urgent
        </span>
        <span className={`${styles.axis} ${styles.notUrgent}`} aria-hidden="true">
          Not urgent
        </span>
        <span className={`${styles.axis} ${styles.side} ${styles.important}`} aria-hidden="true">
          <span>Important</span>
        </span>
        <span className={`${styles.axis} ${styles.side} ${styles.notImportant}`} aria-hidden="true">
          <span>Not important</span>
        </span>
        {QUADRANTS.map((quadrant) => (
          <Bed key={quadrant.id} quadrant={quadrant} tasks={tasksIn(matrix, quadrant.id)} full={isFull(matrix, quadrant.id)} setMatrix={setMatrix} />
        ))}
      </div>

      <div className={`${lists.foot} ${paper.noPrint}`}>
        <span className={lists.count} role="status">
          {total === 0 ? "0 tasks" : `${done} of ${total} done`}
        </span>
        <span className={kit.bar}>
          <ConfirmButton confirm="Clear it all?" disabled={total === 0} onConfirm={() => setMatrix(EMPTY_MATRIX)}>
            Clear all
          </ConfirmButton>
          <Button variant="quiet" disabled={done === 0} onClick={() => setMatrix((current) => clearDone(current))}>
            Clear finished
          </Button>
          <PrintButton />
        </span>
      </div>
    </div>
  );
}

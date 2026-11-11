import { CalendarCheck } from "@phosphor-icons/react/dist/ssr/CalendarCheck";
import { formatHour, localTimeZone, todayIn } from "@beans/core/dates";
import { BeanCheckbox } from "@/ui/garden";
import { useStored } from "../hooks";
import { Button, Field, PrintButton, Select, TextArea, TextInput, kit } from "../kit";
import {
  EMPTY_DAY_PLAN,
  MAX_LINE,
  MAX_NOTES,
  clearPlan,
  hourLines,
  isBlank,
  longDate,
  parseDayPlan,
  setDate,
  setEndHour,
  setHourText,
  setStartHour,
  setTodoText,
  setTop,
  toggleTodo,
} from "../logic/dayplan";
import styles from "./dayplan.module.css";
import lists from "./lists.module.css";
import { BlankLines, ConfirmButton, paper } from "./paper";

const HOURS = Array.from({ length: 24 }, (_, hour) => ({ value: String(hour), label: formatHour(hour, "12h") }));

/** How many empty lines the notes get on paper. */
const NOTE_LINES = 6;

export function DailyPlannerTemplate() {
  const [plan, setPlan] = useStored("daily-planner-template", EMPTY_DAY_PLAN, parseDayPlan);
  const hours = hourLines(plan);
  const written = longDate(plan.date);

  return (
    <div className={`${styles.page} ${paper.paper}`}>
      <div className={styles.head}>
        <div className={`${kit.bar} ${kit.barEnd} ${paper.noPrint}`}>
          <Field label="Date">
            <TextInput type="date" className={styles.date} value={plan.date} max="9999-12-31" onValue={(date) => setPlan((current) => setDate(current, date))} />
          </Field>
          <Button
            icon={CalendarCheck}
            onClick={() => {
              const today = todayIn(localTimeZone());
              setPlan((current) => setDate(current, today));
            }}
          >
            Today
          </Button>
        </div>
        <div className={`${kit.bar} ${kit.barEnd} ${paper.noPrint}`}>
          <Field label="First hour">
            <Select className={styles.hourPick} value={String(plan.startHour)} options={HOURS} onValue={(hour) => setPlan((current) => setStartHour(current, Number(hour)))} />
          </Field>
          <Field label="Last hour">
            <Select className={styles.hourPick} value={String(plan.endHour)} options={HOURS} onValue={(hour) => setPlan((current) => setEndHour(current, Number(hour)))} />
          </Field>
          <PrintButton />
          <ConfirmButton confirm="Clear it all?" disabled={isBlank(plan)} onConfirm={() => setPlan((current) => clearPlan(current))}>
            Clear
          </ConfirmButton>
        </div>
      </div>

      {/* The date written out. With no date, its room is kept on screen and paper gets a line to write it on. */}
      <p className={`${styles.dateLine} ${written ? "" : styles.dateEmpty}`}>
        {written || (
          <>
            Date
            <span className={styles.dateRule} />
          </>
        )}
      </p>

      <div className={styles.columns}>
        <section className={`${styles.part} ${styles.top}`} aria-label="Top 3 priorities">
          <p className={styles.heading}>Top 3</p>
          <ol>
            {plan.top.map((text, i) => (
              <li key={i} className={styles.line}>
                <span className={styles.number}>{i + 1}</span>
                <input className={lists.text} value={text} maxLength={MAX_LINE} aria-label={`Priority ${i + 1}`} onChange={(e) => setPlan((current) => setTop(current, i, e.target.value))} />
              </li>
            ))}
          </ol>
        </section>

        <section className={`${styles.part} ${styles.schedule}`} aria-label="Schedule">
          <p className={styles.heading}>Schedule</p>
          <ol>
            {hours.map((hour) => (
              <li key={hour} className={styles.line}>
                <span className={styles.hour}>{formatHour(hour, "12h")}</span>
                <input
                  className={lists.text}
                  value={plan.schedule[hour] ?? ""}
                  maxLength={MAX_LINE}
                  aria-label={formatHour(hour, "12h")}
                  onChange={(e) => setPlan((current) => setHourText(current, hour, e.target.value))}
                />
              </li>
            ))}
          </ol>
        </section>

        <section className={`${styles.part} ${styles.todo}`} aria-label="To-do list">
          <p className={styles.heading}>To-do</p>
          <ul>
            {plan.todos.map((todo, i) => (
              <li key={i} className={`${styles.line} ${todo.done ? paper.checked : ""}`}>
                <BeanCheckbox checked={todo.done} onChange={() => setPlan((current) => toggleTodo(current, i))} label={`${todo.text.trim() || `To-do ${i + 1}`} done`} />
                <input className={lists.text} value={todo.text} maxLength={MAX_LINE} aria-label={`To-do ${i + 1}`} onChange={(e) => setPlan((current) => setTodoText(current, i, e.target.value))} />
              </li>
            ))}
          </ul>
        </section>

        <section className={`${styles.part} ${styles.notes}`} aria-label="Notes">
          <p className={styles.heading}>Notes</p>
          <TextArea className={`${styles.notesField} ${paper.noPrint}`} value={plan.notes} maxLength={MAX_NOTES} aria-label="Notes" onValue={(notes) => setPlan((current) => ({ ...current, notes: notes.slice(0, MAX_NOTES) }))} />
          {plan.notes.trim() ? <p className={`${styles.notesText} ${paper.printOnly}`}>{plan.notes}</p> : <BlankLines count={NOTE_LINES} />}
        </section>
      </div>
    </div>
  );
}

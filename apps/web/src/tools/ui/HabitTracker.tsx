import { useState } from "react";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRight } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { Trash } from "@phosphor-icons/react/dist/ssr/Trash";
import { localTimeZone, todayIn } from "@beans/core/dates";
import { BeanMark, Mascot } from "@/ui/garden";
import { newId, useNow, useStored } from "../hooks";
import { Button, IconButton, PrintButton, TextInput, kit } from "../kit";
import {
  EMPTY_TRACKER,
  MAX_HABITS,
  MAX_NAME,
  addHabit,
  clearMonth,
  countInMonth,
  currentStreak,
  dayLabel,
  isDone,
  marksInMonth,
  monthDays,
  monthLabel,
  monthOf,
  parseTracker,
  removeHabit,
  renameHabit,
  shiftMonth,
  toggleDay,
  weekdayLetter,
  type Habit,
  type Tracker,
} from "../logic/habits";
import styles from "./habits.module.css";
import lists from "./lists.module.css";
import { ConfirmButton, ConfirmIconButton, EditableText, paper } from "./paper";

/** Empty rows for a tracker with no habits yet, so it prints as a sheet to fill in by hand. */
const BLANK_ROWS = Array.from({ length: 8 }, (_, i) => i);

function Grid({ tracker, month, today, setTracker }: { tracker: Tracker; month: string; today: string; setTracker: (next: (current: Tracker) => Tracker) => void }) {
  const days = monthDays(month);
  const blank = tracker.habits.length === 0;

  const dayCells = (habit: Habit | null) =>
    days.map((day) => {
      const done = habit !== null && isDone(tracker, habit.id, day);
      return (
        <td key={day} className={day === today ? styles.today : undefined}>
          {habit ? (
            <button type="button" className={styles.cell} aria-pressed={done} aria-label={`${habit.name}, ${dayLabel(day)}`} onClick={() => setTracker((current) => toggleDay(current, habit.id, day))}>
              <BeanMark done={done} className={done ? undefined : styles.faint} />
            </button>
          ) : (
            <span className={styles.cell}>
              <BeanMark done={false} />
            </span>
          )}
        </td>
      );
    });

  return (
    <table className={`${styles.table} ${blank ? paper.printOnly : ""}`}>
      <thead>
        <tr>
          <th scope="col" className={styles.nameCol}>
            Habit
          </th>
          {days.map((day) => (
            <th key={day} scope="col" className={`${styles.dayHead} ${day === today ? styles.today : ""}`} aria-label={day === today ? `${dayLabel(day)}, today` : dayLabel(day)}>
              <span className={styles.weekday}>{weekdayLetter(day)}</span>
              {Number(day.slice(8, 10))}
            </th>
          ))}
          <th scope="col" className={styles.total}>
            Done
          </th>
          <th scope="col" className={styles.total} title="Days in a row, up to today">
            Streak
          </th>
        </tr>
      </thead>
      <tbody>
        {blank
          ? BLANK_ROWS.map((row) => (
              <tr key={row}>
                <th scope="row" className={styles.nameCol} />
                {dayCells(null)}
                <td className={styles.total} />
                <td className={styles.total} />
              </tr>
            ))
          : tracker.habits.map((habit) => (
              <tr key={habit.id}>
                <th scope="row" className={styles.nameCol}>
                  <span className={styles.name}>
                    <EditableText value={habit.name} label="Habit name" maxLength={MAX_NAME} onCommit={(name) => setTracker((current) => renameHabit(current, habit.id, name))} />
                    <ConfirmIconButton icon={Trash} label={`Delete ${habit.name}`} confirm={`Click again to delete ${habit.name} and all its days`} onConfirm={() => setTracker((current) => removeHabit(current, habit.id))} />
                  </span>
                </th>
                {dayCells(habit)}
                <td className={styles.total}>{countInMonth(tracker, habit.id, month)}</td>
                <td className={styles.total}>{currentStreak(tracker.done[habit.id] ?? [], today)}</td>
              </tr>
            ))}
      </tbody>
    </table>
  );
}

export function HabitTracker() {
  const [tracker, setTracker] = useStored("habit-tracker", EMPTY_TRACKER, parseTracker);
  /** The month on show, once you've stepped away from the current one. */
  const [picked, setPicked] = useState<string | null>(null);
  const [name, setName] = useState("");
  // Today comes from the visitor's clock, so there is none until the page has mounted.
  const now = useNow(true, 60_000);
  const today = now === null ? null : todayIn(localTimeZone(), now);
  const month = picked ?? (today ? monthOf(today) : null);

  const count = tracker.habits.length;
  const full = count >= MAX_HABITS;
  const marks = month ? marksInMonth(tracker, month) : 0;

  return (
    <div className={`${lists.sheet} ${paper.paper}`}>
      <div className={styles.head}>
        <div className={styles.nav}>
          <IconButton icon={CaretLeft} label="Previous month" className={paper.noPrint} disabled={!month} onClick={() => month && setPicked(shiftMonth(month, -1))} />
          <p className={styles.month} aria-live="polite">
            {month ? monthLabel(month) : " "}
          </p>
          <IconButton icon={CaretRight} label="Next month" className={paper.noPrint} disabled={!month} onClick={() => month && setPicked(shiftMonth(month, 1))} />
        </div>
        <Button variant="quiet" className={paper.noPrint} disabled={!today || month === monthOf(today)} onClick={() => setPicked(null)}>
          This month
        </Button>
      </div>

      {/* Focusable, so the month can be scrolled sideways by keyboard on a narrow screen. */}
      <div className={styles.scroll} role="region" aria-label={month ? `Habits in ${monthLabel(month)}` : "Habits"} tabIndex={0}>
        {month && today ? <Grid tracker={tracker} month={month} today={today} setTracker={setTracker} /> : null}
        {month && count === 0 ? (
          <div className={`${styles.empty} ${lists.empty} ${paper.noPrint}`}>
            <Mascot scene="water" className={lists.emptyMascot} />
            <p className={lists.emptyTitle}>No habits yet.</p>
            <p>Add one below, then click a bean on each day you do it.</p>
          </div>
        ) : null}
      </div>

      <form
        className={`${lists.add} ${styles.add} ${paper.noPrint}`}
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim() || full) return;
          const id = newId();
          setTracker((current) => addHabit(current, name, id));
          setName("");
        }}
      >
        <TextInput value={name} onValue={setName} placeholder={full ? `${MAX_HABITS} habits is the most one tracker holds` : "Add a habit, like Read 10 pages"} aria-label="New habit" maxLength={MAX_NAME} disabled={full} autoComplete="off" />
        <Button type="submit" variant="primary" icon={Plus} disabled={full || !name.trim()}>
          Add habit
        </Button>
      </form>

      <div className={`${lists.foot} ${paper.noPrint}`}>
        <span className={lists.count} role="status">
          {count} of {MAX_HABITS} habits
        </span>
        <span className={kit.bar}>
          <ConfirmButton confirm="Clear the month?" disabled={!month || marks === 0} onConfirm={() => month && setTracker((current) => clearMonth(current, month))}>
            Clear this month
          </ConfirmButton>
          <PrintButton />
        </span>
      </div>
    </div>
  );
}

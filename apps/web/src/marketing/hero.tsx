import { ClockCounterClockwise } from "@phosphor-icons/react/dist/ssr/ClockCounterClockwise";
import { BeanMark, LeafMark } from "./art";
import { Calls } from "./chrome";
import styles from "./hero.module.css";

type Label = "rain" | "pumpkin" | "sprout" | "plum";

const labelClass: Record<Label, string | undefined> = {
  rain: styles.rain,
  pumpkin: styles.pumpkin,
  sprout: styles.sprout,
  plum: styles.plum,
};

const labelName: Record<Label, string> = { rain: "Work", pumpkin: "Home", sprout: "Health", plum: "Side project" };

/** One task card, the same shape as the app's. The Plant button appears when `landing.js` runs. */
export function DemoTask({
  title,
  estimate,
  minutes,
  label,
  time,
  done,
  rolled,
}: {
  title: string;
  estimate: string;
  minutes: number;
  label?: Label;
  time?: string;
  done?: boolean;
  rolled?: boolean;
}) {
  return (
    <li className={styles.card} data-task={title} data-minutes={minutes} data-label={label ?? "soil"} data-time={time ? "" : undefined}>
      <label className={styles.bean}>
        <input type="checkbox" className={styles.beanInput} defaultChecked={done} />
        <BeanMark />
        <span className="visually-hidden">{title} done</span>
      </label>
      <span className={styles.title}>{title}</span>
      <span className={styles.estimate}>{estimate}</span>
      <span className={styles.meta}>
        {label ? (
          <span className={styles.tag}>
            <span className={`${styles.dot} ${labelClass[label]}`} />
            {labelName[label]}
          </span>
        ) : null}
        {rolled ? (
          <span className={styles.tag}>
            <ClockCounterClockwise size={14} aria-hidden="true" />
            Rolled over
          </span>
        ) : null}
        <strong className={styles.time} data-task-time>
          {time}
        </strong>
        {time || rolled ? null : (
          <button type="button" className={styles.plant} data-plant hidden>
            Plant<span className="visually-hidden"> {title} on the Timebox</span>
          </button>
        )}
      </span>
    </li>
  );
}

const hours = ["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM"];

function Block({ title, range, label, slot, done }: { title: string; range: string; label: Label; slot?: string; done?: boolean }) {
  return (
    <div className={`${styles.block} ${labelClass[label]} ${slot} ${done ? styles.blockDone : ""}`} data-block>
      <span className={styles.blockTitle}>{title}</span>
      <span className={styles.blockTime}>{range}</span>
    </div>
  );
}

function Timebox() {
  return (
    <div className={styles.timebox} role="group" aria-label="Timebox for today">
      <div className={styles.timeboxHead}>
        <p className={styles.columnTitle}>Timebox</p>
      </div>
      <div className={styles.grid} data-timebox>
        <ol className={styles.hours}>
          {hours.map((hour) => (
            <li key={hour} className={styles.hour}>
              <span className={styles.hourLabel}>{hour}</span>
            </li>
          ))}
        </ol>
        <div className={styles.blocks} data-blocks>
          <Block title="Morning walk" range="8:00am – 8:30am" label="sprout" slot={styles.slotWalk} done />
          <Block title="Write the weekly update" range="9:00am – 9:30am" label="rain" slot={styles.slotUpdate} />
          <Block title="Review launch plan" range="10:00am – 10:45am" label="rain" slot={styles.slotReview} />
          <div className={`${styles.block} ${styles.blockNew}`} data-block-template hidden>
            <span className={styles.blockTitle} />
            <span className={styles.blockTime} />
          </div>
        </div>
        <div className={styles.nowLine} aria-hidden="true">
          <LeafMark className={styles.nowLeaf} />
        </div>
      </div>
    </div>
  );
}

/** The top of the page: the promise. */
export function Hero() {
  return (
    <div className={styles.headline}>
      <h1 className={styles.h1}>
        Give every task a day and an hour.
      </h1>
      <div className={styles.pitch}>
        <p className={styles.lede}>
          Beans is a daily planner. Spill everything into the Brain Dump, spread it across the week, then drag tasks onto the
          Timebox.
        </p>
        <Calls />
      </div>
    </div>
  );
}

/** The real planner, working: a small piece of the board with live checkboxes and a Timebox to plant on. */
export function Demo() {
  return (
      <div className={styles.demo} data-demo>
        <div className={styles.rows}>
          <div className={styles.column} role="group" aria-label="Brain Dump">
            <p className={styles.columnTitle}>Brain Dump</p>
            <ul className={styles.cards}>
              <DemoTask title="Book a dentist appointment" estimate="0:15" minutes={15} label="sprout" />
              <DemoTask title="Find a birthday gift for Sam" estimate="0:30" minutes={30} />
              <DemoTask title="Look into a standing desk" estimate="0:20" minutes={20} />
            </ul>
          </div>
          <div className={`${styles.column} ${styles.today}`} role="group" aria-label="Today">
            <p className={styles.columnTitle}>
              Tue <span className={styles.columnDate}>Nov 3</span> <span className={styles.todayTag}>Today</span>
            </p>
            <ul className={styles.cards}>
              <DemoTask title="Write the weekly update" estimate="0:30" minutes={30} label="rain" time="9:00am" />
              <DemoTask title="Review launch plan" estimate="0:45" minutes={45} label="rain" time="10:00am" />
              <DemoTask title="Water the seedlings" estimate="0:10" minutes={10} label="pumpkin" />
              <DemoTask title="Morning walk" estimate="0:30" minutes={30} label="sprout" time="8:00am" done />
            </ul>
          </div>
          <p className={styles.hint} data-hint hidden>
            This part is live. Drag a task onto the Timebox, or press Plant.
          </p>
        </div>
        <Timebox />
        <p className="visually-hidden" role="status" data-status />
      </div>
  );
}


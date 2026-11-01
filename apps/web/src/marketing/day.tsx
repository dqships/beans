import { Illustration, LeafMark, ProductShot, SoilLine, VineLeaf } from "./art";
import { Calls } from "./chrome";
import { DemoTask } from "./hero";
import cards from "./hero.module.css";
import styles from "./day.module.css";

/** The short film. It only loads when someone presses play. */
export function Film() {
  return (
    <section className={styles.film} aria-labelledby="film-title">
      <div className={styles.filmText}>
        <h2 id="film-title" className={styles.h2}>
          Watch a day go by.
        </h2>
        <p className={styles.body}>The whole loop on sample data: capture, plan, timebox, tick off, roll over.</p>
      </div>
      <video
        className={styles.video}
        controls
        playsInline
        preload="none"
        width={1280}
        height={720}
        poster="/video/beans-demo-poster.avif"
      >
        <source src="/video/beans-demo-web.webm" type="video/webm" />
        <source src="/video/beans-demo-web.mp4" type="video/mp4" />
        <track kind="captions" src="/video/beans-demo.vtt" srcLang="en" label="English" default />
        <a href="/video/beans-demo-web.mp4">Download the Beans demo video</a>
      </video>
    </section>
  );
}

function Stop({
  time,
  title,
  children,
  aside,
  layout,
}: {
  time: string;
  title: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
  layout: "textLeft" | "textRight" | "wide" | "timebox";
}) {
  return (
    <li className={`${styles.stop} ${styles[layout]}`}>
      <VineLeaf className={styles.node} />
      <div className={styles.stopText} data-reveal>
        <time className={styles.when}>{time}</time>
        <h3 className={styles.h3}>{title}</h3>
        <SoilLine />
        <div className={styles.body}>{children}</div>
      </div>
      {aside ? (
        <div className={styles.stopAside} data-reveal>
          {aside}
        </div>
      ) : null}
    </li>
  );
}

function QuickCapture() {
  return (
    <figure className={styles.capture} aria-label="Quick Capture reading a typed task">
      <p className={styles.captureLine}>
        Book the vet <mark className={styles.token}>tomorrow</mark> <mark className={styles.token}>#home</mark>{" "}
        <mark className={styles.token}>=30m</mark>
      </p>
      <figcaption className={styles.captureRead}>
        <span>Wed Nov 4</span>
        <span>Home</span>
        <span>0:30</span>
      </figcaption>
    </figure>
  );
}

function Stalks() {
  const rows = [
    { label: "Work", time: "2:45", cls: styles.stalkWork },
    { label: "Health", time: "1:05", cls: styles.stalkHealth },
    { label: "Home", time: "0:50", cls: styles.stalkHome },
    { label: "Side project", time: "0:30", cls: styles.stalkSide },
  ];
  return (
    <figure className={styles.stalks} aria-label="Sample analytics: time by label for one day">
      <ul className={styles.stalkRow}>
        {rows.map((row) => (
          <li key={row.label} className={styles.stalk}>
            <span className={styles.stalkTime}>{row.time}</span>
            <span className={`${styles.stalkBar} ${row.cls}`} />
            <span className={styles.stalkLabel}>{row.label}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/** The heart of the page: one day, hung on the beanstalk from morning to midnight. */
export function Day() {
  return (
    <section id="day" className={styles.day} aria-labelledby="day-title">
      <header className={styles.dayHead} data-reveal>
        <h2 id="day-title" className={styles.h2}>
          How a day goes
        </h2>
        <SoilLine />
        <p className={styles.body}>One ordinary Tuesday, from the first thought to midnight.</p>
      </header>
      <ol className={styles.stops}>
        <Stop
          time="7:40am"
          title="Empty your head first."
          layout="textLeft"
          aside={
            <>
              <Illustration
                name="brain-dump"
                width={640}
                height={480}
                shown={480}
                alt="The Beans mascot spilling beans out of a seed packet"
                className={styles.pose}
              />
              <QuickCapture />
            </>
          }
        >
          <p>
            Anything without a date lives in the Brain Dump or a list. Open Quick Capture and type. Beans reads labels, dates and
            times as you go, such as <code className={styles.code}>#home</code>, <code className={styles.code}>tomorrow</code> and{" "}
            <code className={styles.code}>=30m</code>.
          </p>
        </Stop>
        <Stop
          time="8:15am"
          title="Lay out the week."
          layout="wide"
          aside={
            <ProductShot
              name="board"
              width={1200}
              height={750}
              shown={1200}
              alt="The Beans board: a Brain Dump, a column each for Tuesday, Wednesday and Thursday, and the Timebox beside them"
              className={styles.shot}
            />
          }
        >
          <p>
            The board has one column per day and keeps scrolling. Drag tasks into the days you&apos;ll do them. Daily planning walks
            you through it if you want the company. It&apos;s optional.
          </p>
        </Stop>
        <Stop
          time="9:00am"
          title="Give each task a time."
          layout="timebox"
          aside={
            <ProductShot
              name="timebox"
              width={560}
              height={700}
              shown={560}
              alt="The Timebox for Tuesday, with four tasks placed on a beanstalk of hours and a leaf at 10:40am"
              className={styles.shot}
            />
          }
        >
          <p>
            The Timebox shows your hours as a beanstalk. Drag a task on and it has a time. Pull a block&apos;s edge to resize it. A
            leaf marks the current time.
          </p>
        </Stop>
        <Stop
          time="1:30pm"
          title="Stay with one thing."
          layout="textRight"
          aside={
            <Illustration
              name="focus"
              width={640}
              height={480}
              shown={480}
              alt="The Beans mascot sitting still under a leaf, with a timer ring nearby"
              className={styles.pose}
            />
          }
        >
          <p>
            Run the timer or a Pomodoro on the task in front of you. Actual time can fill in from the timer, so you see what those 45
            minutes really took.
          </p>
          <p className={styles.tickNote}>Tick it off and the bean sprouts.</p>
          <ul className={cards.cards}>
            <DemoTask title="Review launch plan" estimate="0:45" minutes={45} label="rain" time="10:00am" />
          </ul>
        </Stop>
        <Stop time="5:45pm" title="Close the day." layout="textLeft" aside={<Stalks />}>
          <p>
            Daily wrap-up looks back at what got done. It&apos;s optional too. Analytics shows your time by label, with a table view
            for the numbers.
          </p>
        </Stop>
      </ol>
    </section>
  );
}

/** Midnight: the one dark band on the page. */
export function Midnight() {
  return (
    <section className={styles.night} aria-labelledby="night-title">
      <div className={styles.nightArt} data-reveal>
        <Illustration
          name="rollover"
          width={640}
          height={480}
          shown={520}
          alt="The Beans mascot asleep under a crescent moon while tasks roll to the next row"
          className={styles.pose}
        />
      </div>
      <div className={styles.nightText} data-reveal>
        <time className={styles.when}>12:00am</time>
        <h3 id="night-title" className={styles.h3}>
          The rest moves to today.
        </h3>
        <p className={styles.body}>
          At your local midnight, unfinished tasks roll to the new day and show a Rolled over tag. No guilt, no copying things over.
        </p>
        <ul className={`${cards.cards} ${styles.nightCards}`}>
          <DemoTask title="Sketch the onboarding flow" estimate="1:30" minutes={90} label="plum" rolled />
          <DemoTask title="Water the seedlings" estimate="0:10" minutes={10} label="pumpkin" rolled />
        </ul>
      </div>
    </section>
  );
}

const packet = [
  ["Tasks", "Notes, subtasks, labels, priority, due dates, estimates and actual time."],
  ["Timer", "A timer and Pomodoro, with actual time beside your estimate."],
  ["Repeats", "Repeating tasks and templates."],
  ["Trash", "Undo when you need it. Items stay 30 days."],
  ["Finding things", "Search, filter and keyboard shortcuts."],
  ["Looks", "Light and dark themes."],
  ["Sync", "Changes sync live between open windows."],
  ["Phone", "A phone layout in the browser."],
];

/** Everything else, set like the fine print on a seed packet. */
export function Packet() {
  return (
    <section className={styles.packet} aria-labelledby="packet-title">
      <div className={styles.packetText} data-reveal>
        <h2 id="packet-title" className={styles.h2}>
          On the back of the packet
        </h2>
        <SoilLine />
        <dl className={styles.fine}>
          {packet.map(([term, detail]) => (
            <div key={term} className={styles.fineRow}>
              <dt className={styles.fineTerm}>{term}</dt>
              <dd className={styles.fineDetail}>{detail}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className={styles.packetPhone} data-reveal>
        <ProductShot
          name="phone"
          width={390}
          height={844}
          shown={320}
          alt="The Beans phone layout showing Tuesday's tasks, with Brain Dump, Today and Timebox tabs"
          className={styles.phoneShot}
        />
      </div>
    </section>
  );
}

/** The foot of the page, where the beanstalk meets the soil. */
export function Closing() {
  return (
    <section className={styles.closing} aria-labelledby="closing-title">
      <div className={styles.closingText} data-reveal>
        <h2 id="closing-title" className={styles.display}>
          Spill the beans.
        </h2>
        <p className={styles.lede}>Start with whatever is on your mind right now.</p>
        <Calls />
      </div>
      <div className={styles.closingArt} data-reveal>
        <Illustration
          name="hero"
          width={800}
          height={600}
          shown={560}
          alt="The Beans mascot planting a bean in a neat row"
          className={styles.pose}
        />
      </div>
    </section>
  );
}

/** The vine that runs down the page, and the leaf that drifts along it as you read. */
export function Vine() {
  return (
    <span className={styles.leafTrack} aria-hidden="true">
      <LeafMark className={styles.leaf} />
    </span>
  );
}

export const gardenClass = styles.garden;

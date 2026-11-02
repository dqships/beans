import { BeanMark, Illustration, ProductShot, SoilLine, VineLeaf } from "./art";
import { Calls } from "./chrome";
import { DemoTask } from "./hero";
import cards from "./hero.module.css";
import styles from "./day.module.css";

/**
 * Something that sits across the vine. The bean passes behind it, and `landing.js` draws the
 * outline round both sides as it goes, from where the bean went in to where it comes out.
 */
function Crossing({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`${styles.crossing} ${className ?? ""}`} data-cross>
      {children}
      <svg className={styles.trace} aria-hidden="true" data-trace>
        <path pathLength={1} />
        <path pathLength={1} />
      </svg>
    </div>
  );
}

/** The short film. It only loads when someone presses play. */
export function Film() {
  return (
    <section className={styles.film} aria-labelledby="film-title">
      <div className={styles.filmText}>
        <h2 id="film-title" className={styles.h2}>
          See it in action.
        </h2>
        <p className={styles.body}>A short walkthrough of one day in Beans, from writing tasks down to checking them off.</p>
      </div>
      <Crossing className={styles.videoFrame}>
      <video
        className={styles.video}
        controls
        playsInline
        preload="none"
        width={1280}
        height={720}
        poster="/video/beans-demo-poster.avif"
      >
        {/* The wide cut's captions are too small on a phone, so phones get the square cut. */}
        <source src="/video/beans-demo-square.mp4" type="video/mp4" media="(max-width: 720px)" /> {/* token-ok: --layout-phone */}
        <source src="/video/beans-demo-web.webm" type="video/webm" />
        <source src="/video/beans-demo-web.mp4" type="video/mp4" />
        {/* Captions are in the picture already, so this track stays off unless someone turns it on. */}
        <track kind="captions" src="/video/beans-demo.vtt" srcLang="en" label="English" />
        <a href="/video/beans-demo-web.mp4">Download the Beans demo video</a>
      </video>
      </Crossing>
    </section>
  );
}

function Stop({
  time,
  title,
  children,
  aside,
  layout,
  crosses,
}: {
  time: string;
  title: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
  layout: "textLeft" | "textRight" | "wide" | "timebox";
  /** The aside spans the vine, so the bean passes behind it. */
  crosses?: boolean;
}) {
  return (
    <li className={`${styles.stop} ${styles[layout]}`}>
      <time className={styles.when}>{time}</time>
      <VineLeaf className={styles.node} />
      <div className={styles.stopText} data-reveal>
        <h3 className={styles.h3}>{title}</h3>
        <SoilLine />
        <div className={styles.body}>{children}</div>
      </div>
      {aside ? (
        <div className={`${styles.stopAside} ${crosses ? styles.stopAsideCrossing : ""}`} data-reveal>
          {crosses ? <Crossing>{aside}</Crossing> : aside}
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
        <p className={styles.body}>Here&apos;s an ordinary Tuesday with Beans.</p>
      </header>
      <ol className={styles.stops}>
        <Stop
          time="7:40am"
          title="Write it all down."
          layout="textLeft"
          aside={
            <>
              <Illustration
                name="brain-dump"
                width={640}
                height={480}
                shown={480}
                alt="The Beans mascot watching a pile of beans spill out of a tipped seed packet."
                className={styles.pose}
              />
              <QuickCapture />
            </>
          }
        >
          <p>
            Spill the beans: put every task in the Brain Dump the moment you think of it, with no date and no order. Press Q to add one from anywhere, and
            Beans picks out the date, label and estimate as you type, such as <code className={styles.code}>#home</code>, <code className={styles.code}>tomorrow</code> and{" "}
            <code className={styles.code}>=30m</code>.
          </p>
        </Stop>
        <Stop
          time="8:15am"
          title="Plan your week."
          layout="wide"
          crosses
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
            Every day gets its own column. Drag tasks onto the days you&apos;ll do them, and you can see at a glance how full each
            day is. Daily planning can walk you through it each morning, if you&apos;d like.
          </p>
        </Stop>
        <Stop
          time="9:00am"
          title="Block out time for each task."
          layout="timebox"
          crosses
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
            A to-do list won&apos;t tell you when anything gets done. Drag a task onto the Timebox to give it a start time, and drag
            its edge to change how long it takes. A leaf marks the current time, so you can see what&apos;s next.
          </p>
        </Stop>
        <Stop
          time="1:30pm"
          title="Focus on one task at a time."
          layout="textRight"
          aside={
            <Illustration
              name="focus"
              width={640}
              height={480}
              shown={480}
              alt="The Beans mascot sitting still under a large leaf, next to a green timer ring."
              className={styles.pose}
            />
          }
        >
          <p>
            Start a timer or a Pomodoro when you begin a task. Beans can log the time for you, so you find out how long things
            really take.
          </p>
          <p className={styles.tickNote}>Finished? Check it off and watch it sprout.</p>
          <ul className={cards.cards}>
            <DemoTask title="Review launch plan" estimate="0:45" minutes={45} label="rain" time="10:00am" />
          </ul>
        </Stop>
        <Stop time="5:45pm" title="See where your time went." layout="textLeft" aside={<Stalks />}>
          <p>
            At the end of the day, the daily wrap-up shows what got done. Analytics adds up your time by label, in a chart or a
            table.
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
      <time className={styles.when}>12:00am</time>
      <div className={styles.nightArt} data-reveal>
        <Illustration
          name="rollover"
          width={640}
          height={480}
          shown={520}
          alt="The Beans mascot asleep under a crescent moon."
          className={styles.pose}
        />
      </div>
      <div className={styles.nightText} data-reveal>
        <h3 id="night-title" className={styles.h3}>
          Unfinished tasks move to the next day.
        </h3>
        <p className={styles.body}>
          At midnight, anything you didn&apos;t finish moves to the new day on its own, marked Rolled over. You don&apos;t have to copy anything across, and nothing gets lost.
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
  ["Repeats", "Repeating tasks, plus templates for the ones you add often."],
  ["Trash", "Deleted tasks stay for 30 days, and you can undo right away."],
  ["Search", "Search, filters and keyboard shortcuts."],
  ["Themes", "Light and dark."],
  ["Sync", "Changes show up right away in every open window."],
  ["Phone", "Works in your phone's browser too."],
];

/** Everything else, set like the fine print on a seed packet. */
export function Packet() {
  return (
    <section className={styles.packet} aria-labelledby="packet-title">
      <div className={styles.packetText} data-reveal>
        <h2 id="packet-title" className={styles.h2}>
          Also in Beans
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
          Try it on today&apos;s <span className="nowrap">to-do</span> list.
        </h2>
        <p className={styles.lede}>Add what&apos;s on your mind, then give it a day and a time.</p>
        <Calls />
      </div>
      <div className={styles.closingArt} data-reveal>
        <Illustration
          name="hero"
          width={800}
          height={600}
          shown={560}
          alt="The Beans mascot beside a row of soil, with one bean going into the ground and three seedlings growing."
          className={styles.pose}
        />
      </div>
    </section>
  );
}

/**
 * The checked-off bean that rides the vine as you read. It sets off from the now line on the
 * hero's Timebox, so it only shows once `landing.js` has measured where that is.
 */
export function Vine() {
  return (
    <span className={styles.beanTrack} aria-hidden="true" data-bean-track>
      <BeanMark done className={styles.traveler} />
    </span>
  );
}

/** The demo and the garden share one vine, and one stacking order, so the bean can pass behind things. */
export const stalkClass = styles.stalk;
export const gardenClass = styles.garden;

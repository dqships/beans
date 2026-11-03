"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type CSSProperties, type FormEvent, type ReactNode, type RefObject } from "react";
import { ArrowLeft, Plus, X } from "@phosphor-icons/react";
import {
  ONBOARDING_STEPS,
  PLAN_AREAS,
  addDays,
  currentStep,
  formatTime,
  minutesNowIn,
  plannedDay,
  relativeDay,
  stepFrom,
  taskIdeas,
  timeboxHours,
  type DateKey,
  type OnboardingStep,
  type Task,
} from "@beans/core";
import {
  useActions,
  useClock,
  useDayTasks,
  useLabel,
  useLabels,
  useListTasks,
  useOnboarding,
  useSettings,
  useTimeZone,
  useToday,
} from "@/data/hooks";
import { authMode } from "@/data/auth-mode";
import { useBilling } from "@/data/billing";
import { Button } from "@/ui/Button";
import { Chip, LabelDot, TextInput } from "@/ui/controls";
import { BeanMark, Mascot } from "@/ui/garden";
import { Icon } from "@/ui/Icon";
import { Illustration, type IllustrationName } from "@/ui/Illustration";
import { useIsPhone } from "@/ui/useMedia";
import { Toasts } from "./Toasts";
import { useUi } from "./ui-state";
import styles from "./onboarding.module.css";

/** Each step's name on the vine, its mascot pose and its screen. */
const STEPS: Record<OnboardingStep, { name: string; art: IllustrationName; Screen: () => ReactNode }> = {
  labels: { name: "Labels", art: "welcome", Screen: LabelsStep },
  dump: { name: "Brain Dump", art: "brain-dump", Screen: DumpStep },
  choose: { name: "Your day", art: "planning", Screen: ChooseStep },
  timebox: { name: "Timebox", art: "timebox", Screen: TimeboxStep },
  planted: { name: "Done", art: "hero", Screen: PlantedStep },
};

/** First-run setup. Every tap saves right away, so a reload or a second device picks up here. */
export function Onboarding() {
  const onboarding = useOnboarding();
  if (!onboarding) return null;
  const { Screen } = STEPS[currentStep(onboarding)];
  return <Screen />;
}

function useStep() {
  const onboarding = useOnboarding()!;
  const today = useToday();
  return { step: currentStep(onboarding), today, day: plannedDay(onboarding, today) };
}

function dayWord(day: DateKey, today: DateKey): string {
  return day === today ? "today" : "tomorrow";
}

/** The page around every step: the vine, the question, the garden below it and the way on. */
function Frame({
  title,
  lead,
  controls,
  children,
  next,
  initialFocus,
}: {
  title: string;
  lead: ReactNode;
  controls?: ReactNode;
  children: ReactNode;
  next: { label: string; disabled?: boolean; quiet?: boolean; onClick?: () => void };
  initialFocus?: RefObject<HTMLElement | null>;
}) {
  const actions = useActions();
  const { step } = useStep();
  const phone = useIsPhone();
  const heading = useRef<HTMLHeadingElement>(null);
  const previous = stepFrom(step, -1);
  const following = stepFrom(step, 1);

  // Moves keyboard and screen reader users along with the step.
  useEffect(() => {
    (phone ? null : initialFocus?.current)?.focus();
    if (phone || !initialFocus) heading.current?.focus();
  }, [step, phone, initialFocus]);

  return (
    <div className={styles.page}>
      <header>
        <div className={styles.header}>
          <span className={styles.brand}>
            <Mascot className={styles.brandMark} />
            Beans
          </span>
          <span className={styles.headerEnd}>
            {/* Setup is short, so people can't skip it. Only the local test sign-in can, to reach an empty planner. */}
            {following && authMode === "test" ? (
              <Button variant="quiet" onClick={() => actions.endOnboarding("skipped")}>
                Skip setup
              </Button>
            ) : null}
            <span className={styles.progress} aria-hidden="true">{`${setupPercent(step)}% done`}</span>
          </span>
        </div>
        <Vine step={step} />
      </header>
      <main className={styles.main}>
        <div className={styles.question}>
          <div className={styles.words}>
            <h1 ref={heading} tabIndex={-1} className={styles.title}>
              {title}
            </h1>
            <p className={styles.lead}>{lead}</p>
            {controls}
          </div>
          <Illustration name={STEPS[step].art} alt="" compact eager className={styles.art} />
        </div>
        {children}
      </main>
      <footer className={styles.footer}>
        {previous ? (
          <Button variant="quiet" icon={ArrowLeft} onClick={() => actions.setOnboardingStep(previous)}>
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button
          variant={next.quiet ? "secondary" : "primary"}
          disabled={next.disabled}
          onClick={next.onClick ?? (() => following && actions.setOnboardingStep(following))}
        >
          {next.label}
        </Button>
      </footer>
      <Toasts />
    </div>
  );
}

/**
 * How far through setup: signing up counts as the first fifth, so the first
 * step reads 20% and the last 100%.
 */
function setupPercent(step: OnboardingStep): number {
  return Math.round(((ONBOARDING_STEPS.indexOf(step) + 1) / ONBOARDING_STEPS.length) * 100);
}

/** Progress as a vine that grows a leaf for each step reached, starting from sign-up, which is already done. */
function Vine({ step }: { step: OnboardingStep }) {
  const reached = ONBOARDING_STEPS.indexOf(step);
  const leaf = (
    <svg className={styles.vineLeaf} viewBox="0 0 24 16" aria-hidden="true">
      <path d="M2 8 C6 1 16 0 22 8 C16 16 6 15 2 8 Z" />
    </svg>
  );
  return (
    <ol className={styles.vine} aria-label={`Setup, ${setupPercent(step)}% done`}>
      <li className={styles.grown}>
        {leaf}
        <span>Sign up</span>
      </li>
      {ONBOARDING_STEPS.map((id, i) => (
        <li key={id} className={i <= reached ? styles.grown : undefined} aria-current={id === step ? "step" : undefined}>
          {leaf}
          <span>{STEPS[id].name}</span>
        </li>
      ))}
    </ol>
  );
}

/** A named garden row sitting on a soil line. */
function Row({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className={styles.row} aria-label={title}>
      <h2 className={styles.rowTitle}>
        {title}
        {count ? <span className={styles.rowCount}>{count}</span> : null}
      </h2>
      {children}
    </section>
  );
}

function TaskText({ task }: { task: Task }) {
  const label = useLabel(task.labelId);
  const format = useSettings()?.timeFormat ?? "12h";
  return (
    <>
      <LabelDot color={label?.color} />
      <span className={styles.taskTitle}>{task.title}</span>
      {task.start ? <span className={styles.taskTime}>{formatTime(task.start, format)}</span> : null}
    </>
  );
}

function LabelsStep() {
  const actions = useActions();
  const labels = useLabels();
  return (
    <Frame
      title="What do you plan around?"
      lead="Beans is a daily planner. Pick the parts of your life that fill your days, and each one becomes a label for your tasks. You can change them later in Settings."
      next={{ label: labels.length ? "Continue" : "Continue without labels", quiet: !labels.length }}
    >
      <div className={styles.packets} role="group" aria-label="Parts of your life">
        {PLAN_AREAS.map((area) => {
          const label = labels.find((l) => l.name === area.name);
          return (
            <button
              key={area.name}
              type="button"
              role="checkbox"
              aria-checked={Boolean(label)}
              className={styles.packet}
              style={{ "--packet": `var(--label-${area.color})` } as CSSProperties}
              onClick={() => (label ? actions.deleteLabel(label.id) : actions.createLabel({ name: area.name, color: area.color }))}
            >
              <span className={styles.packetName}>{area.name}</span>
              <BeanMark done={Boolean(label)} className={styles.packetBean} />
            </button>
          );
        })}
      </div>
      <IdeaPreview />
    </Frame>
  );
}

/**
 * Task ideas for the parts of life picked so far, so the first step already
 * shows what Beans will hold. They're added for real on the next step.
 */
function IdeaPreview() {
  const labels = useLabels();
  const ideas = labels.length ? taskIdeas(labels, []) : [];
  return (
    <Row title="Ideas for your Brain Dump">
      {ideas.length ? (
        <>
          <ul className={styles.tasks} aria-live="polite">
            {ideas.map((idea) => (
              <li key={idea.title} className={styles.idea}>
                <LabelDot color={labels.find((l) => l.id === idea.labelId)?.color} />
                <span className={styles.taskTitle}>{idea.title}</span>
              </li>
            ))}
          </ul>
          <p className={styles.empty}>You can add any of these on the next step, or write your own.</p>
        </>
      ) : (
        <p className={styles.empty}>Pick a part of your life to see task ideas for it.</p>
      )}
    </Row>
  );
}

function DumpStep() {
  const actions = useActions();
  const labels = useLabels();
  const tasks = useListTasks(null);
  const [text, setText] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const ideas = taskIdeas(labels, tasks.map((t) => t.title));

  const add = (lines: string) => {
    for (const title of lines.split(/\r?\n/)) {
      if (title.trim()) actions.createTask({ title, position: "bottom" });
    }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    add(text);
    setText("");
  };
  // A pasted list becomes one task per line.
  const paste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (!pasted.includes("\n")) return;
    e.preventDefault();
    add(pasted);
  };

  return (
    <Frame
      title="Spill the beans: put every task in the Brain Dump."
      lead="The Brain Dump holds tasks without a date. Add whatever's on your mind, one at a time. You'll sort it next."
      initialFocus={input}
      next={{ label: "Continue", disabled: !tasks.length }}
      controls={
        <>
          <form className={styles.add} onSubmit={submit}>
            <TextInput
              ref={input}
              aria-label="Add a task"
              placeholder="Add a task"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onPaste={paste}
            />
            <Button type="submit" icon={Plus} disabled={!text.trim()}>
              Add
            </Button>
          </form>
          {ideas.length ? (
            <div className={styles.ideas} role="group" aria-label="Task ideas">
              {ideas.map((idea) => (
                <Chip key={idea.title} icon={Plus} onClick={() => actions.createTask({ title: idea.title, labelId: idea.labelId, position: "bottom" })}>
                  {idea.title}
                </Chip>
              ))}
            </div>
          ) : null}
        </>
      }
    >
      <Row title="Brain Dump" count={tasks.length}>
        {tasks.length ? (
          <ul className={styles.tasks}>
            {tasks.map((task) => (
              <li key={task.id} className={styles.task}>
                <TaskText task={task} />
                <button type="button" className={styles.taskRemove} aria-label={`Remove ${task.title}`} onClick={() => actions.purge("task", task.id)}>
                  <Icon icon={X} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>Nothing here yet. Your tasks land in this row as you add them.</p>
        )}
      </Row>
    </Frame>
  );
}

/**
 * Brain Dump on the left, today and tomorrow on the right: each task can go to
 * either day, so a plan can start today and carry on tomorrow.
 */
function ChooseStep() {
  const actions = useActions();
  const { today } = useStep();
  const tomorrow = addDays(today, 1);
  const dump = useListTasks(null);
  const todays = useDayTasks(today);
  const tomorrows = useDayTasks(tomorrow);
  const days = [
    { date: today, tasks: todays },
    { date: tomorrow, tasks: tomorrows },
  ];
  return (
    <Frame
      title="Choose what you'll get to today and tomorrow."
      lead="Move a few tasks from your Brain Dump to either day. The rest stay there until you want them."
      next={{
        label: "Continue",
        disabled: !todays.length && !tomorrows.length,
        // The Timebox step plans today when it has tasks, otherwise tomorrow.
        onClick: () => actions.setOnboardingStep("timebox", todays.length ? today : tomorrow),
      }}
    >
      <div className={styles.twoRows}>
        <Row title="Brain Dump" count={dump.length}>
          {dump.length ? (
            <ul className={styles.tasks}>
              {dump.map((task) => (
                <li key={task.id} className={styles.task}>
                  <TaskText task={task} />
                  <span className={styles.dayChoice}>
                    {days.map(({ date, tasks }) => (
                      <Button
                        key={date}
                        size="sm"
                        icon={Plus}
                        aria-label={`Move ${task.title} to ${dayWord(date, today)}`}
                        onClick={() => actions.moveTask(task.id, { date, index: tasks.length })}
                      >
                        {relativeDay(date, today)}
                      </Button>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>Everything is on your plan.</p>
          )}
        </Row>
        <div className={styles.dayRows}>
          {days.map(({ date, tasks }) => (
            <Row key={date} title={relativeDay(date, today)} count={tasks.length}>
              {tasks.length ? (
                <ul className={styles.tasks}>
                  {tasks.map((task) => (
                    <li key={task.id}>
                      <button
                        type="button"
                        className={styles.taskButton}
                        aria-label={`Move ${task.title} back to the Brain Dump`}
                        onClick={() => actions.moveTask(task.id, { date: null })}
                      >
                        <TaskText task={task} />
                        <Icon icon={X} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.empty}>{`Choose a task from your Brain Dump to plant it ${dayWord(date, today)}.`}</p>
              )}
            </Row>
          ))}
        </div>
      </div>
    </Frame>
  );
}

function TimeboxStep() {
  const actions = useActions();
  const { day, today } = useStep();
  const tasks = useDayTasks(day);
  const zone = useTimeZone();
  const now = useClock();
  const settings = useSettings();
  const labels = useLabels();
  const format = settings?.timeFormat ?? "12h";
  const [picked, setPicked] = useState<string | null>(null);
  const selected = tasks.find((t) => t.id === picked) ?? tasks.find((t) => !t.start) ?? null;
  const hours = timeboxHours(day, today, minutesNowIn(zone, now));
  const anyTimed = tasks.some((t) => t.start);

  return (
    <Frame
      title="Give your first task a time."
      lead="The Timebox shows the hours of your day. Pick a task, then an hour, and Beans blocks out 30 minutes for it."
      next={{ label: anyTimed ? "Continue" : "Skip this step", quiet: !anyTimed }}
    >
      <div className={styles.twoRows}>
        <Row title={relativeDay(day, today)} count={tasks.length}>
          <div className={styles.tasks} role="group" aria-label="Task to give a time">
            {tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                aria-pressed={task.id === selected?.id}
                className={styles.taskButton}
                onClick={() => setPicked(task.id)}
              >
                <TaskText task={task} />
              </button>
            ))}
          </div>
        </Row>
        <Row title="Timebox">
          {hours.length ? (
            <ol className={styles.stalk}>
              {hours.map((hour) => {
                const task = tasks.find((t) => t.start === hour);
                const label = labels.find((l) => l.id === task?.labelId);
                const time = formatTime(hour, format);
                return (
                  <li key={hour} className={styles.hour}>
                    <span className={styles.hourTime}>{time}</span>
                    {task ? (
                      <button
                        type="button"
                        className={styles.block}
                        style={label ? ({ "--block": `var(--label-${label.color})`, "--block-text": "var(--color-on-label)" } as CSSProperties) : undefined}
                        aria-label={`Clear ${task.title} from ${time}`}
                        onClick={() => actions.moveTask(task.id, { date: day, start: null })}
                      >
                        {task.title}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.slot}
                        disabled={!selected}
                        aria-label={selected ? `Put ${selected.title} at ${time}` : `${time} is open`}
                        onClick={() => {
                          if (!selected) return;
                          actions.moveTask(selected.id, { date: day, start: hour });
                          setPicked(null);
                        }}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className={styles.empty}>There are no hours left to plan today. Anything you don&apos;t finish moves to tomorrow at midnight.</p>
          )}
        </Row>
      </div>
    </Frame>
  );
}

function PlantedStep() {
  const actions = useActions();
  const ui = useUi();
  // Without a subscription the paywall comes next, so the button doesn't promise the planner.
  const locked = useBilling()?.status.access === false;
  const { day, today } = useStep();
  const tomorrow = addDays(today, 1);
  const todays = useDayTasks(today);
  const tomorrows = useDayTasks(tomorrow);
  const dump = useListTasks(null);
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  // One line per day that has tasks, then the Brain Dump.
  const planned = [
    { date: today, tasks: todays },
    { date: tomorrow, tasks: tomorrows },
  ].filter(({ tasks }) => tasks.length);
  const summary = [
    ...planned.map(({ date, tasks }) => {
      const timed = tasks.filter((t) => t.start).length;
      return `${plural(tasks.length, "task", "tasks")} for ${dayWord(date, today)}${timed ? `, ${timed} with a time` : ""}.`;
    }),
    dump.length ? `${plural(dump.length, "task is", "tasks are")} waiting in your Brain Dump.` : null,
    "Anything you don't finish moves to the new day at midnight.",
  ];
  return (
    <Frame
      title={todays.length ? "Your day is planned." : "Tomorrow is planned."}
      lead={summary.filter(Boolean).join(" ")}
      next={{
        label: locked ? "Continue" : "Open my planner",
        onClick: () => {
          ui.setTimeboxDate(day === today ? null : day);
          actions.endOnboarding("finished");
        },
      }}
    >
      {planned.map(({ date, tasks }) => (
        <Row key={date} title={relativeDay(date, today)} count={tasks.length}>
          <ul className={styles.tasks}>
            {tasks.map((task) => (
              <li key={task.id} className={styles.task}>
                <TaskText task={task} />
              </li>
            ))}
          </ul>
        </Row>
      ))}
    </Frame>
  );
}

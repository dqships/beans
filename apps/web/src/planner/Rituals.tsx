"use client";

import { useState, type ReactNode } from "react";
import { ArrowRight, CalendarPlus, Check, X } from "@phosphor-icons/react";
import {
  addDays,
  dayTotals,
  formatClock,
  formatDuration,
  relativeDay,
  type DateKey,
  type Task,
} from "@beans/core";
import { useActions, useAllTasks, useDayTasks, useLabels, useListTasks, useSettings, useToday } from "@/data/hooks";
import { Button, IconButton } from "@/ui/Button";
import { LabelDot } from "@/ui/controls";
import { BeanCheckbox, EmptyState, Mascot } from "@/ui/garden";
import { Modal } from "@/ui/Modal";
import { nextWeek } from "./pickers";
import { TimeGrid } from "./TimeGrid";
import { SortableTask, TaskDropZone, containerId } from "./dnd";
import { useUi } from "./ui-state";
import styles from "./rituals.module.css";

export function Rituals() {
  const ui = useUi();
  const kind = ui.dialog === "planning" || ui.dialog === "shutdown" ? ui.dialog : null;
  const [confirming, setConfirming] = useState(false);
  const close = () => setConfirming(true);
  return (
    <Modal open={kind !== null} onClose={close} label={kind === "planning" ? "Plan your day" : "Wrap up your day"} width="full">
      {kind === "planning" ? <Planning onDone={() => ui.setDialog(null)} onClose={close} /> : null}
      {kind === "shutdown" ? <WrapUp onDone={() => ui.setDialog(null)} onClose={close} /> : null}
      {confirming ? (
        <div className={styles.confirm} role="alertdialog" aria-label="Leave early?">
          <p>Leave now? Anything you already moved or checked off stays as it is.</p>
          <div className={styles.confirmActions}>
            <Button onClick={() => setConfirming(false)}>Keep going</Button>
            <Button
              variant="primary"
              onClick={() => {
                setConfirming(false);
                ui.setDialog(null);
              }}
            >
              Leave
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function Frame({
  step,
  steps,
  title,
  summary,
  children,
  onBack,
  onNext,
  nextLabel,
  onClose,
}: {
  step: number;
  steps: number;
  title: string;
  summary: ReactNode;
  children: ReactNode;
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  onClose: () => void;
}) {
  return (
    <div className={styles.frame}>
      <aside className={styles.rail}>
        <div className={styles.railTop}>
          <span className={styles.stepCount}>
            Step {step} of {steps}
          </span>
          <IconButton icon={X} label="Close" onClick={onClose} />
        </div>
        <h2 className={styles.railTitle}>{title}</h2>
        <div className={styles.summary}>{summary}</div>
        <div className={styles.railActions}>
          {onBack ? <Button onClick={onBack}>Back</Button> : null}
          <Button variant="primary" onClick={onNext}>
            {nextLabel}
          </Button>
        </div>
      </aside>
      <div className={styles.work}>{children}</div>
    </div>
  );
}

function MiniTask({ task, action }: { task: Task; action?: ReactNode }) {
  const actions = useActions();
  const labels = useLabels();
  const label = labels.find((l) => l.id === task.labelId);
  return (
    <div className={`${styles.mini} ${task.done ? styles.miniDone : ""}`}>
      <BeanCheckbox checked={task.done} onChange={(d) => actions.setDone(task.id, d)} label={`Mark “${task.title}” ${task.done ? "not done" : "done"}`} />
      <span className={styles.miniTitle}>{task.title}</span>
      {label ? <LabelDot color={label.color} /> : null}
      {task.estimate ? <span className={styles.miniTime}>{formatClock(task.estimate)}</span> : null}
      {action}
    </div>
  );
}

function Planning({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const today = useToday();
  const yesterday = addDays(today, -1);
  const actions = useActions();
  const ui = useUi();
  const settings = useSettings();
  const yesterdayTasks = useDayTasks(yesterday);
  const todayTasks = useDayTasks(today);
  const tomorrowTasks = useDayTasks(addDays(today, 1));
  const weekStart = nextWeek(today, settings?.weekStart ?? 0);
  const nextWeekTasks = useDayTasks(weekStart);
  const brain = useListTasks(null).filter((t) => !t.done);
  const allTasks = useAllTasks();
  const listed = allTasks.filter((t) => t.date === null && t.listId !== null && !t.done);
  const totals = dayTotals(todayTasks.filter((t) => !t.done));
  const limit = settings?.workloadLimit ?? null;
  const missed = yesterdayTasks.filter((t) => !t.done);
  const finish = () => {
    actions.updateSettings({ plannedDays: [...(settings?.plannedDays ?? []).slice(-30), today] });
    ui.toast("Your day is planned. Have a good one.");
    onDone();
  };
  const toToday = (id: string) => actions.moveTask(id, { date: today, index: Number.MAX_SAFE_INTEGER });

  if (step === 1) {
    return (
      <Frame
        step={1}
        steps={4}
        title="Look back at yesterday"
        summary={
          <p>
            You finished {yesterdayTasks.filter((t) => t.done).length} of {yesterdayTasks.length} {yesterdayTasks.length === 1 ? "task" : "tasks"} yesterday.
            {missed.length ? " Bring anything unfinished into today, or leave it be." : ""}
          </p>
        }
        onNext={() => setStep(2)}
        nextLabel="Next"
        onClose={onClose}
      >
        <h3 className={styles.workTitle}>{relativeDay(yesterday, today)}</h3>
        {yesterdayTasks.length === 0 ? <EmptyState scene="rest" title="Nothing was planned yesterday" /> : null}
        <div className={styles.stack}>
          {yesterdayTasks.map((t) => (
            <MiniTask
              key={t.id}
              task={t}
              action={
                !t.done ? (
                  <Button size="sm" icon={ArrowRight} onClick={() => toToday(t.id)}>
                    Today
                  </Button>
                ) : null
              }
            />
          ))}
        </div>
      </Frame>
    );
  }
  if (step === 2) {
    return (
      <Frame
        step={2}
        steps={4}
        title="Choose today's work"
        summary={<p>Pick from your Brain Dump and lists. Today has {todayTasks.filter((t) => !t.done).length} tasks so far.</p>}
        onBack={() => setStep(1)}
        onNext={() => setStep(3)}
        nextLabel="Next"
        onClose={onClose}
      >
        <div className={styles.columns}>
          <section className={styles.col}>
            <h3 className={styles.workTitle}>Brain Dump and lists</h3>
            {brain.length + listed.length === 0 ? <EmptyState compact scene="spill" title="Nothing waiting" /> : null}
            <div className={styles.stack}>
              {[...brain, ...listed].map((t) => (
                <MiniTask
                  key={t.id}
                  task={t}
                  action={
                    <Button size="sm" icon={CalendarPlus} onClick={() => toToday(t.id)}>
                      Add
                    </Button>
                  }
                />
              ))}
            </div>
          </section>
          <section className={styles.col}>
            <h3 className={styles.workTitle}>Today</h3>
            <div className={styles.stack}>
              {todayTasks.map((t) => (
                <MiniTask key={t.id} task={t} />
              ))}
            </div>
          </section>
        </div>
      </Frame>
    );
  }
  if (step === 3) {
    const over = limit !== null && totals.estimate > limit;
    const byLabel = new Map<string | null, number>();
    for (const t of todayTasks) if (!t.done) byLabel.set(t.labelId, (byLabel.get(t.labelId) ?? 0) + (t.estimate ?? 0));
    return (
      <Frame
        step={3}
        steps={4}
        title="Can anything wait?"
        summary={
          <>
            <p className={over ? styles.over : undefined}>
              Planned: {formatDuration(totals.estimate)}
              {limit ? ` of your ${formatDuration(limit)} limit` : ""}.
            </p>
            <LabelSummary data={byLabel} />
          </>
        }
        onBack={() => setStep(2)}
        onNext={() => setStep(4)}
        nextLabel="Next"
        onClose={onClose}
      >
        <div className={styles.columns3}>
          <DayCol title="Today" tasks={todayTasks.filter((t) => !t.done)} actions={(t) => (
            <>
              <Button size="sm" onClick={() => actions.moveTask(t.id, { date: addDays(today, 1), index: 0 })}>
                Tomorrow
              </Button>
              <Button size="sm" onClick={() => actions.moveTask(t.id, { date: weekStart, index: 0 })}>
                Next week
              </Button>
            </>
          )} />
          <DayCol title="Tomorrow" tasks={tomorrowTasks.filter((t) => !t.done)} actions={(t) => (
            <Button size="sm" onClick={() => toToday(t.id)}>
              Today
            </Button>
          )} />
          <DayCol title="Next week" tasks={nextWeekTasks.filter((t) => !t.done)} actions={(t) => (
            <Button size="sm" onClick={() => toToday(t.id)}>
              Today
            </Button>
          )} />
        </div>
      </Frame>
    );
  }
  const container = containerId({ kind: "day", date: today });
  return (
    <Frame
      step={4}
      steps={4}
      title="Give it a shape"
      summary={<p>Drag tasks onto the Timebox to give them a time. Anything left stays on today&apos;s list.</p>}
      onBack={() => setStep(3)}
      onNext={finish}
      nextLabel="Start my day"
      onClose={onClose}
    >
      <div className={styles.finalize}>
        <TaskDropZone target={{ kind: "day", date: today }} tasks={todayTasks} className={styles.stack}>
          {todayTasks.map((t, i) => (
            <SortableTask key={t.id} task={t} container={container} index={i} />
          ))}
        </TaskDropZone>
        <div className={styles.grid}>
          <TimeGrid days={[today]} scrollKey="ritual" />
        </div>
      </div>
    </Frame>
  );
}

function LabelSummary({ data }: { data: Map<string | null, number> }) {
  const labels = useLabels();
  return (
    <ul className={styles.labelSummary}>
      {[...data.entries()].sort((a, b) => b[1] - a[1]).map(([id, minutes]) => {
        const l = labels.find((x) => x.id === id);
        return (
          <li key={id ?? "none"}>
            <LabelDot color={l?.color ?? null} /> {l?.name ?? "No label"} <span>{formatDuration(minutes)}</span>
          </li>
        );
      })}
    </ul>
  );
}

function DayCol({ title, tasks, actions }: { title: string; tasks: Task[]; actions: (t: Task) => ReactNode }) {
  return (
    <section className={styles.col}>
      <h3 className={styles.workTitle}>
        {title} <span className={styles.muted}>{formatDuration(dayTotals(tasks).estimate)}</span>
      </h3>
      <div className={styles.stack}>
        {tasks.map((t) => (
          <MiniTask key={t.id} task={t} action={<span className={styles.miniActions}>{actions(t)}</span>} />
        ))}
      </div>
    </section>
  );
}

function WrapUp({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const today = useToday();
  const tomorrow = addDays(today, 1);
  const actions = useActions();
  const ui = useUi();
  const settings = useSettings();
  const todayTasks = useDayTasks(today);
  const tomorrowTasks = useDayTasks(tomorrow);
  const done = todayTasks.filter((t) => t.done);
  const missed = todayTasks.filter((t) => !t.done);

  if (step === 1) {
    return (
      <Frame
        step={1}
        steps={2}
        title="How did today go?"
        summary={
          <>
            <Mascot scene={missed.length === 0 && done.length ? "cheer" : "water"} className={styles.railMascot} />
            <p>
              {done.length} done, {missed.length} still open. Tick off anything you finished but didn&apos;t check.
            </p>
          </>
        }
        onNext={() => setStep(2)}
        nextLabel="Next"
        onClose={onClose}
      >
        <div className={styles.columns}>
          <section className={styles.col}>
            <h3 className={styles.workTitle}>Done</h3>
            <div className={styles.stack}>
              {done.map((t) => (
                <MiniTask key={t.id} task={t} />
              ))}
            </div>
          </section>
          <section className={styles.col}>
            <h3 className={styles.workTitle}>Not done</h3>
            <div className={styles.stack}>
              {missed.map((t) => (
                <MiniTask key={t.id} task={t} />
              ))}
            </div>
          </section>
        </div>
      </Frame>
    );
  }
  return <WrapUpTomorrow today={today} tomorrow={tomorrow} tomorrowTasks={tomorrowTasks} onBack={() => setStep(1)} onClose={onClose} onFinish={(rolling) => {
    const undo = actions.moveUnfinished(rolling, tomorrow);
    actions.updateSettings({ shutdownDays: [...(settings?.shutdownDays ?? []).slice(-30), today] });
    ui.toast(rolling.length ? `Moved ${rolling.length} task${rolling.length === 1 ? "" : "s"} to tomorrow` : "All wrapped up", undo);
    onDone();
  }} />;
}

function WrapUpTomorrow({
  today,
  tomorrow,
  tomorrowTasks,
  onBack,
  onClose,
  onFinish,
}: {
  today: DateKey;
  tomorrow: DateKey;
  tomorrowTasks: Task[];
  onBack: () => void;
  onClose: () => void;
  onFinish: (rolling: string[]) => void;
}) {
  const ui = useUi();
  const settings = useSettings();
  const state = useAllTasks();
  const repeatOff = !(settings?.rolloverRepeating ?? false);
  const rolling = state.filter((t) => t.date === today && !t.done && (!repeatOff || t.seriesId === null));
  const staying = state.filter((t) => t.date === today && !t.done && repeatOff && t.seriesId !== null);
  return (
    <Frame
      step={2}
      steps={2}
      title="Get tomorrow ready"
      summary={<p>Unfinished tasks move to tomorrow with a “Rolled over” tag, so nothing falls through.</p>}
      onBack={onBack}
      onNext={() => onFinish(rolling.map((t) => t.id))}
      nextLabel="Finish the day"
      onClose={onClose}
    >
      {staying.length ? (
        <p className={styles.banner} role="note">
          {staying.length === 1 ? "1 repeating task stays" : `${staying.length} repeating tasks stay`} on today, because its next repeat is already planned.{" "}
          <button type="button" className={styles.bannerLink} onClick={() => ui.openSettings("general")}>
            Change this
          </button>
        </p>
      ) : null}
      <div className={styles.columns}>
        <section className={styles.col}>
          <h3 className={styles.workTitle}>Moving to {relativeDay(tomorrow, today).toLowerCase()}</h3>
          {rolling.length === 0 ? <EmptyState compact scene="cheer" title="Nothing left over" /> : null}
          <div className={styles.stack}>
            {rolling.map((t) => (
              <MiniTask key={t.id} task={t} action={<span className={styles.tag}>Rolling over</span>} />
            ))}
          </div>
        </section>
        <section className={styles.col}>
          <h3 className={styles.workTitle}>Already on tomorrow</h3>
          {tomorrowTasks.length === 0 ? <EmptyState compact scene="rest" title="A fresh day" /> : null}
          <div className={styles.stack}>
            {tomorrowTasks.map((t) => (
              <MiniTask key={t.id} task={t} />
            ))}
          </div>
        </section>
      </div>
      <p className={styles.muted}>
        <Check /> Your timer and anything you checked off today are saved.
      </p>
    </Frame>
  );
}

"use client";

import { useMemo, useState } from "react";
import { DownloadSimple, X } from "@phosphor-icons/react";
import { addDays, diffDays, formatDuration, shortDate, todayIn, weekdayName, type DateKey, type Task } from "@beans/core";
import { useActions, useAllTasks, useLabels, useSettings, useToday } from "@/data/hooks";
import { Button, IconButton } from "@/ui/Button";
import { LabelDot, Switcher } from "@/ui/controls";
import { EmptyState } from "@/ui/garden";
import { Modal } from "@/ui/Modal";
import { useUi } from "./ui-state";
import styles from "./analytics.module.css";

type Range = "7" | "30" | "90";
type Units = "hours" | "tasks";
const PREFS_KEY = "beans-analytics";

function loadPrefs(): { range: Range; units: Units } {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
    return { range: ["7", "30", "90"].includes(saved.range) ? saved.range : "7", units: saved.units === "tasks" ? "tasks" : "hours" };
  } catch {
    return { range: "7", units: "hours" };
  }
}

export function Analytics() {
  const ui = useUi();
  return (
    <Modal open={ui.dialog === "analytics"} onClose={() => ui.setDialog(null)} label="Analytics" width="wide">
      <AnalyticsBody />
    </Modal>
  );
}

function completedDay(t: Task, zone: string): DateKey {
  return t.completedAt ? todayIn(zone, t.completedAt) : (t.date ?? "");
}

function AnalyticsBody() {
  const ui = useUi();
  const actions = useActions();
  const tasks = useAllTasks();
  const labels = useLabels();
  const today = useToday();
  const zone = useSettings()?.timeZone ?? "UTC";
  const [prefs, setPrefs] = useState(loadPrefs);
  const save = (next: typeof prefs) => {
    setPrefs(next);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {}
  };
  const days = Number(prefs.range);
  const from = addDays(today, -(days - 1));
  const done = useMemo(
    () => tasks.filter((t) => t.done && completedDay(t, zone) >= from && completedDay(t, zone) <= today),
    [tasks, zone, from, today],
  );
  const value = (t: Task) => (prefs.units === "hours" ? t.actual : 1);
  const fmt = (v: number) => (prefs.units === "hours" ? formatDuration(v) : `${v} task${v === 1 ? "" : "s"}`);

  const byLabel = useMemo(() => {
    const map = new Map<string | null, number>();
    for (const t of done) map.set(t.labelId, (map.get(t.labelId) ?? 0) + value(t));
    return [...map.entries()].map(([id, v]) => ({ id, v, label: labels.find((l) => l.id === id) })).sort((a, b) => b.v - a.v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, labels, prefs.units]);
  const total = byLabel.reduce((s, r) => s + r.v, 0);

  const perDay = useMemo(() => {
    const out: { date: DateKey; v: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = addDays(from, i);
      out.push({ date: d, v: done.filter((t) => completedDay(t, zone) === d).reduce((s, t) => s + value(t), 0) });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, days, from, zone, prefs.units]);
  const max = Math.max(1, ...perDay.map((d) => d.v));

  const dump = tasks.filter((t) => t.date === null && !t.done);
  const avgAge = dump.length ? Math.round(dump.reduce((s, t) => s + diffDays(today, todayIn(zone, t.createdAt)), 0) / dump.length) : 0;
  const stale = dump.filter((t) => diffDays(today, todayIn(zone, t.createdAt)) >= 14);

  const csv = () => {
    const rows = [["Task", "Label", "Estimate (min)", "Actual (min)", "Completed"]];
    for (const t of done) rows.push([t.title, labels.find((l) => l.id === t.labelId)?.name ?? "", String(t.estimate ?? ""), String(Math.round(t.actual)), completedDay(t, zone)]);
    const text = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `beans-completed-${from}-to-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.body}>
      <div className={styles.head}>
        <h2 className={styles.title}>Analytics</h2>
        <IconButton icon={X} label="Close analytics" onClick={() => ui.setDialog(null)} />
      </div>
      <div className={styles.filters}>
        <Switcher label="Range" value={prefs.range} onChange={(range) => save({ ...prefs, range })} options={[{ value: "7", label: "7 days" }, { value: "30", label: "30 days" }, { value: "90", label: "90 days" }]} />
        <Switcher label="Units" value={prefs.units} onChange={(units) => save({ ...prefs, units })} options={[{ value: "hours", label: "Hours" }, { value: "tasks", label: "Tasks" }]} />
      </div>

      <div className={styles.tiles}>
        <div className={styles.tile}>
          <span className={styles.tileLabel}>Finished</span>
          <strong className={styles.tileValue}>{done.length}</strong>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileLabel}>Time tracked</span>
          <strong className={styles.tileValue}>{formatDuration(done.reduce((s, t) => s + t.actual, 0))}</strong>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileLabel}>Average Brain Dump age</span>
          <strong className={styles.tileValue}>{avgAge === 1 ? "1 day" : `${avgAge} days`}</strong>
        </div>
      </div>

      {done.length === 0 ? (
        <EmptyState scene="water" title="Nothing finished in this range yet">
          Finish a few tasks and this garden starts to grow.
        </EmptyState>
      ) : (
        <>
          <section className={styles.section} aria-labelledby="by-label">
            <h3 id="by-label" className={styles.sectionTitle}>
              {prefs.units === "hours" ? "Time" : "Tasks"} by label
            </h3>
            <ul className={styles.bars}>
              {byLabel.map((r) => (
                <li key={r.id ?? "none"} className={styles.barRow} title={`${r.label?.name ?? "No label"}: ${fmt(r.v)}`}>
                  <span className={styles.barName}>
                    <LabelDot color={r.label?.color ?? null} /> {r.label?.name ?? "No label"}
                  </span>
                  <span className={styles.track}>
                    <span
                      className={styles.stalk}
                      style={{ width: `${(r.v / Math.max(1, byLabel[0]!.v)) * 100}%`, background: r.label ? `var(--label-${r.label.color})` : "var(--color-text-muted)" }}
                    />
                  </span>
                  <span className={styles.barValue}>
                    {fmt(r.v)} <span className={styles.muted}>{total ? Math.round((r.v / total) * 100) : 0}%</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.section} aria-labelledby="per-day">
            <h3 id="per-day" className={styles.sectionTitle}>
              {prefs.units === "hours" ? "Time tracked" : "Tasks finished"} each day
            </h3>
            <div className={styles.columns} role="img" aria-label={`Daily ${prefs.units}, highest ${fmt(max)}`}>
              {perDay.map((d) => (
                <div key={d.date} className={styles.column} title={`${shortDate(d.date)}: ${fmt(d.v)}`}>
                  <span className={styles.vstalk} style={{ height: `${(d.v / max) * 100}%` }} />
                  {days <= 7 ? <span className={styles.colLabel}>{weekdayName(d.date)}</span> : null}
                </div>
              ))}
            </div>
          </section>

          <section className={styles.section} aria-labelledby="done-table">
            <div className={styles.sectionHead}>
              <h3 id="done-table" className={styles.sectionTitle}>
                Finished tasks
              </h3>
              <Button size="sm" icon={DownloadSimple} onClick={csv}>
                Download CSV
              </Button>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Label</th>
                    <th>Estimate</th>
                    <th>Actual</th>
                    <th>Finished</th>
                  </tr>
                </thead>
                <tbody>
                  {done
                    .slice()
                    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
                    .map((t) => {
                      const l = labels.find((x) => x.id === t.labelId);
                      return (
                        <tr key={t.id}>
                          <td>{t.title}</td>
                          <td>{l ? <><LabelDot color={l.color} /> {l.name}</> : "None"}</td>
                          <td>{t.estimate ? formatDuration(t.estimate) : "None"}</td>
                          <td>{formatDuration(t.actual)}</td>
                          <td>{shortDate(completedDay(t, zone))}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <section className={styles.section} aria-labelledby="stale">
        <div className={styles.sectionHead}>
          <h3 id="stale" className={styles.sectionTitle}>
            Needs attention
          </h3>
          {stale.length ? (
            <span className={styles.actions}>
              <Button size="sm" onClick={() => ui.toast(`Finished ${stale.length} tasks`, actions.completeTasks(stale.map((t) => t.id)))}>
                Mark all done
              </Button>
              <Button size="sm" onClick={() => ui.toast(`Moved ${stale.length} tasks to Trash`, actions.deleteTasks(stale.map((t) => t.id)))}>
                Delete all
              </Button>
            </span>
          ) : null}
        </div>
        {stale.length ? (
          <ul className={styles.staleList}>
            {stale.map((t) => (
              <li key={t.id}>
                <button type="button" className={styles.linkish} onClick={() => ui.openTask(t.id)}>
                  {t.title}
                </button>
                <span className={styles.muted}>{diffDays(today, todayIn(zone, t.createdAt))} days in the Brain Dump</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.muted}>Nothing has sat in the Brain Dump for two weeks or more.</p>
        )}
      </section>
    </div>
  );
}

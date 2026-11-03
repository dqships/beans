"use client";

import { useState, type ReactNode } from "react";
import {
  CalendarBlank,
  Check,
  Copy,
  CreditCard,
  Faders,
  Keyboard,
  PlugsConnected,
  PuzzlePiece,
  Tag,
  Timer,
  Trash,
  UserCircle,
  X,
} from "@phosphor-icons/react";
import { formatDuration, formatHour, ESTIMATE_PRESETS, relativeDay, shortDate, statusLine, todayIn, type FeatureFlags, type Settings } from "@beans/core";
import { useBilling } from "@/data/billing";
import { useConnectedApps, type ConnectedApp } from "@/data/connections";
import { MCP_URL } from "@/mcp/config";
import { useActions, useBackend, useLabels, useSettings } from "@/data/hooks";
import { Button, IconButton } from "@/ui/Button";
import { LabelDot, Switcher, TextInput, Toggle } from "@/ui/controls";
import { Icon } from "@/ui/Icon";
import { Modal } from "@/ui/Modal";
import { Popover } from "@/ui/Popover";
import { AccountAvatar, useAccount } from "./account";
import { ColorSwatches } from "./pickers";
import { SHORTCUTS } from "./ShortcutSheet";
import { useUi, type SettingsSection } from "./ui-state";
import styles from "./settings.module.css";
import { Kbd } from "@/ui/controls";
import { useRef } from "react";

const SECTIONS: { id: SettingsSection; label: string; icon: typeof Faders }[] = [
  { id: "general", label: "General", icon: Faders },
  { id: "calendar", label: "Calendar", icon: CalendarBlank },
  { id: "timer", label: "Timer", icon: Timer },
  { id: "labels", label: "Labels", icon: Tag },
  { id: "features", label: "Optional features", icon: PuzzlePiece },
  { id: "shortcuts", label: "Keyboard shortcuts", icon: Keyboard },
  { id: "account", label: "Account", icon: UserCircle },
  { id: "connected", label: "Connected apps", icon: PlugsConnected },
  { id: "subscription", label: "Subscription", icon: CreditCard },
];

export function SettingsDialog() {
  const ui = useUi();
  const section = ui.settingsSection;
  // Subscription only shows where Stripe is set up.
  const billed = Boolean(useBilling()?.status.enforced);
  const sections = SECTIONS.filter((s) => s.id !== "subscription" || billed);
  return (
    <Modal open={section !== null} onClose={() => ui.openSettings(null)} label="Settings" width="wide" className={styles.modal}>
      {section ? (
        <div className={styles.layout}>
          <nav className={styles.nav} aria-label="Settings sections">
            <h2 className={styles.navTitle}>Settings</h2>
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`${styles.navItem} ${section === s.id ? styles.navActive : ""}`}
                aria-current={section === s.id ? "page" : undefined}
                onClick={() => ui.openSettings(s.id)}
              >
                <Icon icon={s.icon} /> <span>{s.label}</span>
              </button>
            ))}
          </nav>
          <div className={styles.content}>
            <div className={styles.contentHead}>
              <h2 className={styles.title}>{SECTIONS.find((s) => s.id === section)!.label}</h2>
              <IconButton icon={X} label="Close settings" onClick={() => ui.openSettings(null)} />
            </div>
            {section === "general" ? <General /> : null}
            {section === "calendar" ? <CalendarSettings /> : null}
            {section === "timer" ? <TimerSettings /> : null}
            {section === "labels" ? <Labels /> : null}
            {section === "features" ? <Features /> : null}
            {section === "shortcuts" ? <Shortcuts /> : null}
            {section === "account" ? <Account /> : null}
            {section === "connected" ? <ConnectedApps /> : null}
            {section === "subscription" ? <Subscription /> : null}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function Row({ title, hint, children, htmlFor }: { title: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowText}>
        <label htmlFor={htmlFor} className={styles.rowTitle}>
          {title}
        </label>
        {hint ? <p className={styles.rowHint}>{hint}</p> : null}
      </div>
      <div className={styles.rowControl}>{children}</div>
    </div>
  );
}

function useSet() {
  const actions = useActions();
  return (fields: Partial<Omit<Settings, "id">>) => actions.updateSettings(fields);
}

function Select<T extends string | number>({ id, value, options, onChange }: { id?: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <select
      id={id}
      className={styles.select}
      value={String(value)}
      onChange={(e) => {
        const found = options.find((o) => String(o.value) === e.target.value);
        if (found) onChange(found.value);
      }}
    >
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function General() {
  const s = useSettings()!;
  const set = useSet();
  return (
    <div className={styles.group}>
      <Row title="Appearance">
        <Switcher
          label="Appearance"
          value={s.theme}
          onChange={(theme) => set({ theme })}
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
      </Row>
      <Row title="Sidebar shows">
        <Switcher
          label="Sidebar shows"
          value={s.sidebar}
          onChange={(sidebar) => set({ sidebar })}
          options={[
            { value: "one", label: "One list" },
            { value: "all", label: "All lists" },
          ]}
        />
      </Row>
      <Row title="New tasks go to the" htmlFor="new-pos">
        <Select id="new-pos" value={s.newTaskPosition} onChange={(newTaskPosition) => set({ newTaskPosition })} options={[{ value: "top", label: "Top" }, { value: "bottom", label: "Bottom" }]} />
      </Row>
      <Row title="Default estimate" hint="Given to every new task." htmlFor="default-est">
        <Select
          id="default-est"
          value={s.defaultEstimate ?? 0}
          onChange={(v) => set({ defaultEstimate: v === 0 ? null : v })}
          options={[{ value: 0, label: "None" }, ...ESTIMATE_PRESETS.slice(0, 9).map((m) => ({ value: m, label: formatDuration(m) }))]}
        />
      </Row>
      <Row title="Find labels in titles" hint="Typing [Work] in a title gives the task that label.">
        <Toggle label="Find labels in titles" checked={s.detectLabels} onChange={(detectLabels) => set({ detectLabels })} />
      </Row>
      <h3 className={styles.subhead}>Finishing tasks</h3>
      <Row title="Move finished tasks to the bottom">
        <Toggle label="Move finished tasks to the bottom" checked={s.completedToBottom} onChange={(completedToBottom) => set({ completedToBottom })} />
      </Row>
      <Row title="Finish a task when its subtasks are done">
        <Toggle label="Finish a task when its subtasks are done" checked={s.completeWithSubtasks} onChange={(completeWithSubtasks) => set({ completeWithSubtasks })} />
      </Row>
      <Row title="Fill in actual time" hint="If a finished task has no tracked time, use its estimate.">
        <Toggle label="Fill in actual time" checked={s.fillActual} onChange={(fillActual) => set({ fillActual })} />
      </Row>
      <h3 className={styles.subhead}>Rollover</h3>
      <Row title="Move unfinished tasks to today" hint="Runs after midnight in your time zone. Tasks more than 14 days old stay put.">
        <Toggle label="Move unfinished tasks to today" checked={s.rollover} onChange={(rollover) => set({ rollover })} />
      </Row>
      <Row title="Rolled tasks go to the" htmlFor="roll-pos">
        <Select id="roll-pos" value={s.rolloverPosition} onChange={(rolloverPosition) => set({ rolloverPosition })} options={[{ value: "top", label: "Top" }, { value: "bottom", label: "Bottom" }]} />
      </Row>
      <Row title="Roll over repeating tasks too">
        <Toggle label="Roll over repeating tasks too" checked={s.rolloverRepeating} onChange={(rolloverRepeating) => set({ rolloverRepeating })} />
      </Row>
    </div>
  );
}

function CalendarSettings() {
  const s = useSettings()!;
  const set = useSet();
  const hours = Array.from({ length: 13 }, (_, i) => i);
  return (
    <div className={styles.group}>
      <Row title="Week starts on" htmlFor="week-start">
        <Select id="week-start" value={s.weekStart} onChange={(weekStart) => set({ weekStart })} options={[{ value: 0 as const, label: "Sunday" }, { value: 1 as const, label: "Monday" }]} />
      </Row>
      <Row title="Calendar starts at" htmlFor="day-start">
        <Select id="day-start" value={s.dayStartHour} onChange={(dayStartHour) => set({ dayStartHour })} options={hours.map((h) => ({ value: h, label: formatHour(h, s.timeFormat) }))} />
      </Row>
      <Row title="Show weekends">
        <Toggle label="Show weekends" checked={s.showWeekends} onChange={(showWeekends) => set({ showWeekends })} />
      </Row>
      <Row title="Time format">
        <Switcher label="Time format" value={s.timeFormat} onChange={(timeFormat) => set({ timeFormat })} options={[{ value: "12h", label: "1:30pm" }, { value: "24h", label: "13:30" }]} />
      </Row>
      <Row title="Snap dragged tasks to" htmlFor="snap">
        <Select id="snap" value={s.snapMinutes} onChange={(snapMinutes) => set({ snapMinutes })} options={[5, 10, 15, 30, 60].map((m) => ({ value: m, label: formatDuration(m) }))} />
      </Row>
      <Row title="Daily workload limit" hint="The day's total turns red above this." htmlFor="limit">
        <Select
          id="limit"
          value={s.workloadLimit ?? 0}
          onChange={(v) => set({ workloadLimit: v === 0 ? null : v })}
          options={[{ value: 0, label: "Off" }, ...[4, 5, 6, 7, 8, 9, 10, 12].map((h) => ({ value: h * 60, label: `${h} hours` }))]}
        />
      </Row>
      <Row title="Time zone" hint="Rollover and Today follow this zone.">
        <span className={styles.value}>{s.timeZone}</span>
      </Row>
    </div>
  );
}

function TimerSettings() {
  const s = useSettings()!;
  const set = useSet();
  return (
    <div className={styles.group}>
      {!s.features.pomodoro ? <p className={styles.note}>Turn on Pomodoro in Optional features to use focus sessions.</p> : null}
      <Row title="Focus length" htmlFor="focus-len">
        <Select id="focus-len" value={s.pomodoroFocus} onChange={(pomodoroFocus) => set({ pomodoroFocus })} options={[15, 20, 25, 30, 45, 50, 60, 90].map((m) => ({ value: m, label: formatDuration(m) }))} />
      </Row>
      <Row title="Break length" htmlFor="break-len">
        <Select id="break-len" value={s.pomodoroBreak} onChange={(pomodoroBreak) => set({ pomodoroBreak })} options={[3, 5, 10, 15, 20, 30].map((m) => ({ value: m, label: formatDuration(m) }))} />
      </Row>
      <Row title="Play a sound between phases">
        <Toggle label="Play a sound between phases" checked={s.pomodoroSound} onChange={(pomodoroSound) => set({ pomodoroSound })} />
      </Row>
      <Row title="Start the next task when one is done" hint="Starts a timer on the next task in the day.">
        <Toggle label="Start the next task when one is done" checked={s.autoStartNext} onChange={(autoStartNext) => set({ autoStartNext })} />
      </Row>
    </div>
  );
}

function Labels() {
  const labels = useLabels();
  const actions = useActions();
  const ui = useUi();
  const [name, setName] = useState("");
  const [color, setColor] = useState("sprout");
  return (
    <div className={styles.group}>
      <form
        className={styles.newLabel}
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          actions.createLabel({ name, color });
          setName("");
        }}
      >
        <TextInput placeholder="New label name" aria-label="New label name" value={name} onChange={(e) => setName(e.target.value)} />
        <ColorSwatches value={color} onChange={setColor} />
        <Button type="submit" variant="primary" disabled={!name.trim()}>
          Add label
        </Button>
      </form>
      {labels.length === 0 ? <p className={styles.note}>No labels yet. Labels color your Timebox and power the filter and analytics.</p> : null}
      <ul className={styles.labelList}>
        {labels.map((l) => (
          <LabelRow
            key={l.id}
            label={l}
            onDelete={() => {
              const undo = actions.deleteLabel(l.id);
              ui.toast(`Deleted “${l.name}”`, undo);
            }}
          />
        ))}
      </ul>
    </div>
  );
}

function LabelRow({ label, onDelete }: { label: ReturnType<typeof useLabels>[number]; onDelete: () => void }) {
  const actions = useActions();
  const [name, setName] = useState(label.name);
  const [picking, setPicking] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <li className={styles.labelRow}>
      <button ref={ref} type="button" className={styles.colorButton} aria-label={`Color for ${label.name}`} onClick={() => setPicking(true)}>
        <LabelDot color={label.color} />
      </button>
      <TextInput
        aria-label="Label name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && name !== label.name && actions.updateLabel(label.id, { name: name.trim() })}
      />
      <IconButton icon={Trash} label={`Delete ${label.name}`} onClick={onDelete} />
      <Popover open={picking} onClose={() => setPicking(false)} anchor={ref} label="Label color">
        <ColorSwatches
          value={label.color}
          onChange={(c) => {
            actions.updateLabel(label.id, { color: c });
            setPicking(false);
          }}
        />
      </Popover>
    </li>
  );
}

const FEATURES: { key: keyof FeatureFlags; title: string; hint: string; appears: string }[] = [
  { key: "dueDates", title: "Due dates", hint: "Deadlines separate from the day you plan a task.", appears: "Due dates now show in task details and in a new sidebar tab." },
  { key: "priority", title: "Priority", hint: "High, medium and low flags. They never reorder anything.", appears: "Priority flags now show on cards and in task details." },
  { key: "templates", title: "Templates", hint: "Save tasks you repeat and drag them onto any day.", appears: "Templates now have their own sidebar tab." },
  { key: "pomodoro", title: "Pomodoro", hint: "Focus and break cycles with a countdown.", appears: "Start a focus session from a task's actual time. Lengths are in Settings, Timer." },
  { key: "dailyPlanning", title: "Daily planning and wrap-up", hint: "A short guided start and end to each day.", appears: "Plan your day and Wrap up your day are in the account menu." },
  { key: "analytics", title: "Analytics", hint: "Where your time goes, by label.", appears: "Analytics is in the account menu." },
];

function Features() {
  const s = useSettings()!;
  const set = useSet();
  const ui = useUi();
  return (
    <div className={styles.group}>
      <p className={styles.note}>Turn on only what you need. Everything else stays out of the way.</p>
      {FEATURES.map((f) => (
        <Row key={f.key} title={f.title} hint={f.hint}>
          <Toggle
            label={f.title}
            checked={s.features[f.key]}
            onChange={(v) => {
              set({ features: { ...s.features, [f.key]: v } });
              if (v) ui.toast(f.appears);
            }}
          />
        </Row>
      ))}
      {s.features.dueDates ? (
        <Row title="Show due dates on cards within" htmlFor="due-window">
          <Select id="due-window" value={s.dueSoonDays} onChange={(dueSoonDays) => set({ dueSoonDays })} options={[1, 2, 3, 5, 7, 14, 30].map((d) => ({ value: d, label: d === 1 ? "1 day" : `${d} days` }))} />
        </Row>
      ) : null}
    </div>
  );
}

function Shortcuts() {
  return (
    <div className={styles.group}>
      <p className={styles.note}>Single-key shortcuts only work when you aren&apos;t typing. Press ? anywhere to see this list.</p>
      {SHORTCUTS.map((g) => (
        <section key={g.group}>
          <h3 className={styles.subhead}>{g.group}</h3>
          {g.items.map(([keys, label]) => (
            <Row key={label} title={label}>
              <span className={styles.keys}>
                {keys.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </span>
            </Row>
          ))}
        </section>
      ))}
    </div>
  );
}

function Account() {
  const backend = useBackend();
  const account = useAccount();
  const ui = useUi();
  const manage = account.manage;
  return (
    <div className={styles.group}>
      <div className={styles.profile}>
        <span className={styles.profilePhoto}>
          <AccountAvatar account={account} />
        </span>
        <div className={styles.rowText}>
          <p className={styles.rowTitle}>{account.name ?? (backend === "sample" ? "Sample data" : "Your account")}</p>
          {account.email && account.email !== account.name ? <p className={styles.rowHint}>{account.email}</p> : null}
        </div>
      </div>
      {manage ? (
        <Row title="Profile" hint="Change your name, photo, email address and password.">
          <Button
            onClick={() => {
              // The profile opens in its own dialog, so Settings steps aside first.
              ui.openSettings(null);
              manage();
            }}
          >
            Manage account
          </Button>
        </Row>
      ) : null}
      <Row title="Where your data lives" hint={backend === "sample" ? "This is sample data in your browser tab. Nothing is saved." : "Saved to your account and synced live across your devices."}>
        <span className={styles.value}>{backend === "sample" ? "This tab only" : "Synced"}</span>
      </Row>
      {account.signOut ? (
        <Row title="Sign out">
          <Button onClick={account.signOut}>Sign out</Button>
        </Row>
      ) : null}
    </div>
  );
}

function ConnectedApps() {
  const backend = useBackend();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(MCP_URL).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      (e: unknown) => console.error(e),
    );
  };
  return (
    <div className={styles.group}>
      <p className={styles.intro}>
        Connect an AI app, such as Claude, ChatGPT or Cursor, and it can read your planner and change it for you. Paste this address into the app, then sign in to Beans and choose Allow.{" "}
        <a href="/connect-ai" target="_blank" rel="noreferrer">
          Steps for each app
        </a>
      </p>
      <div className={styles.address}>
        <code className={styles.addressText}>{MCP_URL}</code>
        <Button size="sm" icon={copied ? Check : Copy} onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <h3 className={styles.subhead}>Connected</h3>
      {backend === "convex" ? <ConnectedList /> : <p className={styles.rowHint}>Sign in to connect AI apps. Sample data stays in this tab.</p>}
    </div>
  );
}

function ConnectedList() {
  const { apps, disconnect } = useConnectedApps();
  const zone = useSettings()?.timeZone ?? "UTC";
  if (apps === undefined) return <p className={styles.rowHint}>Loading…</p>;
  if (!apps.length) return <p className={styles.rowHint}>No AI apps yet. Apps show up here after their first request.</p>;
  return (
    <ul className={styles.appList} aria-label="Connected apps">
      {apps.map((app) => (
        <ConnectedRow key={app.clientId} app={app} zone={zone} onDisconnect={() => disconnect(app.clientId)} />
      ))}
    </ul>
  );
}

function ConnectedRow({ app, zone, onDisconnect }: { app: ConnectedApp; zone: string; onDisconnect: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const today = todayIn(zone);
  const day = (ms: number) => {
    const d = todayIn(zone, ms);
    const words = relativeDay(d, today);
    return words === "Today" || words === "Yesterday" ? words.toLowerCase() : shortDate(d);
  };
  return (
    <li className={styles.row}>
      <div className={styles.rowText}>
        <p className={styles.rowTitle}>{app.name}</p>
        <p className={styles.rowHint}>
          Last used {day(app.lastUsedAt)}, connected since {day(app.firstUsedAt)}
        </p>
      </div>
      <div className={styles.rowControl}>
        <Button
          disabled={busy}
          onClick={() => {
            setBusy(true);
            onDisconnect().catch((e: unknown) => {
              console.error(e);
              setBusy(false);
            });
          }}
        >
          {busy ? "Disconnecting…" : "Disconnect"}
        </Button>
      </div>
    </li>
  );
}

function Subscription() {
  const billing = useBilling();
  const [opening, setOpening] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!billing) return null;
  const { status } = billing;
  return (
    <div className={styles.group}>
      <Row title={status.plan === "yearly" ? "Yearly plan" : status.plan === "monthly" ? "Monthly plan" : "Plan"} hint={statusLine(status)}>
        <span className={styles.value}>{status.status === "trialing" ? "Free trial" : !status.status && status.passEnd ? "Free days" : status.access ? "Active" : "Ended"}</span>
      </Row>
      <Row
        title="Manage subscription"
        hint={failed ? "The billing page didn't open. Try again in a minute." : "Cancel, switch between monthly and yearly, update your card, or download invoices. Opens Stripe's billing page."}
      >
        <Button
          disabled={opening || !status.hasCustomer}
          onClick={() => {
            setOpening(true);
            setFailed(false);
            billing.openPortal().catch((e: unknown) => {
              console.error(e);
              setFailed(true);
              setOpening(false);
            });
          }}
        >
          {opening ? "Opening…" : "Manage subscription"}
        </Button>
      </Row>
      <Row title="Refunds and help" hint="Email support@followusai.com within 14 days of a charge for a full refund. We can also cancel for you.">
        <a className={styles.value} href="mailto:support@followusai.com">
          support@followusai.com
        </a>
      </Row>
    </div>
  );
}

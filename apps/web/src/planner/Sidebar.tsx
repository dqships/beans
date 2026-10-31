"use client";

import { useRef, useState } from "react";
import {
  CalendarCheck,
  CaretUpDown,
  DotsThree,
  FlowArrow,
  ListBullets,
  PencilSimple,
  Plus,
  Rows,
  Trash,
  Tray,
} from "@phosphor-icons/react";
import { relativeDay, type List } from "@beans/core";
import { useActions, useAllTasks, useDueTasks, useLabels, useListTasks, useLists, useSettings, useTemplates, useToday } from "@/data/hooks";
import { Button, IconButton } from "@/ui/Button";
import { LabelDot, TextInput } from "@/ui/controls";
import { EmptyState } from "@/ui/garden";
import { Icon } from "@/ui/Icon";
import { Menu, MenuDivider, MenuHeading, MenuItem } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { Composer } from "./Composer";
import { SortableTask, TaskDropZone, containerId } from "./dnd";
import { useFilteredTasks } from "./FilterMenu";
import { TaskCard } from "./TaskCard";
import { TemplateCard } from "./TemplateCard";
import { TemplateEditor } from "./TemplateEditor";
import { useUi } from "./ui-state";
import styles from "./sidebar.module.css";

export const LIST_ICONS = ["📥", "📚", "🌱", "🏡", "💼", "🛒", "✈️", "🎨", "💡", "🧺", "🍳", "🏃", "🎵", "🧾", "🎁", "🐾"];

export function Sidebar() {
  const ui = useUi();
  const settings = useSettings();
  const showTabs = settings?.features.dueDates || settings?.features.templates;
  const tab = !showTabs
    ? "lists"
    : ui.sidebarTab === "due" && !settings?.features.dueDates
      ? "lists"
      : ui.sidebarTab === "templates" && !settings?.features.templates
        ? "lists"
        : ui.sidebarTab;
  return (
    <aside className={styles.sidebar} aria-label="Sidebar">
      {showTabs ? (
        <div className={styles.tabs} role="tablist" aria-label="Sidebar sections">
          <TabButton active={tab === "lists"} icon={ListBullets} label="Lists" onClick={() => ui.setSidebarTab("lists")} />
          {settings?.features.dueDates ? (
            <TabButton active={tab === "due"} icon={CalendarCheck} label="Due dates" onClick={() => ui.setSidebarTab("due")} />
          ) : null}
          {settings?.features.templates ? (
            <TabButton active={tab === "templates"} icon={FlowArrow} label="Templates" onClick={() => ui.setSidebarTab("templates")} />
          ) : null}
        </div>
      ) : null}
      {tab === "lists" ? <ListsPanel /> : tab === "due" ? <DuePanel /> : <TemplatesPanel />}
    </aside>
  );
}

function TabButton({ active, icon, label, onClick }: { active: boolean; icon: typeof Tray; label: string; onClick: () => void }) {
  return (
    <button type="button" role="tab" aria-selected={active} aria-label={label} title={label} className={`${styles.tab} ${active ? styles.tabActive : ""}`} onClick={onClick}>
      <Icon icon={icon} />
    </button>
  );
}

function ListsPanel() {
  const ui = useUi();
  const lists = useLists();
  const active = ui.activeList;
  const list = typeof active === "string" && active !== "all" ? lists.find((l) => l.id === active) : undefined;
  const listId = active === "all" ? null : (list?.id ?? null);
  return (
    <div className={styles.panel}>
      <ListHeader list={list} all={active === "all"} />
      {active === "all" ? (
        <div className={styles.scroll}>
          <ListSection listId={null} titled />
          {lists.map((l) => (
            <ListSection key={l.id} listId={l.id} titled />
          ))}
        </div>
      ) : (
        <div className={styles.scroll}>
          <ListSection listId={listId} />
        </div>
      )}
    </div>
  );
}

function ListSection({ listId, titled }: { listId: string | null; titled?: boolean }) {
  const tasks = useListTasks(listId);
  const shown = useFilteredTasks(tasks);
  const lists = useLists();
  const list = lists.find((l) => l.id === listId);
  const container = containerId({ kind: "list", listId });
  return (
    <section className={styles.section} aria-label={list ? list.name : "Brain Dump"}>
      {titled ? (
        <h3 className={styles.sectionTitle}>
          <span aria-hidden="true">{list ? list.icon : "🫘"}</span> {list ? list.name : "Brain Dump"}
          <span className={styles.count}>{tasks.filter((t) => !t.done).length}</span>
        </h3>
      ) : null}
      <Composer listId={listId} />
      <TaskDropZone target={{ kind: "list", listId }} tasks={shown} className={styles.taskList}>
        {shown.map((t, i) => (
          <SortableTask key={t.id} task={t} container={container} index={i} />
        ))}
        {tasks.length === 0 && !titled ? (
          <EmptyState compact scene="spill" title={listId ? "This list is empty" : "Spill the beans"}>
            {listId ? "Add tasks here before you give them a day." : "Get everything out of your head. Sort it into days later."}
          </EmptyState>
        ) : null}
      </TaskDropZone>
    </section>
  );
}

function ListHeader({ list, all }: { list: List | undefined; all: boolean }) {
  const ui = useUi();
  const lists = useLists();
  const allTasks = useAllTasks();
  const actions = useActions();
  const [open, setOpen] = useState<null | "switch" | "menu" | "new" | "edit">(null);
  const switchRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const count = (id: string | null) => allTasks.filter((t) => t.date === null && t.listId === id && !t.done).length;
  const title = all ? "All lists" : list ? list.name : "Brain Dump";
  const icon = all ? null : list ? list.icon : "🫘";
  return (
    <div className={styles.header}>
      <button ref={switchRef} type="button" className={styles.switch} aria-expanded={open === "switch"} onClick={() => setOpen("switch")}>
        {icon ? <span aria-hidden="true">{icon}</span> : <Icon icon={Rows} size="md" />}
        <span className={styles.switchTitle}>{title}</span>
        <Icon icon={CaretUpDown} />
      </button>
      {list ? (
        <IconButton ref={menuRef} icon={DotsThree} label="List actions" onClick={() => setOpen("menu")} />
      ) : null}
      <Popover open={open === "switch"} onClose={() => setOpen(null)} anchor={switchRef} label="Switch list">
        <Menu label="Lists">
          <MenuItem icon={Tray} checked={!all && !list} trailing={<span className={styles.count}>{count(null)}</span>} onSelect={() => { ui.setActiveList(null); setOpen(null); }}>
            Brain Dump
          </MenuItem>
          {lists.map((l) => (
            <MenuItem key={l.id} checked={list?.id === l.id} trailing={<span className={styles.count}>{count(l.id)}</span>} onSelect={() => { ui.setActiveList(l.id); setOpen(null); }}>
              {l.icon} {l.name}
            </MenuItem>
          ))}
          <MenuDivider />
          <MenuItem icon={Rows} checked={all} onSelect={() => { ui.setActiveList("all"); setOpen(null); }}>
            All lists
          </MenuItem>
          <MenuItem icon={Plus} onSelect={() => setOpen("new")}>
            New list
          </MenuItem>
        </Menu>
      </Popover>
      <Popover open={open === "new"} onClose={() => setOpen(null)} anchor={switchRef} label="New list">
        <ListForm
          submitLabel="Create list"
          onSubmit={(input) => {
            const { id } = actions.createList(input);
            ui.setActiveList(id);
            setOpen(null);
          }}
        />
      </Popover>
      {list ? (
        <>
          <Popover open={open === "menu"} onClose={() => setOpen(null)} anchor={menuRef} placement="bottom-end" label="List actions">
            <Menu label="List actions">
              <MenuItem icon={PencilSimple} onSelect={() => setOpen("edit")}>
                Edit list
              </MenuItem>
              <MenuItem
                icon={Trash}
                danger
                onSelect={() => {
                  const undo = actions.deleteList(list.id);
                  ui.setActiveList(null);
                  ui.toast(`Moved “${list.name}” to Trash`, undo);
                  setOpen(null);
                }}
              >
                Delete list
              </MenuItem>
            </Menu>
          </Popover>
          <Popover open={open === "edit"} onClose={() => setOpen(null)} anchor={menuRef} placement="bottom-end" label="Edit list">
            <ListForm
              initial={list}
              submitLabel="Save"
              onSubmit={(input) => {
                actions.updateList(list.id, input);
                setOpen(null);
              }}
            />
          </Popover>
        </>
      ) : null}
    </div>
  );
}

function ListForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: List;
  submitLabel: string;
  onSubmit: (input: { name: string; icon: string; autoLabelId: string | null }) => void;
}) {
  const labels = useLabels();
  const [name, setName] = useState(initial?.name ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? LIST_ICONS[0]!);
  const [autoLabelId, setAutoLabelId] = useState<string | null>(initial?.autoLabelId ?? null);
  return (
    <form
      className={styles.listForm}
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onSubmit({ name: name.trim(), icon, autoLabelId });
      }}
    >
      <MenuHeading>Icon</MenuHeading>
      <div className={styles.emojiGrid} role="radiogroup" aria-label="Icon">
        {LIST_ICONS.map((e) => (
          <button key={e} type="button" role="radio" aria-checked={icon === e} className={`${styles.emoji} ${icon === e ? styles.emojiOn : ""}`} onClick={() => setIcon(e)}>
            {e}
          </button>
        ))}
      </div>
      <TextInput data-autofocus placeholder="List name" aria-label="List name" value={name} onChange={(e) => setName(e.target.value)} />
      <MenuHeading>Label new tasks with</MenuHeading>
      <div className={styles.labelChoices}>
        <button type="button" className={`${styles.labelChoice} ${autoLabelId === null ? styles.labelChoiceOn : ""}`} onClick={() => setAutoLabelId(null)}>
          None
        </button>
        {labels.map((l) => (
          <button key={l.id} type="button" className={`${styles.labelChoice} ${autoLabelId === l.id ? styles.labelChoiceOn : ""}`} onClick={() => setAutoLabelId(l.id)}>
            <LabelDot color={l.color} /> {l.name}
          </button>
        ))}
      </div>
      <Button type="submit" variant="primary" disabled={!name.trim()}>
        {submitLabel}
      </Button>
    </form>
  );
}

function DuePanel() {
  const due = useDueTasks();
  const today = useToday();
  const groups = new Map<string, typeof due>();
  for (const t of due) {
    const key = t.dueDate! < today ? "Overdue" : relativeDay(t.dueDate!, today);
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.panelTitle}>Due dates</h2>
      </div>
      <div className={styles.scroll}>
        {due.length === 0 ? (
          <EmptyState compact scene="rest" title="No deadlines coming up">
            Add a due date in a task&apos;s details to see it here.
          </EmptyState>
        ) : null}
        {[...groups.entries()].map(([group, tasks]) => (
          <section key={group} className={styles.section}>
            <h3 className={styles.sectionTitle}>{group}</h3>
            {tasks.map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

function TemplatesPanel() {
  const templates = useTemplates();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.panelTitle}>Templates</h2>
        <IconButton icon={Plus} label="New template" onClick={() => setEditing("new")} />
      </div>
      <div className={styles.scroll}>
        <div className={styles.section}>
          {templates.length === 0 ? (
            <EmptyState compact scene="packet" title="No templates yet">
              Save tasks you repeat often, then drag them onto any day.
            </EmptyState>
          ) : (
            <p className={styles.hint}>Drag a template onto a day or the Timebox.</p>
          )}
          {templates.map((t) => (
            <TemplateCard key={t.id} template={t} onEdit={() => setEditing(t.id)} />
          ))}
        </div>
      </div>
      <TemplateEditor id={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

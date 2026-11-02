"use client";

import { useRef, useState } from "react";
import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  ChartBar,
  Funnel,
  Gear,
  Keyboard,
  Kanban,
  MagnifyingGlass,
  Moon,
  SidebarSimple,
  SignOut,
  Sun,
  SunHorizon,
  Trash,
} from "@phosphor-icons/react";
import { addDays, addMonths, monthName, type DateKey } from "@beans/core";
import { useActions, useBackend, useSettings, useToday, useTrash } from "@/data/hooks";
import { Button, IconButton } from "@/ui/Button";
import { Switcher } from "@/ui/controls";
import { Menu, MenuDivider, MenuHeading, MenuItem } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { FilterMenu } from "./FilterMenu";
import { TimerPill } from "./TimerPill";
import { useUi } from "./ui-state";
import { AccountAvatar, useAccount } from "./account";
import { useIsPhone } from "@/ui/useMedia";
import styles from "./shell.module.css";

export function TopBar() {
  const ui = useUi();
  const today = useToday();
  const settings = useSettings();
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLButtonElement>(null);
  const filtering = ui.filter.labelIds.length > 0 || !ui.filter.showCompleted || !ui.filter.showTimeboxed;

  const phone = useIsPhone();
  const step = (dir: 1 | -1) => {
    if (phone) {
      ui.setTimeboxDate(addDays(ui.timeboxDate ?? today, dir));
      return;
    }
    if (ui.view === "calendar") {
      const base = ui.calendarDate ?? today;
      const r = ui.calendarRange;
      ui.setCalendarDate(r === "month" ? addMonths(base, dir) : addDays(base, dir * (r === "week" ? 7 : r === "day" ? 1 : r)));
    } else {
      ui.board()?.step(dir);
    }
  };
  const goToday = () => {
    if (phone) ui.setTimeboxDate(null);
    else if (ui.view === "calendar") ui.setCalendarDate(today);
    else ui.board()?.scrollTo(today);
    ui.setTimeboxDate(null);
  };
  const calDate: DateKey = ui.calendarDate ?? today;

  return (
    <header className={styles.topbar}>
      <div className={styles.topGroup}>
        <IconButton
          icon={SidebarSimple}
          label={ui.sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          aria-pressed={ui.sidebarOpen}
          onClick={() => ui.setSidebarOpen(!ui.sidebarOpen)}
          className={styles.desktopOnly}
        />
        <Button size="sm" onClick={goToday}>
          Today
        </Button>
        <IconButton icon={CaretLeft} label="Back" onClick={() => step(-1)} />
        <IconButton icon={CaretRight} label="Forward" onClick={() => step(1)} />
        {ui.view === "calendar" && !phone ? (
          <h1 className={styles.monthTitle}>
            {monthName(calDate, true)} <span>{calDate.slice(0, 4)}</span>
          </h1>
        ) : null}
      </div>
      <div className={styles.topGroup}>
        <TimerPill placement="topbar" />
        <IconButton icon={MagnifyingGlass} label="Search (Ctrl K)" onClick={() => ui.setDialog("search")} />
        <Button
          ref={filterRef}
          size="sm"
          variant={filtering ? "primary" : "secondary"}
          icon={Funnel}
          aria-expanded={filterOpen}
          onClick={() => setFilterOpen((v) => !v)}
          className={styles.filterButton}
        >
          <span className={styles.desktopOnly}>Filter</span>
        </Button>
        <Popover open={filterOpen} onClose={() => setFilterOpen(false)} anchor={filterRef} placement="bottom-end" label="Filter">
          <FilterMenu />
        </Popover>
        <div className={styles.desktopOnly}>
          <Switcher
            label="View"
            value={ui.view}
            onChange={(v) => {
              ui.setView(v);
              if (v === "calendar") ui.setFocusMode(false);
            }}
            options={[
              { value: "calendar", label: "Calendar", icon: CalendarBlank },
              { value: "tasks", label: "Tasks", icon: Kanban },
            ]}
          />
        </div>
        <AccountMenu planning={settings?.features.dailyPlanning ?? false} analytics={settings?.features.analytics ?? false} />
        <div className={styles.desktopOnly}>
          <IconButton
            icon={SidebarSimple}
            label={ui.timeboxOpen ? "Hide right panel" : "Show right panel"}
            aria-pressed={ui.timeboxOpen}
            onClick={() => ui.setTimeboxOpen(!ui.timeboxOpen)}
            className={styles.mirrored}
          />
        </div>
      </div>
    </header>
  );
}

function AccountMenu({ planning, analytics }: { planning: boolean; analytics: boolean }) {
  const ui = useUi();
  const trash = useTrash();
  const backend = useBackend();
  const settings = useSettings();
  const actions = useActions();
  const account = useAccount();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const pick = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  const theme = settings?.theme ?? "system";
  return (
    <>
      <button
        ref={ref}
        type="button"
        className={styles.avatar}
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <AccountAvatar account={account} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchor={ref} placement="bottom-end" label="Account">
        <Menu label="Account">
          <MenuHeading>{account.name ?? (backend === "sample" ? "Sample data, not saved" : "Signed in")}</MenuHeading>
          <MenuItem icon={Gear} hint="Ctrl ," onSelect={pick(() => ui.openSettings("general"))}>
            Settings
          </MenuItem>
          {planning ? (
            <>
              <MenuItem icon={Sun} onSelect={pick(() => ui.setDialog("planning"))}>
                Plan your day
              </MenuItem>
              <MenuItem icon={SunHorizon} onSelect={pick(() => ui.setDialog("shutdown"))}>
                Wrap up your day
              </MenuItem>
            </>
          ) : null}
          {analytics ? (
            <MenuItem icon={ChartBar} onSelect={pick(() => ui.setDialog("analytics"))}>
              Analytics
            </MenuItem>
          ) : null}
          {trash.length ? (
            <MenuItem icon={Trash} onSelect={pick(() => ui.setDialog("trash"))} trailing={<span className={styles.count}>{trash.length}</span>}>
              Trash
            </MenuItem>
          ) : null}
          <MenuItem icon={Keyboard} hint="?" onSelect={pick(() => ui.setDialog("shortcuts"))}>
            Keyboard shortcuts
          </MenuItem>
          <MenuDivider />
          <MenuItem
            icon={theme === "dark" ? Moon : Sun}
            onSelect={() => actions.updateSettings({ theme: theme === "light" ? "dark" : theme === "dark" ? "system" : "light" })}
          >
            Theme: {theme === "system" ? "System" : theme === "light" ? "Light" : "Dark"}
          </MenuItem>
          {account.signOut ? (
            <MenuItem icon={SignOut} onSelect={pick(account.signOut)}>
              Sign out
            </MenuItem>
          ) : null}
        </Menu>
      </Popover>
    </>
  );
}

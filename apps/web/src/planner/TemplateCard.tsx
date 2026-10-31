"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Copy, PencilSimple, Trash, TreeStructure } from "@phosphor-icons/react";
import { formatClock, type Template } from "@beans/core";
import { useActions, useLabel, useToday } from "@/data/hooks";
import { LabelDot } from "@/ui/controls";
import { Icon } from "@/ui/Icon";
import { Menu, MenuDivider, MenuItem } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { useUi } from "./ui-state";
import styles from "./card.module.css";

export function TemplateCard({ template, overlay, onEdit }: { template: Template; overlay?: boolean; onEdit?: () => void }) {
  const label = useLabel(template.labelId);
  const actions = useActions();
  const ui = useUi();
  const today = useToday();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: `template:${template.id}`,
    data: { kind: "template", templateId: template.id },
    disabled: overlay,
  });
  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      className={`${styles.card} ${overlay ? styles.overlay : ""}`}
      style={isDragging ? { opacity: "var(--opacity-ghost)" } : undefined}
      onClick={onEdit}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenu({ x: e.clientX, y: e.clientY });
      }}
      role="button"
      aria-label={`Template: ${template.title}. Drag onto a day to use it.`}
    >
      <div className={styles.row}>
        <div className={styles.title}>{template.title}</div>
        {template.estimate ? <span className={styles.timeChip}>{formatClock(template.estimate)}</span> : null}
      </div>
      {label || template.subtasks.length ? (
        <div className={styles.meta}>
          {label ? (
            <span className={styles.metaItem}>
              <LabelDot color={label.color} /> {label.name}
            </span>
          ) : null}
          {template.subtasks.length ? (
            <span className={styles.metaItem}>
              <Icon icon={TreeStructure} /> {template.subtasks.length}
            </span>
          ) : null}
        </div>
      ) : null}
      <Popover open={menu !== null} onClose={() => setMenu(null)} anchor={menu} label="Template actions">
        <Menu label="Template actions">
          <MenuItem
            icon={Copy}
            onSelect={() => {
              setMenu(null);
              actions.useTemplate(template.id, { date: today });
              ui.toast("Added to today");
            }}
          >
            Add to today
          </MenuItem>
          {onEdit ? (
            <MenuItem
              icon={PencilSimple}
              onSelect={() => {
                setMenu(null);
                onEdit();
              }}
            >
              Edit
            </MenuItem>
          ) : null}
          <MenuDivider />
          <MenuItem
            icon={Trash}
            danger
            onSelect={() => {
              setMenu(null);
              const undo = actions.deleteTemplate(template.id);
              ui.toast("Template deleted", undo);
            }}
          >
            Delete
          </MenuItem>
        </Menu>
      </Popover>
    </div>
  );
}

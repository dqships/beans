import { useState } from "react";
import { Copy } from "@phosphor-icons/react/dist/ssr/Copy";
import { Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { Trash } from "@phosphor-icons/react/dist/ssr/Trash";
import { Mascot } from "@/ui/garden";
import { copyText, newId, useStored } from "../hooks";
import { Button, IconButton, PrintButton, Select, TextInput, kit } from "../kit";
import { EMPTY_DUMP, GROUPS, MAX_TEXT, MAX_THOUGHTS, addThoughts, countPlaces, dumpAsText, moveThought, parseDump, removeThought, renameThought, splitThoughts, thoughtsIn, type GroupId, type Place } from "../logic/braindump";
import styles from "./braindump.module.css";
import lists from "./lists.module.css";
import { BlankLines, ConfirmButton, EditableText, focusNextRow, paper } from "./paper";

/** What each group is for, shown while it's empty. */
const GROUP_HINTS: Record<GroupId, string> = {
  today: "What you'll do before the day is over.",
  week: "Not today, but in the next few days.",
  later: "Worth doing, with no date yet.",
  letgo: "Things you've decided not to do.",
};

const MOVE_OPTIONS: { value: Place; label: string }[] = [{ value: "pile", label: "Back to the pile" }, ...GROUPS.map((group) => ({ value: group.id as Place, label: group.name }))];

export function BrainDump() {
  const [dump, setDump] = useStored("brain-dump", EMPTY_DUMP, parseDump);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  const counts = countPlaces(dump);
  const total = dump.items.length;
  const full = total >= MAX_THOUGHTS;
  const pile = thoughtsIn(dump, "pile");

  /** Adds each line of what was typed or pasted. */
  const add = (raw: string) => {
    const lines = splitThoughts(raw);
    if (lines.length === 0) return;
    const ids = lines.map(() => newId());
    setDump((current) => addThoughts(current, lines, ids));
  };

  /**
   * Keeps the keyboard somewhere sensible when the row it's on is about to
   * leave: the next row's same control, or the group the row was in. Only
   * when that control has focus, so a tap on a phone never opens the keyboard.
   */
  const leaveRow = (control: Element | null, selector: string) => {
    if (!(control instanceof HTMLElement) || document.activeElement !== control) return;
    if (!focusNextRow(control, selector)) control.closest("section")?.focus();
  };

  const move = (control: Element | null, selector: string, id: string, place: Place) => {
    leaveRow(control, selector);
    setDump((current) => moveThought(current, id, place));
  };

  const remove = (control: Element | null, id: string) => {
    leaveRow(control, "[data-delete]");
    setDump((current) => removeThought(current, id));
  };

  return (
    <div className={`${lists.sheet} ${paper.paper}`}>
      <form
        className={`${lists.add} ${paper.noPrint}`}
        onSubmit={(e) => {
          e.preventDefault();
          add(text);
          setText("");
        }}
      >
        <TextInput
          value={text}
          onValue={setText}
          placeholder={full ? "The pile is full. Sort or delete a few." : "Type a thought and press Enter"}
          aria-label="New thought"
          maxLength={MAX_TEXT}
          disabled={full}
          autoComplete="off"
          onPaste={(e) => {
            // A pasted list goes straight onto the pile, one thought per line.
            const pasted = e.clipboardData.getData("text");
            if (!/[\r\n]/.test(pasted.trim())) return;
            e.preventDefault();
            add(pasted);
          }}
        />
        <Button type="submit" variant="primary" icon={Plus} disabled={full || !text.trim()}>
          Add
        </Button>
      </form>

      <section className={styles.pile} aria-label="The pile" tabIndex={-1}>
        <p className={styles.groupName}>
          The pile
          <span className={`${styles.count} ${paper.noPrint}`}>{counts.pile}</span>
        </p>
        {pile.length === 0 ? (
          <>
            <div className={`${styles.pileRows} ${styles.pileEmpty} ${lists.empty} ${paper.noPrint}`}>
              <Mascot scene="spill" className={lists.emptyMascot} />
              {total === 0 ? (
                <p>Spill the beans: type everything on your mind, one thing at a time.</p>
              ) : (
                <>
                  <p className={lists.emptyTitle}>The pile is empty.</p>
                  <p>Everything is sorted. Add more whenever something comes to mind.</p>
                </>
              )}
            </div>
            {total === 0 ? <BlankLines count={12} /> : null}
          </>
        ) : (
          <ul className={styles.pileRows}>
            {pile.map((item) => (
              <li key={item.id} className={styles.thought}>
                <EditableText className={styles.thoughtText} value={item.text} label="Thought" maxLength={MAX_TEXT} onCommit={(next) => setDump((current) => renameThought(current, item.id, next))} />
                <span className={`${styles.sorters} ${paper.noPrint}`}>
                  {GROUPS.map((group) => (
                    <Button key={group.id} size="sm" data-move={group.id} aria-label={`Move ${item.text} to ${group.name}`} onClick={(e) => move(e.currentTarget, `[data-move="${group.id}"]`, item.id, group.id)}>
                      {group.name}
                    </Button>
                  ))}
                  <IconButton icon={Trash} iconSize="sm" label={`Delete ${item.text}`} data-delete onClick={(e) => remove(e.currentTarget, item.id)} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className={styles.groups}>
        {GROUPS.map((group) => {
          const items = thoughtsIn(dump, group.id);
          return (
            <section key={group.id} className={styles.group} aria-label={group.name} tabIndex={-1}>
              <p className={styles.groupName}>
                {group.name}
                <span className={`${styles.count} ${paper.noPrint}`}>{counts[group.id]}</span>
              </p>
              {items.length === 0 ? (
                <div className={styles.groupRows}>
                  <p className={`${styles.hint} ${paper.noPrint}`}>{GROUP_HINTS[group.id]}</p>
                  <BlankLines count={3} />
                </div>
              ) : (
                <ul className={styles.groupRows}>
                  {items.map((item) => (
                    <li key={item.id} className={styles.sorted}>
                      <EditableText className={styles.sortedText} value={item.text} label="Thought" maxLength={MAX_TEXT} onCommit={(next) => setDump((current) => renameThought(current, item.id, next))} />
                      <Select
                        className={`${styles.movePick} ${paper.noPrint}`}
                        value={item.place}
                        options={MOVE_OPTIONS}
                        aria-label={`Move ${item.text}`}
                        data-pick
                        onValue={(place) => move(document.activeElement, "[data-pick]", item.id, place)}
                      />
                      <IconButton icon={Trash} iconSize="sm" label={`Delete ${item.text}`} className={paper.noPrint} data-delete onClick={(e) => remove(e.currentTarget, item.id)} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <div className={`${lists.foot} ${paper.noPrint}`}>
        <span className={lists.count} role="status">
          {total === 0 ? "0 thoughts" : `${total} ${total === 1 ? "thought" : "thoughts"}, ${counts.pile} still in the pile`}
        </span>
        <span className={kit.bar}>
          <ConfirmButton confirm="Clear it all?" disabled={total === 0} onConfirm={() => setDump(EMPTY_DUMP)}>
            Clear all
          </ConfirmButton>
          <Button
            icon={Copy}
            disabled={total === 0}
            onClick={async () => {
              setCopied(await copyText(dumpAsText(dump)));
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? "Copied" : "Copy as text"}
          </Button>
          <PrintButton />
        </span>
      </div>
    </div>
  );
}

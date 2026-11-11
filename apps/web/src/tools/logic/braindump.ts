/** The brain dump tool: a pile of thoughts, and the four groups you sort them into. All pure: each change returns a new dump. */

export const GROUPS = [
  { id: "today", name: "Today" },
  { id: "week", name: "This week" },
  { id: "later", name: "Later" },
  { id: "letgo", name: "Let go" },
] as const;

export type GroupId = (typeof GROUPS)[number]["id"];

/** Where a thought is: still in the pile, or in one of the groups. */
export type Place = "pile" | GroupId;

export type Thought = { id: string; text: string; place: Place };

export type Dump = { items: Thought[] };

export const EMPTY_DUMP: Dump = { items: [] };

export const MAX_THOUGHTS = 300;
export const MAX_TEXT = 300;

const PLACES: readonly Place[] = ["pile", ...GROUPS.map((group) => group.id)];

export const placeName = (place: Place): string => (place === "pile" ? "The pile" : GROUPS.find((group) => group.id === place)!.name);

/** Bullets, numbers and checkboxes that come along when a list is pasted. */
const MARKER = /^(?:[-*•–—·▪◦]+|\d{1,3}[.)]|\[[ xX]?\])\s+/;

const clean = (text: string) => {
  let line = text.replace(/\s+/g, " ").trim();
  // "- [ ] Call Sam" has two markers.
  for (let i = 0; i < 2; i++) line = line.replace(MARKER, "");
  return line.slice(0, MAX_TEXT).trim();
};

/** Splits what was typed or pasted into thoughts: one per line, with list markers and blank lines dropped. */
export function splitThoughts(text: string): string[] {
  return text.split(/\r\n|\r|\n/).map(clean).filter(Boolean);
}

/** Adds thoughts to the end of the pile. `ids` needs one id per line; lines past a full pile are dropped. */
export function addThoughts(dump: Dump, lines: readonly string[], ids: readonly string[]): Dump {
  const room = Math.max(0, MAX_THOUGHTS - dump.items.length);
  const added: Thought[] = [];
  for (let i = 0; i < lines.length && added.length < room; i++) {
    const text = clean(lines[i]!);
    const id = ids[i];
    if (text && id) added.push({ id, text, place: "pile" });
  }
  return added.length === 0 ? dump : { items: [...dump.items, ...added] };
}

/** Moves a thought to a group, or back to the pile. It lands at the end of where it goes. */
export function moveThought(dump: Dump, id: string, place: Place): Dump {
  const item = dump.items.find((thought) => thought.id === id);
  if (!item || item.place === place) return dump;
  return { items: [...dump.items.filter((thought) => thought.id !== id), { ...item, place }] };
}

/** Changes a thought's text. Emptying it removes the thought. */
export function renameThought(dump: Dump, id: string, text: string): Dump {
  const cleaned = text.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
  if (!cleaned) return removeThought(dump, id);
  return { items: dump.items.map((thought) => (thought.id === id ? { ...thought, text: cleaned } : thought)) };
}

export function removeThought(dump: Dump, id: string): Dump {
  return { items: dump.items.filter((thought) => thought.id !== id) };
}

export function thoughtsIn(dump: Dump, place: Place): Thought[] {
  return dump.items.filter((thought) => thought.place === place);
}

/** How many thoughts are in each place. */
export function countPlaces(dump: Dump): Record<Place, number> {
  const counts: Record<Place, number> = { pile: 0, today: 0, week: 0, later: 0, letgo: 0 };
  for (const thought of dump.items) counts[thought.place] += 1;
  return counts;
}

/** The dump as plain text for the clipboard: each group under its heading, then what's still unsorted. Empty groups are left out. */
export function dumpAsText(dump: Dump): string {
  const sections: string[] = [];
  for (const place of [...GROUPS.map((group) => group.id), "pile"] as Place[]) {
    const items = thoughtsIn(dump, place);
    if (items.length === 0) continue;
    const heading = place === "pile" ? "Not sorted yet" : placeName(place);
    sections.push([heading, ...items.map((thought) => `- ${thought.text}`)].join("\n"));
  }
  return sections.join("\n\n");
}

/** Checks a dump read back from local storage. */
export function parseDump(stored: unknown): Dump | null {
  if (!stored || typeof stored !== "object") return null;
  const { items } = stored as Record<string, unknown>;
  if (!Array.isArray(items)) return null;
  const parsed: Thought[] = [];
  const seen = new Set<string>();
  for (const item of items.slice(0, MAX_THOUGHTS)) {
    if (!item || typeof item !== "object") return null;
    const { id, text, place } = item as Record<string, unknown>;
    if (typeof id !== "string" || typeof text !== "string" || !text.trim() || !PLACES.includes(place as Place) || seen.has(id)) return null;
    seen.add(id);
    parsed.push({ id, text: text.slice(0, MAX_TEXT), place: place as Place });
  }
  return { items: parsed };
}

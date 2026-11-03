import type { BeansState, Settings } from "../packages/core/src/model";
import { ONBOARDED } from "../packages/core/src/onboarding";
import { defaultSettings } from "../packages/core/src/settings";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { DB_TABLE, type ClientTable } from "./validators";

/**
 * Beans' id for a user, stored in every table's `userId`: the Clerk user id
 * (the token's subject). Rows used to be stored under Convex's token
 * identifier, `<issuer>|<subject>`, whose issuer is Clerk's sign-in domain, so
 * changing that domain would have given everyone a new id.
 */
export function stableUserId(id: string): string {
  const bar = id.indexOf("|");
  return bar === -1 ? id : id.slice(bar + 1);
}

/** The signed-in user's stable id, or an error when signed out. */
export async function requireUser(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not signed in");
  return identity.subject;
}

type Owned = { _id: unknown; _creationTime: number; userId: string; clientId: string };
type Stripped<T> = Omit<T, "_id" | "_creationTime" | "userId" | "clientId"> & { id: string };

/** Database document to the record shape the client uses. */
export function toRecord<T extends Owned>(doc: T): Stripped<T> {
  const { _id, _creationTime, userId, clientId, ...rest } = doc;
  void _id;
  void _creationTime;
  void userId;
  return { id: clientId, ...rest } as Stripped<T>;
}

export function toSettings(doc: Doc<"userSettings">): Settings {
  const { _id, _creationTime, userId, ...rest } = doc;
  void _id;
  void _creationTime;
  void userId;
  return { id: "settings", ...rest, onboarding: rest.onboarding ?? ONBOARDED };
}

export async function findByClientId(ctx: QueryCtx | MutationCtx, table: ClientTable, userId: string, clientId: string) {
  const name = DB_TABLE[table];
  return await ctx.db
    .query(name)
    .withIndex("by_user_client", (q) => q.eq("userId", userId).eq("clientId", clientId))
    .unique();
}

export async function getSettings(ctx: QueryCtx | MutationCtx, userId: string) {
  return await ctx.db
    .query("userSettings")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

/** An empty state with the user's settings, for running core logic on the server. */
export function stateWith(settings: Settings | null, timeZone = "UTC"): BeansState {
  return {
    tasks: {},
    subtasks: {},
    lists: {},
    labels: {},
    templates: {},
    series: {},
    timeEntries: {},
    settings: settings ?? defaultSettings(timeZone),
  };
}

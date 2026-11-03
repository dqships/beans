import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  attachmentFields,
  labelFields,
  listFields,
  seriesFields,
  settingsFields,
  subtaskFields,
  taskFields,
  templateFields,
  timeEntryFields,
} from "./validators";

/**
 * Every table is scoped by `userId` (the Clerk user id, see `stableUserId`) and
 * keyed by `clientId`, the id the client made. `updatedAt` and `deletedAt`
 * are kept for offline sync later.
 */
const owned = { userId: v.string(), clientId: v.string() };

export default defineSchema({
  tasks: defineTable({ ...owned, ...taskFields })
    .index("by_user_client", ["userId", "clientId"])
    .index("by_user_date", ["userId", "date"])
    .index("by_user_deleted", ["userId", "deletedAt"])
    .index("by_user_series_date", ["userId", "seriesId", "seriesDate"])
    .searchIndex("search_title", { searchField: "title", filterFields: ["userId"] }),
  subtasks: defineTable({ ...owned, ...subtaskFields })
    .index("by_user_client", ["userId", "clientId"])
    .index("by_user_task", ["userId", "taskId"]),
  lists: defineTable({ ...owned, ...listFields }).index("by_user_client", ["userId", "clientId"]),
  labels: defineTable({ ...owned, ...labelFields }).index("by_user_client", ["userId", "clientId"]),
  templates: defineTable({ ...owned, ...templateFields }).index("by_user_client", ["userId", "clientId"]),
  recurringSeries: defineTable({ ...owned, ...seriesFields }).index("by_user_client", ["userId", "clientId"]),
  timeEntries: defineTable({ ...owned, ...timeEntryFields })
    .index("by_user_client", ["userId", "clientId"])
    .index("by_user_started", ["userId", "startedAt"]),
  attachments: defineTable({ ...owned, ...attachmentFields })
    .index("by_user_client", ["userId", "clientId"])
    .index("by_user_task", ["userId", "taskId"]),
  userSettings: defineTable({ userId: v.string(), ...settingsFields })
    .index("by_user", ["userId"])
    .index("by_last_rollover", ["lastRollover"]),
  /** One row per user: their Stripe customer and newest subscription, kept current by the Stripe webhook. */
  billing: defineTable({
    userId: v.string(),
    customerId: v.union(v.string(), v.null()),
    subscriptionId: v.union(v.string(), v.null()),
    status: v.union(v.string(), v.null()),
    priceId: v.union(v.string(), v.null()),
    trialEnd: v.union(v.number(), v.null()),
    periodEnd: v.union(v.number(), v.null()),
    cancelAtPeriodEnd: v.boolean(),
    /** A launch offer on the subscription: its percent off and when it ends. */
    discountPercent: v.optional(v.union(v.number(), v.null())),
    discountEnd: v.optional(v.union(v.number(), v.null())),
    /** Set by the first subscription, so the free trial is given once. */
    trialUsed: v.boolean(),
    /** When the no-card free days end. Set once, so they're given once. */
    passEnd: v.optional(v.union(v.number(), v.null())),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_customer", ["customerId"]),
});

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
 * Every table is scoped by `userId` (the Clerk user's token identifier) and
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
});

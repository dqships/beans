import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Every 15 minutes, so each user's rollover runs soon after their local midnight,
// including zones with half-hour and quarter-hour offsets.
crons.interval("daily rollover and Trash cleanup", { minutes: 15 }, internal.maintenance.dailyBatch, { cursor: null });

export default crons;

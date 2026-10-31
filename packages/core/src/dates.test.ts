import { describe, expect, it } from "vitest";
import { addDays, addMonths, diffDays, formatTime, relativeDay, startOfWeek, todayIn, weekday, minutesToTime, timeToMinutes } from "./dates";

describe("dates", () => {
  it("adds days across months, years and DST changes", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
  });
  it("diffs days", () => {
    expect(diffDays("2026-11-02", "2026-10-31")).toBe(2);
    expect(diffDays("2026-10-31", "2026-11-02")).toBe(-2);
  });
  it("finds weekdays and week starts", () => {
    expect(weekday("2026-10-31")).toBe(6);
    expect(startOfWeek("2026-10-31", 0)).toBe("2026-10-25");
    expect(startOfWeek("2026-10-31", 1)).toBe("2026-10-26");
    expect(startOfWeek("2026-10-25", 1)).toBe("2026-10-19");
  });
  it("adds months and clamps the day", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-11-15", 2)).toBe("2027-01-15");
    expect(addMonths("2026-01-15", -1)).toBe("2025-12-15");
  });
  it("gets today in a time zone", () => {
    const instant = Date.UTC(2026, 9, 31, 23, 30);
    expect(todayIn("UTC", instant)).toBe("2026-10-31");
    expect(todayIn("Asia/Tokyo", instant)).toBe("2026-11-01");
    expect(todayIn("America/Los_Angeles", instant)).toBe("2026-10-31");
  });
  it("formats times", () => {
    expect(formatTime("15:30", "12h")).toBe("3:30pm");
    expect(formatTime("00:00", "12h", true)).toBe("12am");
    expect(formatTime("09:05", "24h")).toBe("09:05");
    expect(minutesToTime(timeToMinutes("23:45"))).toBe("23:45");
  });
  it("names days relative to today", () => {
    expect(relativeDay("2026-10-31", "2026-10-31")).toBe("Today");
    expect(relativeDay("2026-11-01", "2026-10-31")).toBe("Tomorrow");
    expect(relativeDay("2026-10-30", "2026-10-31")).toBe("Yesterday");
    expect(relativeDay("2026-11-03", "2026-10-31")).toBe("Tuesday");
    expect(relativeDay("2026-12-25", "2026-10-31")).toBe("Fri, Dec 25");
  });
});

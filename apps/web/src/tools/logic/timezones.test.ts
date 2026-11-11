import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLANNER,
  PLACES,
  buildStrips,
  cleanZone,
  clockToMinutes,
  dayShift,
  dayShiftLabel,
  defaultZones,
  formatCell,
  formatClock,
  formatDay,
  hourRanges,
  minutesToClock,
  isKnownZone,
  isPlannerDate,
  isWorkingHour,
  offsetLabel,
  offsetMinutes,
  overlapSentence,
  parsePlanner,
  parseZones,
  placeLabel,
  placeOptions,
  shiftDay,
  suggestZone,
  wallTime,
  zonedToUtc,
} from "./timezones";

const NY = "America/New_York";
const LONDON = "Europe/London";
const INDIA = "Asia/Kolkata";
const TOKYO = "Asia/Tokyo";
const SYDNEY = "Australia/Sydney";

const utc = (text: string) => Date.parse(`${text}Z`);

describe("the list of places", () => {
  it("only has zones this runtime knows, each once", () => {
    for (const place of PLACES) expect(isKnownZone(place.zone), place.zone).toBe(true);
    expect(new Set(PLACES.map((place) => place.zone)).size).toBe(PLACES.length);
  });

  it("names places on the list and off it", () => {
    expect(placeLabel(NY)).toBe("New York");
    expect(placeLabel("America/Boise")).toBe("Boise");
    expect(placeLabel("America/Port_of_Spain")).toBe("Port of Spain");
  });

  it("offers a zone that isn't on the list when it's chosen", () => {
    expect(placeOptions([NY]).length).toBe(PLACES.length);
    const options = placeOptions(["America/Boise", NY]);
    expect(options.length).toBe(PLACES.length + 1);
    expect(options[0]).toEqual({ value: "America/Boise", label: "Boise" });
  });

  it("falls back to UTC for a zone it doesn't know, and maps old names", () => {
    expect(isKnownZone("Mars/Olympus_Mons")).toBe(false);
    expect(isKnownZone("")).toBe(false);
    expect(cleanZone("Mars/Olympus_Mons")).toBe("UTC");
    expect(cleanZone("Asia/Calcutta")).toBe(INDIA);
    expect(cleanZone(NY)).toBe(NY);
  });

  it("starts with the visitor's zone and one across an ocean", () => {
    expect(defaultZones(NY)).toEqual([NY, LONDON]);
    expect(defaultZones(LONDON)).toEqual([LONDON, NY]);
    expect(defaultZones(TOKYO)).toEqual([TOKYO, NY]);
    expect(defaultZones("Not/AZone")).toEqual(["UTC", NY]);
  });
});

describe("offsets from UTC", () => {
  it("knows winter and summer time", () => {
    expect(offsetMinutes(NY, utc("2026-01-15T12:00:00"))).toBe(-300);
    expect(offsetMinutes(NY, utc("2026-07-15T12:00:00"))).toBe(-240);
    expect(offsetMinutes(LONDON, utc("2026-01-15T12:00:00"))).toBe(0);
    expect(offsetMinutes(LONDON, utc("2026-07-15T12:00:00"))).toBe(60);
    // Sydney's summer is January.
    expect(offsetMinutes(SYDNEY, utc("2026-01-15T12:00:00"))).toBe(660);
    expect(offsetMinutes(SYDNEY, utc("2026-07-15T12:00:00"))).toBe(600);
  });

  it("handles half-hour zones and zones with no daylight saving", () => {
    expect(offsetMinutes(INDIA, utc("2026-01-15T12:00:00"))).toBe(330);
    expect(offsetMinutes(INDIA, utc("2026-07-15T12:00:00"))).toBe(330);
    expect(offsetMinutes(TOKYO, utc("2026-07-15T12:00:00"))).toBe(540);
    expect(offsetMinutes("UTC", utc("2026-07-15T12:00:00"))).toBe(0);
  });

  it("changes at the exact moment the clocks do", () => {
    // New York, March 8, 2026: 2:00 am becomes 3:00 am at 07:00 UTC.
    expect(offsetMinutes(NY, utc("2026-03-08T06:59:00"))).toBe(-300);
    expect(offsetMinutes(NY, utc("2026-03-08T07:00:00"))).toBe(-240);
    // And back on November 1, 2026, at 06:00 UTC.
    expect(offsetMinutes(NY, utc("2026-11-01T05:59:00"))).toBe(-240);
    expect(offsetMinutes(NY, utc("2026-11-01T06:00:00"))).toBe(-300);
    // London, March 29, 2026, at 01:00 UTC.
    expect(offsetMinutes(LONDON, utc("2026-03-29T00:59:00"))).toBe(0);
    expect(offsetMinutes(LONDON, utc("2026-03-29T01:00:00"))).toBe(60);
  });

  it("writes an offset the short way", () => {
    expect(offsetLabel(0)).toBe("UTC");
    expect(offsetLabel(60)).toBe("UTC+1");
    expect(offsetLabel(-300)).toBe("UTC-5");
    expect(offsetLabel(330)).toBe("UTC+5:30");
    expect(offsetLabel(-210)).toBe("UTC-3:30");
  });
});

describe("the time on the wall", () => {
  it("reads the local date and time at an instant", () => {
    const moment = utc("2026-11-11T15:00:00");
    expect(wallTime(NY, moment)).toEqual({ date: "2026-11-11", minutes: 10 * 60 });
    expect(wallTime(LONDON, moment)).toEqual({ date: "2026-11-11", minutes: 15 * 60 });
    expect(wallTime(INDIA, moment)).toEqual({ date: "2026-11-11", minutes: 20 * 60 + 30 });
    expect(wallTime(TOKYO, moment)).toEqual({ date: "2026-11-12", minutes: 0 });
    expect(wallTime(SYDNEY, moment)).toEqual({ date: "2026-11-12", minutes: 2 * 60 });
  });

  it("reads midnight as 0:00, not 24:00", () => {
    expect(wallTime("UTC", utc("2026-11-11T00:00:00"))).toEqual({ date: "2026-11-11", minutes: 0 });
    expect(wallTime(NY, utc("2026-11-11T05:00:00"))).toEqual({ date: "2026-11-11", minutes: 0 });
  });

  it("uses UTC for a zone it doesn't know, and doesn't break on a bad timestamp", () => {
    expect(wallTime("Mars/Olympus_Mons", utc("2026-11-11T15:00:00"))).toEqual({ date: "2026-11-11", minutes: 15 * 60 });
    expect(wallTime(NY, Number.NaN)).toEqual({ date: "1970-01-01", minutes: 0 });
    expect(offsetMinutes(NY, Number.NaN)).toBe(0);
  });
});

describe("a wall time as an instant", () => {
  it("converts both ways in winter and summer", () => {
    expect(zonedToUtc(NY, "2026-01-15", 9 * 60)).toBe(utc("2026-01-15T14:00:00"));
    expect(zonedToUtc(NY, "2026-07-15", 9 * 60)).toBe(utc("2026-07-15T13:00:00"));
    expect(zonedToUtc(INDIA, "2026-07-15", 9 * 60)).toBe(utc("2026-07-15T03:30:00"));
    expect(zonedToUtc(SYDNEY, "2026-01-15", 9 * 60)).toBe(utc("2026-01-14T22:00:00"));
    expect(zonedToUtc("UTC", "2026-01-15", 0)).toBe(utc("2026-01-15T00:00:00"));
  });

  it("round-trips every hour of an ordinary day in every listed place", () => {
    for (const place of PLACES) {
      for (let hour = 0; hour < 24; hour += 1) {
        const instant = zonedToUtc(place.zone, "2026-06-10", hour * 60);
        expect(wallTime(place.zone, instant), `${place.zone} ${hour}:00`).toEqual({ date: "2026-06-10", minutes: hour * 60 });
      }
    }
  });

  it("is right on both sides of the spring change", () => {
    // New York, March 8, 2026.
    expect(zonedToUtc(NY, "2026-03-08", 60 + 30)).toBe(utc("2026-03-08T06:30:00"));
    expect(zonedToUtc(NY, "2026-03-08", 3 * 60)).toBe(utc("2026-03-08T07:00:00"));
    expect(zonedToUtc(NY, "2026-03-08", 12 * 60)).toBe(utc("2026-03-08T16:00:00"));
    // 2:30 am doesn't exist that day; it's taken as 3:30 am.
    const skipped = zonedToUtc(NY, "2026-03-08", 2 * 60 + 30);
    expect(skipped).toBe(utc("2026-03-08T07:30:00"));
    expect(wallTime(NY, skipped)).toEqual({ date: "2026-03-08", minutes: 3 * 60 + 30 });
  });

  it("takes the first pass through the hour that happens twice in autumn", () => {
    // New York, November 1, 2026: 1:30 am happens at 05:30 and 06:30 UTC.
    expect(zonedToUtc(NY, "2026-11-01", 60 + 30)).toBe(utc("2026-11-01T05:30:00"));
    expect(zonedToUtc(NY, "2026-11-01", 12 * 60)).toBe(utc("2026-11-01T17:00:00"));
    // London, October 25, 2026: 1:30 am happens at 00:30 and 01:30 UTC.
    expect(zonedToUtc(LONDON, "2026-10-25", 60 + 30)).toBe(utc("2026-10-25T00:30:00"));
    expect(zonedToUtc(LONDON, "2026-10-25", 12 * 60)).toBe(utc("2026-10-25T12:00:00"));
  });

  it("is right in the southern hemisphere, where the change runs the other way", () => {
    // Sydney clocks go back on April 5, 2026 and forward on October 4, 2026.
    expect(zonedToUtc(SYDNEY, "2026-04-04", 12 * 60)).toBe(utc("2026-04-04T01:00:00"));
    expect(zonedToUtc(SYDNEY, "2026-04-06", 12 * 60)).toBe(utc("2026-04-06T02:00:00"));
    expect(zonedToUtc(SYDNEY, "2026-10-05", 12 * 60)).toBe(utc("2026-10-05T01:00:00"));
  });
});

describe("day shifts", () => {
  it("counts whole days between two dates", () => {
    expect(dayShift("2026-11-12", "2026-11-11")).toBe(1);
    expect(dayShift("2026-11-10", "2026-11-11")).toBe(-1);
    expect(dayShift("2026-11-11", "2026-11-11")).toBe(0);
    expect(dayShift("2027-01-01", "2026-12-31")).toBe(1);
  });

  it("says it plainly", () => {
    expect(dayShiftLabel(0)).toBe("");
    expect(dayShiftLabel(1)).toBe("next day");
    expect(dayShiftLabel(-1)).toBe("previous day");
    expect(dayShiftLabel(2)).toBe("2 days later");
    expect(dayShiftLabel(-2)).toBe("2 days earlier");
  });
});

describe("the hour strips", () => {
  it("marks 9:00 to 17:00 as working hours", () => {
    expect(isWorkingHour(8 * 60)).toBe(false);
    expect(isWorkingHour(9 * 60)).toBe(true);
    expect(isWorkingHour(16 * 60)).toBe(true);
    expect(isWorkingHour(17 * 60)).toBe(false);
    // An hour that starts at 8:30 or 16:30 isn't wholly inside.
    expect(isWorkingHour(8 * 60 + 30)).toBe(false);
    expect(isWorkingHour(16 * 60 + 30)).toBe(false);
    expect(isWorkingHour(9 * 60 + 30)).toBe(true);
  });

  it("lines every place up against the first place's day", () => {
    const strips = buildStrips([NY, LONDON, TOKYO], "2026-01-15");
    expect(strips.rows.length).toBe(3);
    expect(strips.rows[0]!.map((cell) => cell.minutes)).toEqual(Array.from({ length: 24 }, (_, hour) => hour * 60));
    // 9:00 in New York is 14:00 in London and 23:00 in Tokyo.
    expect(strips.rows[1]![9]).toEqual({ minutes: 14 * 60, shift: 0, working: true });
    expect(strips.rows[2]![9]).toEqual({ minutes: 23 * 60, shift: 0, working: false });
    // 10:00 in New York is midnight the next day in Tokyo.
    expect(strips.rows[2]![10]).toEqual({ minutes: 0, shift: 1, working: false });
    // 20:00 in New York is 1:00 the next day in London.
    expect(strips.rows[1]![20]).toEqual({ minutes: 60, shift: 1, working: false });
  });

  it("finds the hours when New York and London are both at work", () => {
    // Five hours apart in January: 9:00 to 12:00 New York time.
    expect(hourRanges(buildStrips([NY, LONDON], "2026-01-15").overlap)).toEqual([[9, 12]]);
    // Seen from London, the same hours are 14:00 to 17:00.
    expect(hourRanges(buildStrips([LONDON, NY], "2026-01-15").overlap)).toEqual([[14, 17]]);
  });

  it("follows the weeks when one place has changed its clocks and the other hasn't", () => {
    // From March 8 to March 29, 2026 New York is on summer time and London isn't: four hours apart.
    expect(hourRanges(buildStrips([NY, LONDON], "2026-03-16").overlap)).toEqual([[9, 13]]);
    // After March 29 it's five again.
    expect(hourRanges(buildStrips([NY, LONDON], "2026-03-30").overlap)).toEqual([[9, 12]]);
  });

  it("finds no overlap when the places are too far apart", () => {
    const strips = buildStrips([NY, TOKYO], "2026-01-15");
    expect(strips.overlap.some(Boolean)).toBe(false);
    expect(hourRanges(strips.overlap)).toEqual([]);
  });

  it("counts a half-hour zone only for the hours that are wholly inside", () => {
    // London 9:00 is 14:30 in India in winter; India's day ends at 17:00, so only 9:00 to 11:00 in London fit.
    expect(hourRanges(buildStrips([LONDON, INDIA], "2026-01-15").overlap)).toEqual([[9, 11]]);
  });

  it("handles the day the first place changes its clocks", () => {
    const strips = buildStrips([NY, LONDON], "2026-03-08");
    expect(strips.starts.length).toBe(24);
    // Noon in New York is 16:00 in London that day.
    expect(strips.rows[1]![12]!.minutes).toBe(16 * 60);
    // The instants never run backward.
    for (let hour = 1; hour < 24; hour += 1) expect(strips.starts[hour]!).toBeGreaterThanOrEqual(strips.starts[hour - 1]!);
  });

  it("groups hours into runs", () => {
    const flags = Array.from({ length: 24 }, (_, hour) => hour === 9 || hour === 10 || hour === 15);
    expect(hourRanges(flags)).toEqual([
      [9, 11],
      [15, 16],
    ]);
    expect(hourRanges([])).toEqual([]);
  });
});

describe("wording", () => {
  it("says when everyone is in working hours", () => {
    const flags = Array.from({ length: 24 }, (_, hour) => hour >= 9 && hour < 11);
    expect(overlapSentence(flags, "24h", "your time")).toBe("Everyone is in working hours from 9:00 to 11:00 your time.");
    expect(overlapSentence(flags, "12h", "London time")).toBe("Everyone is in working hours from 9:00 am to 11:00 am London time.");
  });

  it("lists more than one stretch, and says so when there is none", () => {
    const split = Array.from({ length: 24 }, (_, hour) => hour === 9 || hour === 16);
    expect(overlapSentence(split, "24h", "your time")).toBe("Everyone is in working hours from 9:00 to 10:00 and from 16:00 to 17:00 your time.");
    expect(overlapSentence(Array.from({ length: 24 }, () => false), "24h", "your time")).toBe("No hour has everyone in working hours.");
  });

  it("formats times on either clock", () => {
    expect(formatClock(0, "24h")).toBe("0:00");
    expect(formatClock(14 * 60 + 30, "24h")).toBe("14:30");
    expect(formatClock(0, "12h")).toBe("12:00 am");
    expect(formatClock(12 * 60, "12h")).toBe("12:00 pm");
    expect(formatClock(14 * 60 + 30, "12h")).toBe("2:30 pm");
    expect(formatClock(24 * 60, "24h")).toBe("0:00");
    expect(formatCell(9 * 60, "24h")).toBe("9");
    expect(formatCell(14 * 60 + 30, "24h")).toBe("14:30");
    expect(formatCell(0, "12h")).toBe("12a");
    expect(formatCell(14 * 60 + 30, "12h")).toBe("2:30p");
  });

  it("names a day", () => {
    expect(formatDay("2026-11-11")).toBe("Wed, Nov 11");
    expect(formatDay("2027-01-01")).toBe("Fri, Jan 1");
    expect(formatDay("")).toBe("");
  });
});

describe("what the fields hold", () => {
  it("reads and writes a time field", () => {
    expect(clockToMinutes("09:00")).toBe(540);
    expect(clockToMinutes("23:59")).toBe(1439);
    expect(clockToMinutes("")).toBeNull();
    expect(clockToMinutes("24:00")).toBeNull();
    expect(clockToMinutes("9 am")).toBeNull();
    expect(minutesToClock(540)).toBe("09:00");
    expect(minutesToClock(14 * 60 + 30)).toBe("14:30");
    expect(minutesToClock(1440)).toBe("00:00");
  });

  it("accepts only real dates in a sensible range", () => {
    expect(isPlannerDate("2026-11-11")).toBe(true);
    expect(isPlannerDate("2028-02-29")).toBe(true);
    expect(isPlannerDate("2026-02-29")).toBe(false);
    expect(isPlannerDate("0002-11-11")).toBe(false);
    expect(isPlannerDate("3000-01-01")).toBe(false);
    expect(isPlannerDate("")).toBe(false);
  });

  it("moves a date by whole days, across months and years", () => {
    expect(shiftDay("2026-11-11", 1)).toBe("2026-11-12");
    expect(shiftDay("2026-11-11", 0)).toBe("2026-11-11");
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("suggests a place that isn't chosen yet", () => {
    expect(suggestZone([NY, LONDON])).toBe(TOKYO);
    expect(suggestZone([TOKYO, SYDNEY])).toBe(LONDON);
    expect(suggestZone(["Europe/London", NY, TOKYO, "America/Los_Angeles", INDIA, SYDNEY, "Europe/Berlin"])).toBe("UTC");
  });
});

describe("stored places", () => {
  it("accepts two to five zone names", () => {
    expect(parseZones([NY, LONDON])).toEqual([NY, LONDON]);
    expect(parseZones([NY, LONDON, TOKYO, INDIA, SYDNEY])).toEqual([NY, LONDON, TOKYO, INDIA, SYDNEY]);
    expect(parsePlanner(JSON.parse(JSON.stringify(DEFAULT_PLANNER)))).toEqual(DEFAULT_PLANNER);
    expect(parsePlanner({ zones: [NY, "Etc/GMT+5"], format: "12h" })).toEqual({ zones: [NY, "Etc/GMT+5"], format: "12h" });
  });

  it("rejects anything else", () => {
    expect(parseZones([NY])).toBeNull();
    expect(parseZones([NY, LONDON, TOKYO, INDIA, SYDNEY, "UTC"])).toBeNull();
    expect(parseZones([NY, 5])).toBeNull();
    expect(parseZones([NY, "<script>"])).toBeNull();
    expect(parseZones("America/New_York")).toBeNull();
    expect(parsePlanner(null)).toBeNull();
    expect(parsePlanner({ zones: [NY], format: "24h" })).toBeNull();
    expect(parsePlanner({ zones: null, format: "military" })).toBeNull();
  });
});

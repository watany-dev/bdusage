import { describe, expect, it } from "vitest";
import { monthStart, parseSince, parseUntil } from "./dates.js";

describe("parseSince", () => {
  it("parses Nd durations", () => {
    const since = parseSince("7d", 30);
    expect(since).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("parses absolute dates", () => {
    expect(parseSince("2026-05-01", 30)).toBe("2026-05-01");
  });

  it("uses fallback days", () => {
    expect(parseSince(undefined, 7)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("rejects invalid values", () => {
    expect(() => parseSince("bad", 30)).toThrow("Invalid --since");
  });
});

describe("parseUntil", () => {
  it("defaults to tomorrow for exclusive end", () => {
    const until = parseUntil(undefined);
    expect(until).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("parses inclusive until date", () => {
    expect(parseUntil("2026-05-31")).toBe("2026-06-01");
  });

  it("rejects invalid until", () => {
    expect(() => parseUntil("nope")).toThrow("Invalid --until");
  });
});

describe("monthStart", () => {
  it("returns first day of month", () => {
    expect(monthStart("2026-06-15")).toBe("2026-06-01");
  });
});

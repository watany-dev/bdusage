import { describe, expect, it } from "vitest";
import { createProgram, normalizeSource } from "./program.js";

describe("createProgram", () => {
  it("registers v0.1 commands", () => {
    const program = createProgram();
    const names = program.commands.map((c) => c.name());
    expect(names).toContain("daily");
    expect(names).toContain("doctor");
    expect(names).toContain("summary");
    expect(names).toContain("today");
    expect(names).toContain("weekly");
    expect(names).toContain("users");
  });
});

describe("normalizeSource", () => {
  it("accepts cur, ce, logs, and auto", () => {
    expect(normalizeSource("cur")).toBe("cur");
    expect(normalizeSource("ce")).toBe("ce");
    expect(normalizeSource("logs")).toBe("logs");
    expect(normalizeSource("auto")).toBe("auto");
  });

  it("rejects later-phase sources", () => {
    expect(() => normalizeSource("metrics")).toThrow("not available yet");
  });

  it("rejects unknown sources", () => {
    expect(() => normalizeSource("nope")).toThrow("Unknown --source");
  });
});

import { describe, expect, it } from "vitest";
import { COMMAND_NAMES, isCommandName, PLANNED_COMMANDS } from "./commands.js";

describe("commands", () => {
  it("lists planned v0.1 commands", () => {
    expect(COMMAND_NAMES).toContain("daily");
    expect(COMMAND_NAMES).toContain("doctor");
  });

  it("validates command names", () => {
    expect(isCommandName("daily")).toBe(true);
    expect(isCommandName("unknown")).toBe(false);
  });

  it("tracks planned commands separately from CLI registry", () => {
    expect(PLANNED_COMMANDS).toContain("users");
    expect(COMMAND_NAMES).toEqual(expect.arrayContaining([...PLANNED_COMMANDS]));
  });
});

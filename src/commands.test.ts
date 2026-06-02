import { describe, expect, it } from "vitest";
import { createProgram } from "./cli/program.js";
import {
  CLI_REGISTERED_COMMANDS,
  COMMAND_NAMES,
  isCommandName,
  PLANNED_COMMANDS,
} from "./commands.js";

describe("commands", () => {
  it("matches registered CLI command names", () => {
    const registered = createProgram()
      .commands.map((c) => c.name())
      .filter((name) => name.length > 0);
    expect(registered.sort()).toEqual([...CLI_REGISTERED_COMMANDS].sort());
  });

  it("validates command names", () => {
    expect(isCommandName("weekly")).toBe(true);
    expect(isCommandName("users")).toBe(true);
    expect(isCommandName("unknown")).toBe(false);
  });

  it("tracks planned commands separately from CLI registry", () => {
    expect(PLANNED_COMMANDS).toContain("cache");
    expect(COMMAND_NAMES).toEqual(expect.arrayContaining([...PLANNED_COMMANDS]));
  });
});

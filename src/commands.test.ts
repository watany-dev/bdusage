import { describe, expect, it } from "vitest";
import { createProgram } from "./cli/program.js";
import { COMMAND_NAMES, isCommandName } from "./commands.js";

describe("commands", () => {
  it("matches registered CLI command names", () => {
    const registered = createProgram()
      .commands.map((c) => c.name())
      .filter((name) => name.length > 0);
    expect(registered.sort()).toEqual([...COMMAND_NAMES].sort());
  });

  it("validates command names", () => {
    expect(isCommandName("weekly")).toBe(true);
    expect(isCommandName("users")).toBe(true);
    expect(isCommandName("unknown")).toBe(false);
  });
});

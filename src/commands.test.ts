import { describe, expect, it } from "vitest";
import { COMMAND_NAMES, isCommandName } from "./commands.js";

describe("commands", () => {
  it("lists planned v0.1 commands", () => {
    expect(COMMAND_NAMES).toContain("daily");
    expect(COMMAND_NAMES).toContain("doctor");
  });

  it("validates command names", () => {
    expect(isCommandName("daily")).toBe(true);
    expect(isCommandName("unknown")).toBe(false);
  });
});

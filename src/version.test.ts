import { describe, expect, it } from "vitest";
import { TOOL_NAME, VERSION } from "./version.js";

describe("version", () => {
  it("exports tool metadata", () => {
    expect(TOOL_NAME).toBe("bdusage");
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

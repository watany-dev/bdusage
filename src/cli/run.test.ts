import { afterEach, describe, expect, it, vi } from "vitest";
import * as programModule from "./program.js";
import { formatHelpText, formatVersionLine, runCli } from "./run.js";

describe("runCli", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints version line", () => {
    expect(formatVersionLine()).toBe("bdusage v0.1.0");
  });

  it("includes commands in help", () => {
    expect(formatHelpText()).toContain("daily");
    expect(formatHelpText()).toContain("doctor");
    expect(formatHelpText()).toContain("--all (admin-oriented)");
  });

  it("exits 0 for --version", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(runCli(["node", "bdusage", "--version"])).toBe(0);
    expect(log).toHaveBeenCalledWith("bdusage v0.1.0");
  });

  it("exits 0 for --help", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(runCli(["node", "bdusage", "--help"])).toBe(0);
    expect(log.mock.calls[0]?.[0]).toContain("Usage:");
  });

  it("exits 0 for -h and -V short flags", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(runCli(["node", "bdusage", "-h"])).toBe(0);
    expect(runCli(["node", "bdusage", "-V"])).toBe(0);
    expect(log).toHaveBeenCalled();
  });

  it("delegates to program for commands", () => {
    const parse = vi.fn();
    vi.spyOn(programModule, "createProgram").mockReturnValue({ parse } as never);
    runCli(["node", "bdusage", "daily"]);
    expect(parse).toHaveBeenCalled();
  });

  it("handles parse errors", () => {
    vi.spyOn(programModule, "createProgram").mockImplementation(() => {
      throw new Error("parse failed");
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(runCli(["node", "bdusage", "daily"])).toBe(1);
    expect(error).toHaveBeenCalledWith("parse failed");
  });
});

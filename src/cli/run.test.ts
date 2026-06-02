import { afterEach, describe, expect, it, vi } from "vitest";
import { formatHelpText, formatVersionLine, runCli } from "./run.js";

describe("runCli", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints version line", () => {
    expect(formatVersionLine()).toBe("bdusage v0.0.0");
  });

  it("includes commands in help", () => {
    expect(formatHelpText()).toContain("daily");
    expect(formatHelpText()).toContain("doctor");
  });

  it("exits 0 for --version", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(runCli(["node", "bdusage", "--version"])).toBe(0);
    expect(log).toHaveBeenCalledWith("bdusage v0.0.0");
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

  it("exits 0 with no args (summary default help)", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(runCli(["node", "bdusage"])).toBe(0);
    expect(log).toHaveBeenCalled();
  });

  it("exits 1 for empty command name", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(runCli(["node", "bdusage", ""])).toBe(1);
    expect(error.mock.calls[0]?.[0]).toContain('Command ""');
  });

  it("exits 1 for unimplemented commands", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(runCli(["node", "bdusage", "daily"])).toBe(1);
    expect(error.mock.calls[0]?.[0]).toContain("not implemented");
  });
});

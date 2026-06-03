import { afterEach, describe, expect, it, vi } from "vitest";
import * as programModule from "./program.js";
import { formatHelpText, formatVersionLine, runCli } from "./run.js";

describe("runCli", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = undefined;
  });

  it("prints version line", () => {
    expect(formatVersionLine()).toBe("bdusage v0.1.0-beta.0");
  });

  it("includes commands in help", () => {
    expect(formatHelpText()).toContain("daily");
    expect(formatHelpText()).toContain("doctor");
    expect(formatHelpText()).toContain("--all (admin-oriented)");
  });

  it("exits 0 for --version", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(runCli(["node", "bdusage", "--version"])).resolves.toBe(0);
    expect(log).toHaveBeenCalledWith("bdusage v0.1.0-beta.0");
  });

  it("exits 0 for --help", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(runCli(["node", "bdusage", "--help"])).resolves.toBe(0);
    expect(log.mock.calls[0]?.[0]).toContain("Usage:");
  });

  it("exits 0 for -h and -V short flags", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(runCli(["node", "bdusage", "-h"])).resolves.toBe(0);
    await expect(runCli(["node", "bdusage", "-V"])).resolves.toBe(0);
    expect(log).toHaveBeenCalled();
  });

  it("awaits async command actions via parseAsync", async () => {
    const parseAsync = vi.fn().mockImplementation(async () => {
      process.exitCode = 0;
    });
    vi.spyOn(programModule, "createProgram").mockReturnValue({ parseAsync } as never);
    await expect(runCli(["node", "bdusage", "daily"])).resolves.toBe(0);
    expect(parseAsync).toHaveBeenCalledWith(["node", "bdusage", "daily"]);
  });

  it("returns non-zero exit code from async command", async () => {
    const parseAsync = vi.fn().mockImplementation(async () => {
      process.exitCode = 2;
    });
    vi.spyOn(programModule, "createProgram").mockReturnValue({ parseAsync } as never);
    await expect(runCli(["node", "bdusage", "daily"])).resolves.toBe(2);
  });

  it("handles parse errors", async () => {
    vi.spyOn(programModule, "createProgram").mockImplementation(() => {
      throw new Error("parse failed");
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(runCli(["node", "bdusage", "daily"])).resolves.toBe(1);
    expect(error).toHaveBeenCalledWith("parse failed");
  });
});

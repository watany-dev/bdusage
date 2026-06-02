import { Command } from "commander";
import { describe, expect, it, vi } from "vitest";
import { runWithHandler } from "./program.js";

vi.mock("./context.js", () => ({
  buildCommandContext: vi.fn().mockResolvedValue({
    version: "bdusage v0.1.0",
    outputFormat: "table",
  }),
  mapCliError: vi.fn().mockReturnValue({ message: "fail", exitCode: 1 }),
  normalizeCurEngine: (value: string) => value,
}));

describe("runWithHandler", () => {
  it("writes output and returns 0", async () => {
    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const cmd = new Command();
    cmd.opts = () => ({ source: "cur" });
    const code = await runWithHandler(cmd, async () => "hello");
    expect(code).toBe(0);
    expect(write).toHaveBeenCalledWith("hello\n");
    write.mockRestore();
  });

  it("appends newline when missing", async () => {
    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const cmd = new Command();
    cmd.opts = () => ({ source: "cur" });
    await runWithHandler(cmd, async () => "no-newline");
    expect(write).toHaveBeenCalledWith("no-newline\n");
    write.mockRestore();
  });

  it("returns 1 on failure", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const cmd = new Command();
    cmd.opts = () => ({ source: "cur" });
    const code = await runWithHandler(cmd, async () => {
      throw new Error("Athena query failed: syntax");
    });
    expect(code).toBe(1);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

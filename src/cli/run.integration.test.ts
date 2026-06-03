import { afterEach, describe, expect, it, vi } from "vitest";
import { runCli } from "./run.js";

vi.mock("./context.js", () => ({
  buildCommandContext: vi.fn().mockResolvedValue({
    version: "bdusage v0.1.0-beta.0",
    outputFormat: "table",
    disposeBillingSource: vi.fn(),
  }),
  mapCliError: vi.fn().mockReturnValue({ message: "fail", exitCode: 1 }),
  normalizeCurEngine: (value: string) => value,
}));

vi.mock("../commands/whoami.js", () => ({
  runWhoami: vi.fn().mockResolvedValue("profile: default\n"),
}));

describe("runCli integration", () => {
  afterEach(() => {
    process.exitCode = undefined;
  });

  it("writes command output before returning", async () => {
    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    await expect(runCli(["node", "bdusage", "whoami"])).resolves.toBe(0);
    expect(write).toHaveBeenCalledWith("profile: default\n");
    write.mockRestore();
  });
});

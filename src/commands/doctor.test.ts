import { describe, expect, it, vi } from "vitest";
import type { CommandContext } from "../cli/context.js";
import { DEFAULT_CONFIG } from "../config/schema.js";
import { runDoctor } from "./doctor.js";

vi.mock("../doctor/checks.js", () => ({
  runDoctorChecks: vi.fn(),
  overallStatus: vi.fn().mockReturnValue("fail"),
}));

describe("runDoctor", () => {
  it("renders table output with fix hints", async () => {
    const { runDoctorChecks } = await import("../doctor/checks.js");
    vi.mocked(runDoctorChecks).mockResolvedValueOnce([
      {
        name: "cur_iam_principal_column",
        status: "fail",
        message: "missing",
        fix: "Enable IAM principal data",
      },
    ]);
    const ctx = {
      version: "bdusage v0.1.0",
      configPath: "/tmp/c.toml",
      config: {
        ...DEFAULT_CONFIG,
        athena: { ...DEFAULT_CONFIG.athena, output_location: "s3://x/" },
        aws: { profile: "p", region: "r" },
      },
      outputFormat: "table",
    } as CommandContext;
    const out = await runDoctor(ctx);
    expect(out).toContain("Fix:");
    expect(out).toContain("Enable IAM principal");
  });

  it("renders json doctor output", async () => {
    const { runDoctorChecks } = await import("../doctor/checks.js");
    vi.mocked(runDoctorChecks).mockResolvedValueOnce([
      { name: "aws_credentials", status: "ok", message: "ok" },
    ]);
    const ctx = {
      version: "bdusage v0.1.0",
      configPath: "/tmp/c.toml",
      config: {
        ...DEFAULT_CONFIG,
        athena: { ...DEFAULT_CONFIG.athena, output_location: "s3://x/" },
        aws: { profile: "p", region: "r" },
      },
      outputFormat: "json",
    } as CommandContext;
    const out = await runDoctor(ctx);
    expect(JSON.parse(out)).toHaveProperty("checks");
  });

  it("renders table doctor output", async () => {
    const { runDoctorChecks } = await import("../doctor/checks.js");
    vi.mocked(runDoctorChecks).mockResolvedValueOnce([
      { name: "aws_credentials", status: "ok", message: "ok" },
    ]);
    const ctx = {
      version: "bdusage v0.1.0",
      configPath: "/tmp/c.toml",
      config: {
        ...DEFAULT_CONFIG,
        athena: { ...DEFAULT_CONFIG.athena, output_location: "s3://x/" },
        aws: { profile: "p", region: "r" },
      },
      outputFormat: "table",
    } as CommandContext;
    const out = await runDoctor(ctx);
    expect(out).toContain("Doctor checks");
    expect(out).toContain("aws_credentials");
  });
});

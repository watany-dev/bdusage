import { createAthenaClient, LiveAthenaExecutor } from "../aws/athena.js";
import type { CommandContext } from "../cli/context.js";
import { overallStatus, runDoctorChecks } from "../doctor/checks.js";

export async function runDoctor(ctx: CommandContext): Promise<string> {
  const executor =
    ctx.config.cur.athena.output_location.length > 0
      ? new LiveAthenaExecutor(
          createAthenaClient(ctx.config.aws.region ?? "us-east-1", ctx.config.aws.profile),
        )
      : null;

  const checks = await runDoctorChecks(ctx.config, ctx.configPath, executor);
  const overall = overallStatus(checks);

  if (ctx.outputFormat === "json") {
    return `${JSON.stringify({ checks, overall }, null, 2)}\n`;
  }

  const lines = [ctx.version, "", "Doctor checks:", ""];
  for (const check of checks) {
    const icon = check.status === "ok" ? "✓" : check.status === "warn" ? "!" : "✗";
    lines.push(`${icon} ${check.name}: ${check.message ?? check.status}`);
    if (check.fix) {
      lines.push("", "Fix:", check.fix, "");
    }
  }
  lines.push(`overall: ${overall}`, "");
  return lines.join("\n");
}

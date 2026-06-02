import { Command } from "commander";
import { runDaily } from "../commands/daily.js";
import { runDoctor } from "../commands/doctor.js";
import { runModels } from "../commands/models.js";
import { runMonthly } from "../commands/monthly.js";
import { runSummary } from "../commands/summary.js";
import { runToday } from "../commands/today.js";
import { runWhoami } from "../commands/whoami.js";
import { TOOL_NAME, VERSION } from "../version.js";
import {
  buildCommandContext,
  type GlobalOptions,
  mapCliError,
  normalizeCurEngine,
} from "./context.js";

type CommandRunner = (ctx: Awaited<ReturnType<typeof buildCommandContext>>) => Promise<string>;

function attachGlobalOptions(cmd: Command): Command {
  return cmd
    .option("--profile <name>", "AWS profile for API calls")
    .option("--region <region>", "AWS region for API calls")
    .option("--source <name>", "Data source (cur|ce|logs|auto)", "auto")
    .option(
      "--cur-engine <name>",
      "CUR backend (auto|duckdb|athena); default reads config cur.engine",
      "auto",
    )
    .option("--principal <arn>", "Filter by IAM principal ARN")
    .option("--principal-role <roleArn>", "Aggregate assumed-role sessions by role ARN")
    .option("--principal-tag <key=value>", "Filter by cost allocation tag (--source ce)")
    .option(
      "--principal-from-profile <name>",
      "Resolve principal from another profile (GetCallerIdentity only)",
    )
    .option("--all", "Show all principals (admin-oriented; requires CUR read access)")
    .option("--since <value>", "Start date (YYYY-MM-DD or Nd)")
    .option("--until <value>", "End date inclusive (YYYY-MM-DD)")
    .option("--json", "JSON output")
    .option("--csv", "CSV output")
    .option("--config <path>", "Config file path");
}

function readGlobalOptions(cmd: Command): GlobalOptions {
  const opts = cmd.opts<{
    profile?: string;
    region?: string;
    source?: string;
    curEngine?: string;
    principal?: string;
    principalRole?: string;
    principalTag?: string;
    principalFromProfile?: string;
    all?: boolean;
    since?: string;
    until?: string;
    json?: boolean;
    csv?: boolean;
    config?: string;
  }>();

  const base: GlobalOptions = {
    source: normalizeSource(opts.source ?? "auto"),
    curEngine: normalizeCurEngine(opts.curEngine ?? "auto"),
    allPrincipals: Boolean(opts.all),
    json: Boolean(opts.json),
    csv: Boolean(opts.csv),
  };

  if (opts.profile) base.profile = opts.profile;
  if (opts.region) base.region = opts.region;
  if (opts.principal) base.principalArn = opts.principal;
  if (opts.principalRole) base.principalRole = opts.principalRole;
  if (opts.principalTag) base.principalTag = opts.principalTag;
  if (opts.principalFromProfile) base.principalFromProfile = opts.principalFromProfile;
  if (opts.since) base.since = opts.since;
  if (opts.until) base.until = opts.until;
  if (opts.config) base.configPath = opts.config;

  return base;
}

export function normalizeSource(value: string): GlobalOptions["source"] {
  if (value === "auto" || value === "cur" || value === "ce" || value === "logs") {
    return value;
  }
  if (value === "metrics") {
    throw new Error(
      `Source "${value}" is not available yet. Use --source cur|ce|logs|auto or see docs/ROADMAP.md.`,
    );
  }
  throw new Error(`Unknown --source: ${value}`);
}

export async function runWithHandler(command: Command, runner: CommandRunner): Promise<number> {
  try {
    const options = readGlobalOptions(command);
    const ctx = await buildCommandContext(options);
    const output = await runner(ctx);
    process.stdout.write(output.endsWith("\n") ? output : `${output}\n`);
    return 0;
  } catch (error) {
    const mapped = mapCliError(error);
    console.error(mapped.message);
    if (mapped.message.includes("Athena") || mapped.message.includes("Config")) {
      console.error("Run `npx bdusage doctor` for setup diagnostics.");
    }
    return mapped.exitCode;
  }
}

export function createProgram(): Command {
  const program = new Command();
  program
    .name(TOOL_NAME)
    .description("Amazon Bedrock usage and cost CLI")
    .version(VERSION, "-V, --version", "Show version")
    .showHelpAfterError();

  const runCmd = (name: string, description: string, runner: CommandRunner) => {
    attachGlobalOptions(
      program
        .command(name)
        .description(description)
        .action(async function (this: Command) {
          process.exit(await runWithHandler(this, runner));
        }),
    );
  };

  runCmd("summary", "Monthly summary (default)", runSummary);
  runCmd("daily", "Daily usage and cost from CUR", runDaily);
  runCmd("monthly", "Monthly usage and cost from CUR", runMonthly);
  runCmd("models", "Per-model usage and cost from CUR", runModels);
  runCmd("whoami", "Show AWS identity and config", runWhoami);
  runCmd("today", "Today's Bedrock usage estimate (requires --source logs)", runToday);
  runCmd("doctor", "Validate CUR / Athena / Logs setup", runDoctor);

  attachGlobalOptions(
    program.action(async function (this: Command) {
      process.exit(await runWithHandler(this, runSummary));
    }),
  );

  return program;
}

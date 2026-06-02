import { TOOL_NAME, VERSION } from "../version.js";
import { createProgram } from "./program.js";

export function formatVersionLine(): string {
  return `${TOOL_NAME} v${VERSION}`;
}

export function formatHelpText(): string {
  return [
    formatVersionLine(),
    "",
    "Amazon Bedrock usage and cost CLI",
    "",
    "Usage:",
    `  npx ${TOOL_NAME} [command] [options]`,
    "",
    "Commands: summary, daily, monthly, models, today, whoami, doctor",
    "",
    "  (no command)  Same as summary",
    "",
    "Global options include --profile, --region, --source, --principal,",
    "  --principal-role, --all (admin-oriented), --json, --csv, --config.",
    "",
    "Run `npx bdusage doctor` to validate CUR 2.0 / Athena setup.",
  ].join("\n");
}

export function runCli(argv: readonly string[]): number {
  const args = argv.slice(2);

  if (args.includes("--version") || args.includes("-V")) {
    console.log(formatVersionLine());
    return 0;
  }

  if (args.includes("--help") || args.includes("-h")) {
    console.log(formatHelpText());
    return 0;
  }

  if (args.length === 0) {
    const program = createProgram();
    program.parse([argv[0] ?? "node", TOOL_NAME]);
    return 0;
  }

  try {
    const program = createProgram();
    program.parse(argv);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    return 1;
  }
}

import { COMMAND_NAMES } from "../commands.js";
import { TOOL_NAME, VERSION } from "../version.js";

export function formatVersionLine(): string {
  return `${TOOL_NAME} v${VERSION}`;
}

export function formatHelpText(): string {
  const commands = COMMAND_NAMES.join(", ");
  return [
    formatVersionLine(),
    "",
    "Amazon Bedrock usage and cost CLI (v0.1 in development)",
    "",
    "Usage:",
    `  npx ${TOOL_NAME} [command] [options]`,
    "",
    "Commands:",
    `  ${commands}`,
    "",
    "Run `npx bdusage doctor` to validate CUR 2.0 / Athena setup.",
    "See https://github.com/watany-dev/bdusage for documentation.",
  ].join("\n");
}

export function runCli(argv: readonly string[]): number {
  const args = argv.slice(2);

  if (args.includes("--version") || args.includes("-V")) {
    console.log(formatVersionLine());
    return 0;
  }

  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    console.log(formatHelpText());
    return 0;
  }

  const [command] = args;
  console.error(
    `${formatVersionLine()}\n` +
      `Command "${command}" is not implemented yet. See docs/ROADMAP.md (v0.1 MVP).`,
  );
  return 1;
}

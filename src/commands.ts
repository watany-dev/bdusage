/** Commands registered in the CLI (Commander). */
export const CLI_REGISTERED_COMMANDS = [
  "summary",
  "daily",
  "monthly",
  "models",
  "today",
  "whoami",
  "doctor",
] as const;

/** Planned commands not yet wired in the CLI. */
export const PLANNED_COMMANDS = ["users", "cache"] as const;

export const COMMAND_NAMES = [...CLI_REGISTERED_COMMANDS, ...PLANNED_COMMANDS] as const;

export type CommandName = (typeof COMMAND_NAMES)[number];

export function isCommandName(value: string): value is CommandName {
  return (COMMAND_NAMES as readonly string[]).includes(value);
}

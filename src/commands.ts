export const COMMAND_NAMES = [
  "summary",
  "daily",
  "weekly",
  "monthly",
  "models",
  "users",
  "today",
  "whoami",
  "doctor",
] as const;

export type CommandName = (typeof COMMAND_NAMES)[number];

export function isCommandName(value: string): value is CommandName {
  return (COMMAND_NAMES as readonly string[]).includes(value);
}

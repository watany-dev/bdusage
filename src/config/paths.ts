import { homedir } from "node:os";
import { join } from "node:path";

export function defaultConfigPath(): string {
  const xdg = process.env["XDG_CONFIG_HOME"];
  const base = xdg ?? join(homedir(), ".config");
  return join(base, "bdusage", "config.toml");
}

import { readFile } from "node:fs/promises";
import { parse } from "smol-toml";
import type { BdusageConfig } from "./schema.js";
import { DEFAULT_CONFIG } from "./schema.js";

export class ConfigError extends Error {
  readonly code = "CONFIG_ERROR" as const;
}

export async function loadConfigFile(path: string): Promise<BdusageConfig> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    throw new ConfigError(
      `Config not found at ${path}. Run bdusage doctor or create the file (see docs/SPEC.md §17).`,
    );
  }

  const parsed = parse(raw) as Partial<BdusageConfig>;
  return mergeConfig(DEFAULT_CONFIG, parsed);
}

export function mergeConfig(base: BdusageConfig, override: Partial<BdusageConfig>): BdusageConfig {
  return {
    aws: { ...base.aws, ...override.aws },
    athena: { ...base.athena, ...override.athena },
    cost: { ...base.cost, ...override.cost },
    output: { ...base.output, ...override.output },
  };
}

export function costColumn(metric: BdusageConfig["cost"]["metric"]): string {
  return metric === "net_unblended" ? "line_item_net_unblended_cost" : "line_item_unblended_cost";
}

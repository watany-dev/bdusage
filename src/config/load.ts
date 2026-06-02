import { readFile } from "node:fs/promises";
import { parse } from "smol-toml";
import type { BdusageConfig, CurAthenaConfig, CurDuckDbConfig } from "./schema.js";
import { DEFAULT_CONFIG } from "./schema.js";

export class ConfigError extends Error {
  readonly code = "CONFIG_ERROR" as const;
}

type RawToml = Record<string, unknown>;

export async function loadConfigFile(path: string): Promise<BdusageConfig> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    throw new ConfigError(
      `Config not found at ${path}. Run bdusage doctor or create the file (see docs/SPEC.md §17).`,
    );
  }

  const parsed = parse(raw) as RawToml;
  return mergeConfig(DEFAULT_CONFIG, normalizeToml(parsed));
}

function normalizeToml(parsed: RawToml): Partial<BdusageConfig> {
  const curSection = (parsed["cur"] as RawToml | undefined) ?? {};
  const legacyAthena = parsed["athena"] as CurAthenaConfig | undefined;
  const curAthena = (curSection["athena"] as CurAthenaConfig | undefined) ?? legacyAthena;

  const duckdbRaw = (curSection["duckdb"] as RawToml | undefined) ?? {};
  const duckdb: Partial<CurDuckDbConfig> = { files: normalizeFiles(duckdbRaw["files"]) };
  if (typeof duckdbRaw["s3_region"] === "string") {
    duckdb.s3_region = duckdbRaw["s3_region"];
  }
  if (typeof duckdbRaw["hive_partitioning"] === "boolean") {
    duckdb.hive_partitioning = duckdbRaw["hive_partitioning"];
  }
  if (typeof duckdbRaw["union_by_name"] === "boolean") {
    duckdb.union_by_name = duckdbRaw["union_by_name"];
  }

  const engine = (curSection["engine"] as BdusageConfig["cur"]["engine"] | undefined) ?? "auto";

  const partial: Partial<BdusageConfig> = {
    cur: {
      engine,
      duckdb: duckdb as CurDuckDbConfig,
      athena: curAthena ?? DEFAULT_CONFIG.cur.athena,
    },
  };

  if (parsed["aws"]) {
    partial.aws = parsed["aws"] as BdusageConfig["aws"];
  }
  if (parsed["logs"]) {
    partial.logs = parsed["logs"] as BdusageConfig["logs"];
  }
  if (parsed["cost"]) {
    partial.cost = parsed["cost"] as BdusageConfig["cost"];
  }
  if (parsed["output"]) {
    partial.output = parsed["output"] as BdusageConfig["output"];
  }
  if (legacyAthena && !curSection["athena"]) {
    partial.athena = legacyAthena;
  }

  return partial;
}

function normalizeFiles(files: unknown): string[] {
  if (files == null) {
    return [];
  }
  if (typeof files === "string") {
    return files.length > 0 ? [files] : [];
  }
  if (Array.isArray(files)) {
    return files.filter((f): f is string => typeof f === "string" && f.length > 0);
  }
  return [];
}

export function mergeConfig(base: BdusageConfig, override: Partial<BdusageConfig>): BdusageConfig {
  const cur = {
    ...base.cur,
    ...override.cur,
    duckdb: { ...base.cur.duckdb, ...override.cur?.duckdb },
    athena: { ...base.cur.athena, ...override.cur?.athena, ...override.athena },
  };

  const athena = { ...cur.athena };

  return {
    aws: { ...base.aws, ...override.aws },
    cur,
    athena,
    logs: { ...base.logs, ...override.logs },
    cost: { ...base.cost, ...override.cost },
    output: { ...base.output, ...override.output },
  };
}

export function costColumn(metric: BdusageConfig["cost"]["metric"]): string {
  return metric === "net_unblended" ? "line_item_net_unblended_cost" : "line_item_unblended_cost";
}

export function hasDuckDbFiles(config: BdusageConfig): boolean {
  return config.cur.duckdb.files.length > 0;
}

export function duckDbS3Region(config: BdusageConfig): string {
  return config.cur.duckdb.s3_region ?? config.aws.region ?? "us-east-1";
}

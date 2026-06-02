import type { AthenaExecutor } from "../aws/athena.js";
import { hasDuckDbFiles } from "../config/load.js";
import type { BdusageConfig } from "../config/schema.js";
import type { CurEngineName } from "../types/engine.js";
import type { CurBillingSource } from "./billing-source.js";
import { sampleBedrockQuery } from "./cur-athena/queries.js";
import { CurAthenaSource } from "./cur-athena/source.js";
import { createDuckDbExecutor } from "./cur-duckdb/duckdb.js";
import { sampleBedrockQuery as duckdbSampleQuery } from "./cur-duckdb/queries.js";
import { CurDuckDbSource } from "./cur-duckdb/source.js";

class CurEngineUnavailableError extends Error {
  override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "CurEngineUnavailableError";
    this.cause = cause;
  }
}

interface ResolveCurOptions {
  engine: CurEngineName;
}

export async function resolveCurBillingSource(
  options: ResolveCurOptions,
  config: BdusageConfig,
  factory: { createAthena: () => CurAthenaSource },
  athenaExecutor: AthenaExecutor | null,
): Promise<CurBillingSource> {
  const engine = options.engine === "auto" ? config.cur.engine : options.engine;
  const effective = engine === "auto" ? "auto" : engine;

  if (effective === "duckdb") {
    return createDuckDbOnly(config);
  }
  if (effective === "athena") {
    return createAthenaOnly(factory.createAthena, config, athenaExecutor);
  }

  const errors: string[] = [];
  if (hasDuckDbFiles(config)) {
    try {
      return await createDuckDbOnly(config);
    } catch (error) {
      errors.push(formatProbeError("DuckDB", error));
    }
  }

  try {
    return await createAthenaOnly(factory.createAthena, config, athenaExecutor);
  } catch (error) {
    errors.push(formatProbeError("Athena", error));
    throw new CurEngineUnavailableError(
      `Could not use CUR backend (${errors.join("; ")}). Run bdusage doctor.`,
      error,
    );
  }
}

async function createDuckDbOnly(config: BdusageConfig): Promise<CurDuckDbSource> {
  const executor = await createDuckDbExecutor(config);
  try {
    await executor.executeQuery(duckdbSampleQuery());
    return new CurDuckDbSource(executor, config);
  } catch (error) {
    await executor.close();
    throw error;
  }
}

async function createAthenaOnly(
  createAthena: () => CurAthenaSource,
  config: BdusageConfig,
  athenaExecutor: AthenaExecutor | null,
): Promise<CurAthenaSource> {
  await probeAthena(config, athenaExecutor);
  return createAthena();
}

async function probeAthena(config: BdusageConfig, executor: AthenaExecutor | null): Promise<void> {
  if (!executor) {
    throw new CurEngineUnavailableError("Athena executor not available");
  }
  const { database, workgroup, output_location } = config.cur.athena;
  if (!output_location) {
    throw new CurEngineUnavailableError("cur.athena.output_location is not set");
  }
  try {
    await executor.executeQuery({
      sql: sampleBedrockQuery(config),
      database,
      workgroup,
      outputLocation: output_location,
    });
  } catch (error) {
    throw new CurEngineUnavailableError(
      error instanceof Error ? error.message : String(error),
      error,
    );
  }
}

function formatProbeError(label: string, error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  return `${label}: ${msg}`;
}

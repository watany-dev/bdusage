import type { AthenaExecutor } from "../aws/athena.js";
import { hasDuckDbFiles } from "../config/load.js";
import type { BdusageConfig } from "../config/schema.js";
import type { CurEngineName } from "../types/engine.js";
import type { CurBillingSource } from "./billing-source.js";
import { CurAthenaSource } from "./cur-athena/source.js";
import { createDuckDbExecutor } from "./cur-duckdb/duckdb.js";
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
    return createAthenaOnly(factory.createAthena, athenaExecutor);
  }

  const errors: string[] = [];
  if (hasDuckDbFiles(config)) {
    try {
      return await createDuckDbOnly(config);
    } catch (error) {
      errors.push(formatResolveError("DuckDB", error));
    }
  }

  try {
    return createAthenaOnly(factory.createAthena, athenaExecutor);
  } catch (error) {
    errors.push(formatResolveError("Athena", error));
    throw new CurEngineUnavailableError(
      `Could not use CUR backend (${errors.join("; ")}). Run bdusage doctor.`,
      error,
    );
  }
}

async function createDuckDbOnly(config: BdusageConfig): Promise<CurDuckDbSource> {
  const executor = await createDuckDbExecutor(config);
  return new CurDuckDbSource(executor, config);
}

function createAthenaOnly(
  createAthena: () => CurAthenaSource,
  athenaExecutor: AthenaExecutor | null,
): CurAthenaSource {
  if (!athenaExecutor) {
    throw new CurEngineUnavailableError("Athena executor not available");
  }
  return createAthena();
}

function formatResolveError(label: string, error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  return `${label}: ${msg}`;
}

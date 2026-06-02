import type { AthenaExecutor } from "../aws/athena.js";
import type { BdusageConfig } from "../config/schema.js";
import type { SourceName } from "../types/source.js";
import type { BillingSource } from "./billing-source.js";
import { CeSource } from "./ce/source.js";
import { sampleBedrockQuery } from "./cur/queries.js";
import { CurSource } from "./cur/source.js";

class CurUnavailableError extends Error {
  override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "CurUnavailableError";
    this.cause = cause;
  }
}

export async function resolveBillingSource(
  requested: SourceName,
  createCur: () => CurSource,
  createCe: () => CeSource,
  config: BdusageConfig,
  executor: AthenaExecutor | null,
): Promise<BillingSource> {
  if (requested === "ce") {
    return createCe();
  }
  if (requested === "cur") {
    return createCur();
  }

  try {
    await probeCur(config, executor);
    return createCur();
  } catch (error) {
    const curMsg = error instanceof Error ? error.message : String(error);
    const ce = createCe();
    try {
      await ce.probe();
      return ce;
    } catch (ceError) {
      const ceMsg = ceError instanceof Error ? ceError.message : String(ceError);
      throw new Error(
        `Could not use CUR (${curMsg}) or Cost Explorer (${ceMsg}). Run bdusage doctor.`,
      );
    }
  }
}

async function probeCur(config: BdusageConfig, executor: AthenaExecutor | null): Promise<void> {
  if (!executor) {
    throw new CurUnavailableError("Athena executor not available");
  }
  const { database, workgroup, output_location } = config.athena;
  if (!output_location) {
    throw new CurUnavailableError("athena.output_location is not set");
  }
  try {
    await executor.executeQuery({
      sql: sampleBedrockQuery(config),
      database,
      workgroup,
      outputLocation: output_location,
    });
  } catch (error) {
    throw new CurUnavailableError(error instanceof Error ? error.message : String(error), error);
  }
}

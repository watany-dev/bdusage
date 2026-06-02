import type { AthenaExecutor } from "../aws/athena.js";
import { createAthenaClient, LiveAthenaExecutor } from "../aws/athena.js";
import { createCostExplorerClient, LiveCostExplorerClient } from "../aws/cost-explorer.js";
import type { BdusageConfig } from "../config/schema.js";
import { CeSource } from "../sources/ce/source.js";
import { CurAthenaSource } from "../sources/cur-athena/source.js";

export function createAthenaExecutor(region: string, profile: string): AthenaExecutor {
  const client = createAthenaClient(region, profile);
  return new LiveAthenaExecutor(client);
}

export function createCurAthenaSource(
  executor: AthenaExecutor,
  config: BdusageConfig,
): CurAthenaSource {
  return new CurAthenaSource(executor, config);
}

export function createCeSource(region: string, profile: string, config: BdusageConfig): CeSource {
  return new CeSource(
    new LiveCostExplorerClient(createCostExplorerClient(region, profile)),
    config,
  );
}

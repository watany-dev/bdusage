import type { AthenaExecutor } from "../aws/athena.js";
import { createAthenaClient, LiveAthenaExecutor } from "../aws/athena.js";
import { createCostExplorerClient, LiveCostExplorerClient } from "../aws/cost-explorer.js";
import type { BdusageConfig } from "../config/schema.js";
import { CeSource } from "../sources/ce/source.js";
import { CurSource } from "../sources/cur/source.js";

export function createAthenaExecutor(region: string, profile: string): AthenaExecutor {
  const client = createAthenaClient(region, profile);
  return new LiveAthenaExecutor(client);
}

export function createCurSource(executor: AthenaExecutor, config: BdusageConfig): CurSource {
  return new CurSource(executor, config);
}

export function createCeSource(region: string, profile: string, config: BdusageConfig): CeSource {
  return new CeSource(
    new LiveCostExplorerClient(createCostExplorerClient(region, profile)),
    config,
  );
}

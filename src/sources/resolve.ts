import type { CurEngineName } from "../types/engine.js";
import type { SourceName } from "../types/source.js";
import type { BillingSource, CurBillingSource } from "./billing-source.js";
import { CeSource } from "./ce/source.js";

interface ResolveBillingOptions {
  curEngine: CurEngineName;
}

export async function resolveBillingSource(
  requested: SourceName,
  _options: ResolveBillingOptions,
  resolveCur: () => Promise<CurBillingSource>,
  createCe: () => CeSource,
): Promise<BillingSource> {
  if (requested === "logs") {
    throw new Error(
      "Billing commands require --source cur|ce|auto. Use `bdusage today --source logs` for CloudWatch Logs estimates.",
    );
  }
  if (requested === "ce") {
    return createCe();
  }
  if (requested === "cur") {
    return resolveCur();
  }

  try {
    return await resolveCur();
  } catch (curError) {
    const curMsg = curError instanceof Error ? curError.message : String(curError);
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

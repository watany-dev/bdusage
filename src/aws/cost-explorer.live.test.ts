import { CostExplorerClient } from "@aws-sdk/client-cost-explorer";
import { describe, expect, it, vi } from "vitest";
import { LiveCostExplorerClient } from "./cost-explorer.js";

describe("LiveCostExplorerClient", () => {
  it("delegates to CostExplorerClient", async () => {
    const send = vi.fn().mockResolvedValue({ ResultsByTime: [] });
    const client = new LiveCostExplorerClient({ send } as unknown as CostExplorerClient);
    const rows = await client.getCostAndUsage({
      TimePeriod: { Start: "2026-06-01", End: "2026-06-02" },
      Granularity: "DAILY",
      Metrics: ["UnblendedCost"],
    });
    expect(rows).toEqual([]);
    expect(send).toHaveBeenCalled();
  });
});

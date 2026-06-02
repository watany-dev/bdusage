import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG } from "../config/schema.js";
import { CeSource } from "./ce/source.js";
import { CurAthenaSource } from "./cur-athena/source.js";
import { resolveBillingSource } from "./resolve.js";

describe("resolveBillingSource", () => {
  const config = DEFAULT_CONFIG;

  it("returns cur when requested", async () => {
    const cur = new CurAthenaSource({ executeQuery: vi.fn() }, config);
    const ce = new CeSource({ getCostAndUsage: vi.fn() }, config);
    const result = await resolveBillingSource(
      "cur",
      { curEngine: "athena" },
      async () => cur,
      () => ce,
    );
    expect(result.resolved).toBe("cur");
  });

  it("rejects logs for billing commands", async () => {
    const cur = new CurAthenaSource({ executeQuery: vi.fn() }, config);
    const ce = new CeSource({ getCostAndUsage: vi.fn() }, config);
    await expect(
      resolveBillingSource(
        "logs",
        { curEngine: "auto" },
        async () => cur,
        () => ce,
      ),
    ).rejects.toThrow("today --source logs");
  });

  it("returns ce when requested", async () => {
    const cur = new CurAthenaSource({ executeQuery: vi.fn() }, config);
    const ce = new CeSource({ getCostAndUsage: vi.fn() }, config);
    const result = await resolveBillingSource(
      "ce",
      { curEngine: "auto" },
      async () => cur,
      () => ce,
    );
    expect(result.resolved).toBe("ce");
  });

  it("falls back to ce when auto and cur probe fails", async () => {
    const ce = new CeSource({ getCostAndUsage: vi.fn().mockResolvedValue([]) }, config);
    const result = await resolveBillingSource(
      "auto",
      { curEngine: "athena" },
      async () => {
        throw new Error("no cur");
      },
      () => ce,
    );
    expect(result.resolved).toBe("ce");
  });

  it("uses cur when auto and probe succeeds", async () => {
    const cur = new CurAthenaSource({ executeQuery: vi.fn() }, config);
    const ce = new CeSource({ getCostAndUsage: vi.fn() }, config);
    const result = await resolveBillingSource(
      "auto",
      { curEngine: "athena" },
      async () => cur,
      () => ce,
    );
    expect(result.resolved).toBe("cur");
  });

  it("throws when auto and both probes fail", async () => {
    const ce = new CeSource(
      {
        getCostAndUsage: vi.fn().mockRejectedValue(new Error("no ce")),
      },
      config,
    );
    await expect(
      resolveBillingSource(
        "auto",
        { curEngine: "athena" },
        async () => {
          throw new Error("no cur");
        },
        () => ce,
      ),
    ).rejects.toThrow("Could not use CUR");
  });
});

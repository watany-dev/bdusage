import { describe, expect, it } from "vitest";
import type { ReportMeta } from "../types/report.js";
import { renderJson } from "./json.js";

const meta: ReportMeta = {
  version: "bdusage v0.1.0",
  source: "cur",
  sourceLabel: "CUR 2.0 actual",
  profile: "default",
  region: "us-east-1",
  principal: { kind: "all" },
  principalDisplay: "(all principals — admin)",
  period: { since: "2026-06-01", until: "2026-06-02" },
  billingDataStatus: "unknown",
  billingDataLatest: null,
  currency: "USD",
};

describe("renderJson", () => {
  it("outputs parseable JSON", () => {
    const text = renderJson({ meta, rows: [{ date: "2026-06-01" }] });
    const parsed = JSON.parse(text) as { source_label: string; rows: unknown[] };
    expect(parsed.source_label).toBe("CUR 2.0 actual");
    expect(parsed.rows).toHaveLength(1);
  });
});

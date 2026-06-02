import { describe, expect, it } from "vitest";
import { addUsageAmount, classifyUsageType, emptyTokenTotals } from "./token-types.js";

describe("classifyUsageType", () => {
  it("classifies input and output tokens", () => {
    expect(classifyUsageType("USE1-Claude-3.5-Sonnet-Input-Tokens")).toBe("input");
    expect(classifyUsageType("USE1-Claude-3.5-Sonnet-Output-Tokens")).toBe("output");
  });

  it("classifies other usage types", () => {
    expect(classifyUsageType("USE1-Model-Requests")).toBe("other");
  });

  it("classifies cache read/write", () => {
    expect(classifyUsageType("USE1-Claude-Cache-Read-Tokens")).toBe("cache_read");
    expect(classifyUsageType("USE1-Claude-Cache-Write-Tokens")).toBe("cache_write");
  });
});

describe("addUsageAmount", () => {
  it("accumulates by token kind", () => {
    const totals = emptyTokenTotals();
    addUsageAmount(totals, "X-Input-Tokens", 100);
    addUsageAmount(totals, "X-Output-Tokens", 50);
    addUsageAmount(totals, "X-Cache-Read-Tokens", 10);
    addUsageAmount(totals, "X-Cache-Write-Tokens", 5);
    addUsageAmount(totals, "X-Requests", 1);
    expect(totals.input).toBe(100);
    expect(totals.output).toBe(50);
    expect(totals.cache_read).toBe(10);
    expect(totals.cache_write).toBe(5);
  });
});

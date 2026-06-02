import { describe, expect, it } from "vitest";
import { formatEstimateUsd, formatTokens, formatUsd } from "./format-numbers.js";

describe("format-numbers", () => {
  it("formats usd and estimate usd", () => {
    expect(formatUsd(1.2)).toBe("$1.20");
    expect(formatEstimateUsd(1.2)).toBe("~$1.20");
  });

  it("formats token suffixes", () => {
    expect(formatTokens(1500)).toBe("1.5k");
    expect(formatTokens(2_000_000)).toBe("2.0M");
  });
});

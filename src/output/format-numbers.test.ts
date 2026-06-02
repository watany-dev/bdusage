import { describe, expect, it } from "vitest";
import { formatTokens, formatUsd } from "./format-numbers.js";

describe("formatUsd", () => {
  it("formats dollars", () => {
    expect(formatUsd(1.2)).toBe("$1.20");
  });
});

describe("formatTokens", () => {
  it("uses k and M suffixes", () => {
    expect(formatTokens(1500)).toBe("1.5k");
    expect(formatTokens(2_000_000)).toBe("2.0M");
    expect(formatTokens(42)).toBe("42");
  });
});

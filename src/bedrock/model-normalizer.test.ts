import { describe, expect, it } from "vitest";
import { normalizeModelName } from "./model-normalizer.js";

describe("normalizeModelName", () => {
  it("normalizes Claude usage types", () => {
    expect(normalizeModelName("USE1-Claude-3.5-Sonnet-Input-Tokens")).toBe("Claude 3.5 Sonnet");
  });

  it("falls back to hyphen replacement", () => {
    expect(normalizeModelName("USE1-Custom-Model-Input-Tokens")).toBe("Custom Model");
  });

  it("returns the same result on repeated calls (memoized)", () => {
    const first = normalizeModelName("USE1-Claude-3-Haiku-Output-Tokens");
    const second = normalizeModelName("USE1-Claude-3-Haiku-Output-Tokens");
    expect(first).toBe("Claude 3 Haiku");
    expect(second).toBe(first);
  });
});

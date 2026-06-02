import { describe, expect, it } from "vitest";
import { normalizeModelId } from "./model-id-normalizer.js";

describe("normalizeModelId", () => {
  it("formats anthropic model ids", () => {
    expect(normalizeModelId("anthropic.claude-3-5-sonnet-20241022-v2:0")).toContain("Claude");
  });
});

import { describe, expect, it } from "vitest";
import { redactSensitiveFields } from "./redaction.js";

describe("redactSensitiveFields", () => {
  it("redacts arrays", () => {
    expect(redactSensitiveFields([{ inputBodyJson: { x: 1 } }])).toEqual([
      { inputBodyJson: "[redacted]" },
    ]);
  });

  it("redacts known body keys", () => {
    const result = redactSensitiveFields({
      modelId: "m",
      input: { inputBodyJson: { secret: true }, inputTokenCount: 1 },
    });
    expect(result).toEqual({
      modelId: "m",
      input: { inputBodyJson: "[redacted]", inputTokenCount: 1 },
    });
  });
});

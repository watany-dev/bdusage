import { describe, expect, it } from "vitest";
import { extractModelSegment } from "./usage-type-parser.js";

describe("extractModelSegment", () => {
  it("strips region and token suffix", () => {
    expect(extractModelSegment("USE1-Claude-3.5-Sonnet-Input-Tokens")).toBe("Claude-3.5-Sonnet");
  });
});

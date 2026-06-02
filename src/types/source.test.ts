import { describe, expect, it } from "vitest";
import { isSourceName, resolveSourceLabel } from "./source.js";

describe("source helpers", () => {
  it("resolves labels", () => {
    expect(resolveSourceLabel("cur")).toBe("CUR 2.0 actual");
    expect(resolveSourceLabel("ce")).toBe("Cost Explorer actual-lite");
  });

  it("validates sources", () => {
    expect(isSourceName("cur")).toBe(true);
    expect(isSourceName("ce")).toBe(true);
    expect(isSourceName("auto")).toBe(true);
    expect(isSourceName("logs")).toBe(false);
  });
});
